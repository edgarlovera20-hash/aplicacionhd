const API_URL = '/api';

const STORAGE_KEY = 'hdreams_user';

const getUser = (): { uid?: string; email?: string; sessionToken?: string } => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

const setAccessToken = (token: string) => {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, sessionToken: token }));
  } catch { /* storage unavailable */ }
};

const authHeaders = (): Record<string, string> => {
  const u = getUser();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (u.sessionToken) h.Authorization = `Bearer ${u.sessionToken}`;
  return h;
};

/** Intenta renovar el access token via refresh cookie (httpOnly). */
let _refreshPromise: Promise<string | null> | null = null;
const attemptRefresh = (): Promise<string | null> => {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async r => {
      if (!r.ok) return null;
      const { sessionToken } = await r.json();
      setAccessToken(sessionToken);
      return sessionToken as string;
    })
    .catch(() => null)
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
};

/** Ejecuta fetch con reintentos transparentes en 401 → refresh → retry. */
const fetchWithAuth = async (input: string, init: RequestInit, retry = true): Promise<Response> => {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status === 401 && retry) {
    const newToken = await attemptRefresh();
    if (!newToken) {
      // Refresh falló → sesión realmente expirada
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event('hdreams:session-expired'));
      return res;
    }
    // Retry con nuevo token
    const newInit: RequestInit = {
      ...init,
      headers: { ...init.headers as Record<string, string>, Authorization: `Bearer ${newToken}` },
    };
    return fetchWithAuth(input, newInit, false);
  }
  return res;
};

export const api = {
  async get(path: string) {
    const res = await fetchWithAuth(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async post(path: string, body: unknown) {
    const res = await fetchWithAuth(`${API_URL}${path}`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try { errMsg = JSON.parse(errText).error || errText; } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  async patch(path: string, body: unknown) {
    const res = await fetchWithAuth(`${API_URL}${path}`, {
      method:  'PATCH',
      headers: authHeaders(),
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async del(path: string) {
    const res = await fetchWithAuth(`${API_URL}${path}`, {
      method:  'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
