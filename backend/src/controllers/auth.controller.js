import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/user.model.js';
import { ENV } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const BCRYPT_COST = 12;

const signAccessToken = (id, role) =>
  jwt.sign({ id, role }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });

const signRefreshToken = (id) =>
  jwt.sign({ id, type: 'refresh' }, ENV.JWT_REFRESH_SECRET, { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN });

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  avatar_url: user.avatar_url,
  is_premium: user.is_premium ?? false,
  premium_requested_at: user.premium_requested_at ?? null,
});

// Called right before issuing tokens on every login method (password,
// Google, Facebook, GitHub — but deliberately NOT on token refresh, since a
// silent background refresh isn't the user consciously reconnecting).
// Returns 'expired' if the 30-day window already lapsed (the daily purge
// job should have anonymized this account by now, but this is the fallback
// if it hasn't run yet); 'reactivated' if a pending deletion was cancelled;
// null otherwise.
const reactivateIfPending = async (user) => {
  if (!user.is_pending_deletion) return null;
  if (user.scheduled_purge_at && user.scheduled_purge_at <= new Date()) return 'expired';
  user.is_pending_deletion = false;
  user.deletion_reason = '';
  user.deletion_requested_at = undefined;
  user.scheduled_purge_at = undefined;
  await user.save();
  return 'reactivated';
};

// Shared tail end of every login method: cancels a pending deletion if the
// user is reconnecting within the grace window, blocks if it already
// expired, otherwise issues the normal token pair.
const respondWithSession = async (res, user) => {
  const deletionStatus = await reactivateIfPending(user);
  if (deletionStatus === 'expired') {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_DELETED', message: 'Ce compte a été supprimé' } });
    return;
  }
  res.json({
    success: true,
    data: {
      token: signAccessToken(user.id, user.role),
      refresh_token: signRefreshToken(user.id),
      user: publicUser(user),
      reactivated: deletionStatus === 'reactivated',
    },
  });
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  city_id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  lang: z.enum(['fr', 'ar', 'en']).optional(),
});

const validationError = (res, zodError) => {
  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: zodError.issues[0]?.message ?? 'Données invalides',
    },
  });
};

export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password_hash');

  // Always run bcrypt compare even if user not found (prevents timing oracle)
  const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000000';
  const isMatch = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!user || !isMatch) {
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants invalides' } });
    return;
  }

  // Ban check AFTER password verification — prevents account enumeration
  if (user.is_banned) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_BANNED', message: 'Ce compte a été suspendu' } });
    return;
  }

  await respondWithSession(res, user);
});

export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    validationError(res, parsed.error);
    return;
  }
  const { email, password, full_name, phone, city_id, lang } = parsed.data;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(409).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'Cet email est déjà utilisé' } });
    return;
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_COST);
  // Role is always 'member' on self-registration — never taken from the client
  const user = await User.create({
    email,
    full_name,
    password_hash,
    role: 'member',
    ...(phone ? { phone } : {}),
    ...(city_id ? { city_id } : {}),
    ...(lang ? { lang } : {}),
  });

  res.status(201).json({
    success: true,
    data: {
      token: signAccessToken(user.id, user.role),
      refresh_token: signRefreshToken(user.id),
      user: publicUser(user),
    },
  });
});

// Google Sign-In: the mobile app sends the Google ID token, we verify it with
// Google, then log the user in — creating a member account on first sign-in.
export const googleLogin = asyncHandler(async (req, res) => {
  const { id_token } = req.body ?? {};
  if (!id_token || typeof id_token !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_ID_TOKEN', message: 'Jeton Google requis' } });
    return;
  }
  if (!ENV.GOOGLE_CLIENT_ID) {
    res.status(503).json({ success: false, error: { code: 'GOOGLE_NOT_CONFIGURED', message: 'Connexion Google non configurée sur ce serveur' } });
    return;
  }

  let info;
  try {
    const gRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
    if (!gRes.ok) throw new Error(`tokeninfo ${gRes.status}`);
    info = await gRes.json();
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Jeton Google invalide' } });
    return;
  }

  // aud must match OUR client ID — otherwise any app's Google token would log in here
  const emailVerified = String(info.email_verified) === 'true';
  if (info.aud !== ENV.GOOGLE_CLIENT_ID || !info.email || !emailVerified) {
    res.status(401).json({ success: false, error: { code: 'INVALID_GOOGLE_TOKEN', message: 'Jeton Google invalide' } });
    return;
  }

  const email = info.email.toLowerCase();
  let user = await User.findOne({ email });

  if (user?.is_banned) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_BANNED', message: 'Ce compte a été suspendu' } });
    return;
  }

  if (!user) {
    user = await User.create({
      email,
      full_name: info.name || email.split('@')[0],
      avatar_url: info.picture ?? '',
      role: 'member',
      is_verified: true, // Google already verified the email
      // Random non-bcrypt hash: this account can never log in with a password
      password_hash: crypto.randomBytes(32).toString('hex'),
    });
  }

  await respondWithSession(res, user);
});

// Facebook Login: the mobile app sends the Facebook access token; we verify
// it against Meta (debug_token proves it was issued for OUR app), fetch the
// profile, then log the user in — creating a member account on first sign-in.
// Match order: facebook_id first (stable), then email (links an existing
// email/Google account the first time it signs in with Facebook).
export const facebookLogin = asyncHandler(async (req, res) => {
  const { access_token } = req.body ?? {};
  if (!access_token || typeof access_token !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_ACCESS_TOKEN', message: 'Jeton Facebook requis' } });
    return;
  }
  if (!ENV.FB_APP_ID || !ENV.FB_APP_SECRET) {
    res.status(503).json({ success: false, error: { code: 'FACEBOOK_NOT_CONFIGURED', message: 'Connexion Facebook non configurée sur ce serveur' } });
    return;
  }

  let profile;
  try {
    const appToken = `${ENV.FB_APP_ID}|${ENV.FB_APP_SECRET}`;
    const dbgRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(access_token)}&access_token=${encodeURIComponent(appToken)}`,
    );
    if (!dbgRes.ok) throw new Error(`debug_token ${dbgRes.status}`);
    const dbg = (await dbgRes.json()).data;
    if (!dbg?.is_valid || String(dbg.app_id) !== String(ENV.FB_APP_ID)) throw new Error('token not ours');

    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(400)&access_token=${encodeURIComponent(access_token)}`,
    );
    if (!meRes.ok) throw new Error(`me ${meRes.status}`);
    profile = await meRes.json();
    if (!profile?.id) throw new Error('no profile id');
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_FACEBOOK_TOKEN', message: 'Jeton Facebook invalide' } });
    return;
  }

  const email = profile.email?.toLowerCase();
  let user = await User.findOne({ facebook_id: profile.id });
  if (!user && email) user = await User.findOne({ email });

  if (user?.is_banned) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_BANNED', message: 'Ce compte a été suspendu' } });
    return;
  }

  if (!user) {
    user = await User.create({
      // Facebook accounts registered by phone have no shareable email — a
      // synthetic address keeps the unique-email invariant without leaking
      // into mail flows (nothing is ever sent to *.facebook.lokl.ma).
      email: email ?? `fb${profile.id}@facebook.lokl.ma`,
      full_name: profile.name || 'Membre Facebook',
      avatar_url: profile.picture?.data?.url ?? '',
      role: 'member',
      is_verified: Boolean(email), // Facebook verified it if it shared one
      facebook_id: profile.id,
      // Random non-bcrypt hash: this account can never log in with a password
      password_hash: crypto.randomBytes(32).toString('hex'),
    });
  } else if (!user.facebook_id) {
    user.facebook_id = profile.id;
    await user.save();
  }

  await respondWithSession(res, user);
});

// GitHub OAuth: the mobile app opens GitHub's authorize page in the system
// browser and gets a one-time "code" back via the ma.lokl.lokl://github-auth
// redirect. That code is exchanged here for an access token — this step
// needs the client secret, so it can only happen server-side, never in the
// app. Match order mirrors Facebook: github_id first, then email (GitHub
// hides email by default, so a dedicated /user/emails call is needed).
export const githubLogin = asyncHandler(async (req, res) => {
  const { code } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_CODE', message: 'Code GitHub requis' } });
    return;
  }
  if (!ENV.GITHUB_CLIENT_ID || !ENV.GITHUB_CLIENT_SECRET) {
    res.status(503).json({ success: false, error: { code: 'GITHUB_NOT_CONFIGURED', message: 'Connexion GitHub non configurée sur ce serveur' } });
    return;
  }

  let accessToken;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: ENV.GITHUB_CLIENT_ID,
        client_secret: ENV.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: 'ma.lokl.lokl://github-auth',
      }),
    });
    if (!tokenRes.ok) throw new Error(`access_token ${tokenRes.status}`);
    const tokenJson = await tokenRes.json();
    accessToken = tokenJson.access_token;
    if (!accessToken) throw new Error(tokenJson.error ?? 'no access_token');
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_GITHUB_CODE', message: 'Code GitHub invalide' } });
    return;
  }

  let profile;
  let email;
  try {
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' };
    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/emails', { headers }),
    ]);
    if (!userRes.ok) throw new Error(`user ${userRes.status}`);
    profile = await userRes.json();
    if (!profile?.id) throw new Error('no profile id');

    // Public email on the profile is usually null — GitHub keeps addresses
    // private by default, so the dedicated emails endpoint is the real source.
    if (emailsRes.ok) {
      const emails = await emailsRes.json();
      email = emails.find((e) => e.primary && e.verified)?.email?.toLowerCase();
    }
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_GITHUB_TOKEN', message: 'Jeton GitHub invalide' } });
    return;
  }

  let user = await User.findOne({ github_id: String(profile.id) });
  if (!user && email) user = await User.findOne({ email });

  if (user?.is_banned) {
    res.status(403).json({ success: false, error: { code: 'ACCOUNT_BANNED', message: 'Ce compte a été suspendu' } });
    return;
  }

  if (!user) {
    user = await User.create({
      // GitHub accounts with no public/verified email get a synthetic one,
      // same treatment as phone-only Facebook signups.
      email: email ?? `gh${profile.id}@github.lokl.ma`,
      full_name: profile.name || profile.login || 'Membre GitHub',
      avatar_url: profile.avatar_url ?? '',
      role: 'member',
      is_verified: Boolean(email),
      github_id: String(profile.id),
      password_hash: crypto.randomBytes(32).toString('hex'),
    });
  } else if (!user.github_id) {
    user.github_id = String(profile.id);
    await user.save();
  }

  await respondWithSession(res, user);
});

// Meta-required data deletion callback: Facebook POSTs a signed_request when
// a user asks Facebook to delete their data from Lokl. We verify Meta's HMAC
// signature, anonymize the matching account (same treatment as the in-app
// CNDP self-deletion), and answer with the tracking URL + code Meta expects.
export const facebookDataDeletion = asyncHandler(async (req, res) => {
  const signedRequest = req.body?.signed_request;
  if (!signedRequest || typeof signedRequest !== 'string' || !ENV.FB_APP_SECRET) {
    res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Requête invalide' } });
    return;
  }

  const [encodedSig, encodedPayload] = signedRequest.split('.', 2);
  let payload;
  try {
    const expected = crypto
      .createHmac('sha256', ENV.FB_APP_SECRET)
      .update(encodedPayload)
      .digest('base64url');
    const given = Buffer.from(encodedSig, 'base64url');
    if (!crypto.timingSafeEqual(given, Buffer.from(expected, 'base64url'))) throw new Error('bad signature');
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Signature invalide' } });
    return;
  }

  const confirmationCode = crypto.randomBytes(8).toString('hex');
  const user = payload?.user_id ? await User.findOne({ facebook_id: String(payload.user_id) }) : null;
  if (user) {
    user.email = `deleted-${user.id}@deleted.lokl.ma`;
    user.full_name = 'Compte supprimé';
    user.phone = '';
    user.avatar_url = '';
    user.bio_fr = '';
    user.bio_ar = '';
    user.interests = [];
    user.facebook_id = undefined;
    user.is_banned = true;
    user.password_hash = crypto.randomBytes(32).toString('hex');
    await user.save();
  }

  // Meta's expected response shape (raw, not our envelope)
  res.json({
    url: `https://lokl-roan.vercel.app/privacy.html?deletion=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body ?? {};
  if (!refresh_token || typeof refresh_token !== 'string') {
    res.status(400).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token requis' } });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(refresh_token, ENV.JWT_REFRESH_SECRET);
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalide ou expiré' } });
    return;
  }
  if (payload.type !== 'refresh') {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalide ou expiré' } });
    return;
  }

  // Re-check the account at refresh time: role changes and bans take effect
  // here. A pending deletion also fails the refresh on purpose — a silent
  // background renewal isn't the user consciously reconnecting, so it must
  // NOT cancel the deletion; they're forced back to a real login screen,
  // where respondWithSession() can register a genuine reconnection.
  const user = await User.findById(payload.id);
  if (!user || user.is_banned || user.is_pending_deletion) {
    res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token invalide ou expiré' } });
    return;
  }

  res.json({
    success: true,
    data: {
      token: signAccessToken(user.id, user.role),
      refresh_token: signRefreshToken(user.id),
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.adminId);
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable' } });
    return;
  }
  res.json({ success: true, data: user });
});
