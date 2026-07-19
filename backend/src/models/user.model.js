import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    full_name: { type: String, required: true, trim: true },
    avatar_url: { type: String, default: '' },
    bio_fr: { type: String, default: '' },
    bio_ar: { type: String, default: '' },
    city_id: { type: Schema.Types.ObjectId, ref: 'City' },
    lang: { type: String, enum: ['fr', 'ar', 'en'], default: 'fr' },
    role: { type: String, enum: ['member', 'organizer', 'moderator', 'admin'], default: 'member' },
    // Granted/revoked by admins only (no payment gateway yet) — unlocks
    // attendee lists, private messages, and event promotion.
    is_premium: { type: Boolean, default: false },
    // Self-service "Request Premium" (no payment gateway): timestamp of the
    // last request, used both to notify staff once and to cool down repeat
    // requests until an admin has had a chance to review it.
    premium_requested_at: { type: Date },
    is_verified: { type: Boolean, default: false },
    is_banned: { type: Boolean, default: false },
    // Self-service deletion goes through a 30-day grace period rather than
    // an instant wipe: the account is suspended (login still works — that's
    // how the user cancels it) and only truly anonymized by the daily purge
    // job once scheduled_purge_at has passed with no reconnection.
    is_pending_deletion: { type: Boolean, default: false },
    deletion_reason: { type: String, default: '' },
    deletion_requested_at: { type: Date },
    scheduled_purge_at: { type: Date },
    is_organizer_verified: { type: Boolean, default: false },
    password_hash: { type: String, required: true, select: false },
    interests: [{ type: String }],
    // Facebook Login identity: lets an account created via Facebook be found
    // again even when Facebook doesn't share an email (phone-number signups).
    facebook_id: { type: String, index: { unique: true, sparse: true } },
    // GitHub OAuth identity — same pattern as facebook_id
    github_id: { type: String, index: { unique: true, sparse: true } },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

UserSchema.index({ role: 1 });
UserSchema.index({ city_id: 1 });

export const User = mongoose.model('User', UserSchema);
