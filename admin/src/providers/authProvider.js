import { API_URL, clearSession } from './httpClient';

const ADMIN_ROLES = ['admin', 'moderator'];

export const authProvider = {
  login: async ({ username, password }) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error?.message ?? 'Identifiants invalides');
    }

    // The API also serves mobile members — the back-office is staff only
    if (!ADMIN_ROLES.includes(data.data.user.role)) {
      throw new Error('Accès réservé aux administrateurs');
    }

    localStorage.setItem('lokl_token', data.data.token);
    localStorage.setItem('lokl_refresh', data.data.refresh_token);
    localStorage.setItem('lokl_user', JSON.stringify(data.data.user));
    // No redirectTo here on purpose: react-admin's useLogin uses a returned
    // redirectTo verbatim, with no basename prefix, unlike its own default
    // fallback (afterLoginUrl) which correctly resolves to /admin. Returning
    // '/' sent the browser to root — a path with no matching route — instead
    // of /admin, which produced a blank screen and a redirect loop.
    return {};
  },

  logout: async () => {
    clearSession();
    // Router-relative: BrowserRouter carries basename="/admin" and prepends
    // it to every navigation, so this lands on /admin/login. Returning
    // '/admin/login' here would double up to /admin/admin/login.
    return '/login';
  },

  checkAuth: async () => {
    const token = localStorage.getItem('lokl_token');
    if (!token) throw new Error('Not authenticated');
  },

  checkError: async (error) => {
    const status = error?.status ?? error?.response?.status;
    if (status === 401 || status === 403) {
      clearSession();
      throw new Error('Session expirée');
    }
  },

  getIdentity: async () => {
    const raw = localStorage.getItem('lokl_user');
    if (!raw) throw new Error('No user');
    const user = JSON.parse(raw);
    return {
      id: user.id,
      fullName: user.full_name,
      avatar: user.avatar_url ?? '',
    };
  },

  getPermissions: async () => {
    const raw = localStorage.getItem('lokl_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user.role;
  },
};
