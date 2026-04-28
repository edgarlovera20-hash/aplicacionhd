const API_URL = '/api';

/** Read the user record that login stores in localStorage */
const getUser = (): { uid?: string; email?: string; sessionToken?: string } => {
  try { return JSON.parse(localStorage.getItem('hdreams_user') || '{}'); }
  catch { return {}; }
};

const authHeaders = (): Record<string, string> => {
  const u = getUser();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (u.sessionToken) h.Authorization = `Bearer ${u.sessionToken}`;
  // Identidad para auditoria server-side cuando no hay token (rutas publicas).
  if (u.uid)   h['x-user-uid']   = u.uid;
  if (u.email) h['x-user-email'] = u.email;
  return h;
};

export const api = {
  async get(path: string) {
    const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(path: string, body: any) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try { errMsg = JSON.parse(errText).error || errText; } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },
  async patch(path: string, body: any) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async del(path: string) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
