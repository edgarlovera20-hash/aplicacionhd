import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  uid:   string;
  email: string;
  role:  string;
}

const accessSecret  = () => process.env.JWT_ACCESS_SECRET  ?? 'dev-access-secret-CHANGE-IN-PROD';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-CHANGE-IN-PROD';

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
