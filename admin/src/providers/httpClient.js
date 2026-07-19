import { fetchUtils } from 'react-admin';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1';

export const clearSession = () => {
  localStorage.removeItem('lokl_token');
  localStorage.removeItem('lokl_refresh');
  localStorage.removeItem('lokl_user');
};

// Exchanges the stored refresh token for a new access/refresh pair.
// Returns false when there is nothing to refresh or the backend rejects it.
export const refreshTokens = async () => {
  const refreshToken = localStorage.getItem('lokl_refresh');
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return false;
    localStorage.setItem('lokl_token', data.data.token);
    localStorage.setItem('lokl_refresh', data.data.refresh_token);
    return true;
  } catch {
    return false;
  }
};

const authedFetch = (url, options = {}) => {
  const token = localStorage.getItem('lokl_token');
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetchUtils.fetchJson(url, { ...options, headers });
};

// All API calls go through here: on 401 (expired access token) it refreshes
// once and retries, so 15-minute access tokens stay invisible to the user.
export const httpClient = async (url, options = {}) => {
  try {
    return await authedFetch(url, options);
  } catch (error) {
    if (error?.status === 401 && (await refreshTokens())) {
      return authedFetch(url, options);
    }
    throw error;
  }
};
