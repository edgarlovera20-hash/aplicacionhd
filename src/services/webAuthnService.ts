/**
 * webAuthnService.ts
 * Servicio frontend para autenticación biométrica vía WebAuthn API.
 * Compatible con Chrome (Android), Safari (iOS/macOS), Edge (Windows Hello).
 * No requiere ningún paquete npm.
 */

const API = '/api/webauthn';

/* ─────────────────────────────────────────────
   Helpers de codificación base64url ↔ ArrayBuffer
───────────────────────────────────────────── */
export const bufToB64url = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let str = '';
  bytes.forEach(b => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const b64urlToBuf = (str: string): ArrayBuffer => {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/* ─────────────────────────────────────────────
   Detección de soporte
───────────────────────────────────────────── */
export const checkBiometricSupport = async (): Promise<{
  supported: boolean;
  platform: boolean;
  type: string;
}> => {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, platform: false, type: 'none' };
  }
  try {
    const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    let type = 'security-key';
    if (platform) {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) type = 'Touch ID / Face ID';
      else if (/android/.test(ua)) type = 'Huella digital';
      else if (/win/.test(ua)) type = 'Windows Hello';
      else if (/mac/.test(ua)) type = 'Touch ID';
      else type = 'Biometría del dispositivo';
    }
    return { supported: true, platform, type };
  } catch {
    return { supported: false, platform: false, type: 'none' };
  }
};

/* ─────────────────────────────────────────────
   Verificar si el usuario ya tiene huella registrada
───────────────────────────────────────────── */
export const checkRegistered = async (email: string): Promise<boolean> => {
  try {
    const r = await fetch(`${API}/check?email=${encodeURIComponent(email)}`);
    const d = await r.json() as { registered: boolean };
    return d.registered;
  } catch {
    return false;
  }
};

/* ─────────────────────────────────────────────
   REGISTRO: vincular huella al usuario
───────────────────────────────────────────── */
export const registerBiometric = async (
  email: string,
  userId: string,
  displayName: string
): Promise<{ ok: boolean; error?: string }> => {
  try {
    // 1. Pedir challenge al servidor
    const r1 = await fetch(`${API}/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId, displayName }),
    });
    if (!r1.ok) return { ok: false, error: 'Error solicitando el registro' };
    const opts = await r1.json() as PublicKeyCredentialCreationOptions & {
      challenge: string;
      user: { id: string };
    };

    // 2. Convertir strings base64url → ArrayBuffer
    const publicKey: PublicKeyCredentialCreationOptions = {
      ...opts,
      challenge: b64urlToBuf(opts.challenge as unknown as string),
      user: {
        ...opts.user,
        id: b64urlToBuf(opts.user.id as unknown as string),
      },
      excludeCredentials: (opts.excludeCredentials || []).map((c: any) => ({
        ...c,
        id: b64urlToBuf(c.id),
      })),
    };

    // 3. Invocar biometría del dispositivo (genera clave pública)
    const cred = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (!cred) return { ok: false, error: 'No se pudo crear la credencial' };

    const response = cred.response as AuthenticatorAttestationResponse;

    // 4. Enviar credencial al servidor
    const payload = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId),
      type: cred.type,
      response: {
        attestationObject: bufToB64url(response.attestationObject),
        clientDataJSON:    bufToB64url(response.clientDataJSON),
      },
    };

    const r2 = await fetch(`${API}/register-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, email }),
    });

    if (!r2.ok) {
      const err = await r2.json() as { error?: string };
      return { ok: false, error: err.error || 'Error en el registro del servidor' };
    }

    // Guardar en localStorage que este email tiene huella registrada
    const stored = JSON.parse(localStorage.getItem('wa_registered') || '[]') as string[];
    if (!stored.includes(email)) { stored.push(email); localStorage.setItem('wa_registered', JSON.stringify(stored)); }

    return { ok: true };
  } catch (e: any) {
    if (e.name === 'NotAllowedError')  return { ok: false, error: 'Acceso biométrico denegado por el usuario' };
    if (e.name === 'InvalidStateError') return { ok: false, error: 'Este dispositivo ya tiene una huella registrada' };
    return { ok: false, error: e.message || 'Error desconocido al registrar biometría' };
  }
};

/* ─────────────────────────────────────────────
   AUTENTICACIÓN: iniciar sesión con huella
───────────────────────────────────────────── */
export const authenticateWithBiometric = async (
  email: string
): Promise<{ ok: boolean; user?: any; error?: string }> => {
  try {
    // 1. Pedir challenge y lista de credenciales del usuario
    const r1 = await fetch(`${API}/login-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!r1.ok) {
      const err = await r1.json() as { error?: string };
      return { ok: false, error: err.error || 'Usuario no encontrado o sin huella registrada' };
    }
    const opts = await r1.json() as any;

    // 2. Convertir strings base64url → ArrayBuffer
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: b64urlToBuf(opts.challenge),
      rpId:      opts.rpId || window.location.hostname,
      timeout:   opts.timeout || 60000,
      userVerification: 'preferred',
      allowCredentials: (opts.allowCredentials || []).map((c: any) => ({
        id:         b64urlToBuf(c.id),
        type:       c.type,
        transports: c.transports,
      })),
    };

    // 3. Invocar biometría del dispositivo
    const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
    if (!assertion) return { ok: false, error: 'No se completó la autenticación' };

    const response = assertion.response as AuthenticatorAssertionResponse;

    // 4. Enviar al servidor para verificación
    const payload = {
      id:    assertion.id,
      rawId: bufToB64url(assertion.rawId),
      type:  assertion.type,
      email,
      response: {
        authenticatorData: bufToB64url(response.authenticatorData),
        clientDataJSON:    bufToB64url(response.clientDataJSON),
        signature:         bufToB64url(response.signature),
        userHandle:        response.userHandle ? bufToB64url(response.userHandle) : null,
      },
    };

    const r2 = await fetch(`${API}/login-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r2.ok) {
      const err = await r2.json() as { error?: string };
      return { ok: false, error: err.error || 'La verificación biométrica falló' };
    }

    const data = await r2.json() as { user: any };
    return { ok: true, user: data.user };
  } catch (e: any) {
    if (e.name === 'NotAllowedError')    return { ok: false, error: 'Autenticación denegada por el usuario o tiempo agotado' };
    if (e.name === 'SecurityError')      return { ok: false, error: 'Error de seguridad: verifica que estés en HTTPS' };
    if (e.name === 'AbortError')         return { ok: false, error: 'Autenticación cancelada' };
    return { ok: false, error: e.message || 'Error al autenticar con huella' };
  }
};

/* ─────────────────────────────────────────────
   Limpiar huella local (no borra del servidor)
───────────────────────────────────────────── */
export const clearLocalBiometric = (email: string): void => {
  try {
    const stored = JSON.parse(localStorage.getItem('wa_registered') || '[]') as string[];
    localStorage.setItem('wa_registered', JSON.stringify(stored.filter(e => e !== email)));
  } catch { /* storage unavailable or corrupt */ }
};

/* ─────────────────────────────────────────────
   Check rápido local (sin llamada al servidor)
───────────────────────────────────────────── */
export const isLocallyRegistered = (email: string): boolean => {
  try {
    const stored = JSON.parse(localStorage.getItem('wa_registered') || '[]') as string[];
    return stored.includes(email);
  } catch { return false; }
};
