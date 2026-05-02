import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  uid:   string;
  email: string;
  role:  string;
}

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * SEGURIDAD: en producción, los JWT secrets DEBEN estar definidos.
 * Si no lo están, lanzamos error fatal en lugar de usar un fallback público
 * que permitiría a cualquier atacante forjar tokens.
 * En desarrollo se permite un fallback para facilitar el onboarding.
 */
const accessSecret = (): string => {
  const s = process.env.JWT_ACCESS_SECRET;
  if (!s && IS_PROD) throw new Error('[FATAL] JWT_ACCESS_SECRET no definido — no se puede firmar tokens en producción.');
  return s || 'dev-access-secret-NOT-FOR-PROD';
};

const refreshSecret = (): string => {
  const s = process.env.JWT_REFRESH_SECRET;
  if (!s && IS_PROD) throw new Error('[FATAL] JWT_REFRESH_SECRET no definido — no se puede firmar tokens en producción.');
  return s || 'dev-refresh-secret-NOT-FOR-PROD';
};

export const signAccessToken = (p: TokenPayload): string =>
  jwt.sign(p, accessSecret(), { expiresIn: '15m' });

export const signRefreshToken = (p: TokenPayload): string =>
  jwt.sign(p, refreshSecret(), { expiresIn: '7d' });

export const verifyAccessToken = (token: string): TokenPayload | null => {
  try   { return jwt.verify(token, accessSecret())  as TokenPayload; }
  catch { return null; }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try   { return jwt.verify(token, refreshSecret()) as TokenPayload; }
  catch { return null; }
};

/** SHA-256 hash del refresh token para almacenarlo en DB sin exponer el valor real */
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
