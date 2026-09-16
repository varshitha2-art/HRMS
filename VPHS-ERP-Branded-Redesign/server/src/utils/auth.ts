import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const SALT = 'vphs_salt_2026';

export function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}

export function comparePassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  return computed === hash;
}

export interface JwtPayload {
  userId: string;
  username: string;
  employeeId?: string | null;
  role: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
