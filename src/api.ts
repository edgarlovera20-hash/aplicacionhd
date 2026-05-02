const API_URL = '/api';

const STORAGE_KEY = 'hdreams_user';

// ── SEGURIDAD: Access token SOLO en memoria ────────────────────────────────
// El sessionToken ya NO se guarda en localStorage (vulnerable a XSS).
// Solo se mantiene en esta variable de módulo. Al recargar la página,
// se renueva automáticamente vía /api/auth/refresh (cookie httpOnly).
let _accessToken: string | null = null;

/** Obtiene datos del usuario de localStorage (sin el token sensible). */
const getUser = (): { uid?: string; email?: string } => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

/** Actualiza el access token en memoria (NO en localStorage). */
export const setAccessToken = (token: string) => {
  _accessToken = token;
};

/** Limpia el access token de memoria. */
export const clearAccessToken = () => {
  _accessToken = null;
};

/** Devuelve el access token actual (solo en memoria). */
export const getAccessToken = (): string | null => _accessToken;

const authHeaders = (): Record<string, string> => {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_accessToken) h.Authorization = `Bearer ${_accessToken}`;
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
      _accessToken = null;
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
