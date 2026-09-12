const ACCESS_TOKEN_KEY = 'StudyGround-access-token';
const REFRESH_TOKEN_KEY = 'StudyGround-refresh-token';
const USER_KEY = 'StudyGround-user';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}
export function setAccessToken(token: string) {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}
export function setRefreshToken(token: string) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}
export function setUser(user: object) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser<T = any>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { localStorage.removeItem(USER_KEY); return null; }
}
export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}