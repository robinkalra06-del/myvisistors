import jwt from 'jsonwebtoken';
import { TokenPayload } from '../types';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'pulsemeet-access-secret-super-secure-key-2025';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pulsemeet-refresh-secret-super-secure-key-2025';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES as any });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES as any });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};

/**
 * Generate a random Google Meet-style meeting code: abc-defg-hij
 */
export const generateMeetingCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const getRand = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${getRand(3)}-${getRand(4)}-${getRand(3)}`;
};
