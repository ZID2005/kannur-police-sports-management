import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './AppError';

export interface JwtSessionPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Signs a session JWT for an authenticated user.
 */
export function signSessionToken(payload: {
  id: string;
  username: string;
  role: UserRole;
}): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'kcp-sports-onprem',
    audience: 'kcp-web-portal',
  };

  return jwt.sign(
    {
      sub: payload.id,
      username: payload.username,
      role: payload.role,
    },
    env.JWT_SECRET,
    options
  );
}

/**
 * Verifies a session JWT and returns its decoded payload.
 */
export function verifySessionToken(token: string): JwtSessionPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      issuer: 'kcp-sports-onprem',
      audience: 'kcp-web-portal',
    }) as JwtSessionPayload;
  } catch {
    throw new AppError(
      'Invalid or expired authentication session. Please log in again.',
      401,
      'INVALID_SESSION_TOKEN'
    );
  }
}

/**
 * Attaches an HTTP-only, SameSite=Strict session cookie to the response.
 */
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  });
}

/**
 * Clears the HTTP-only session cookie on logout or session invalidation.
 */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: 'strict',
    path: '/',
  });
}
