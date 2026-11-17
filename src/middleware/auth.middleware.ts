import { Request, Response, NextFunction } from 'express';
import { AccountStatus, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { clearSessionCookie, verifySessionToken } from '../utils/jwt';

/**
 * Extracts the JWT session token from the HTTP-Only cookie (primary)
 * or Authorization Bearer header (secondary fallback for internal tools).
 */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (cookieToken && typeof cookieToken === 'string') {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Middleware: Authenticates the incoming request via HTTP-only JWT cookie
 * and re-verifies the live database account status (`ACTIVE`, `SUSPENDED`, `BANNED`).
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError(
        'Authentication required. Please log in with your username and password.',
        401,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const payload = verifySessionToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        role: true,
        account_status: true,
        ban_reason: true,
        profile_photo_url: true,
      },
    });

    if (!user) {
      clearSessionCookie(res);
      throw new AppError(
        'User account associated with this session no longer exists.',
        401,
        'USER_NOT_FOUND'
      );
    }

    if (user.account_status === AccountStatus.BANNED) {
      clearSessionCookie(res);
      const reasonSuffix = user.ban_reason ? ` Reason: ${user.ban_reason}` : '';
      throw new AppError(
        `Access denied. Your account has been permanently BANNED by the Kannur City Police Sports Administration.${reasonSuffix}`,
        403,
        'ACCOUNT_BANNED'
      );
    }

    if (user.account_status === AccountStatus.SUSPENDED) {
      clearSessionCookie(res);
      const reasonSuffix = user.ban_reason ? ` Reason: ${user.ban_reason}` : '';
      throw new AppError(
        `Access denied. Your account is currently SUSPENDED.${reasonSuffix}`,
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    req.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      account_status: user.account_status,
      profile_photo_url: user.profile_photo_url,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Optionally authenticates the incoming request if a session cookie or Bearer token
 * is present. If no token is provided, continues as an unauthenticated public viewer.
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    return next();
  }
  return authenticate(req, res, next);
}

/**
 * Middleware Factory: Restricts endpoint access to specific UserRole(s).
 * Must be placed after `authenticate`.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required before verifying role permissions.',
          401,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: role '${req.user.role}' is not authorized for this resource. Required role(s): ${allowedRoles.join(', ')}.`,
          403,
          'INSUFFICIENT_ROLE_PERMISSIONS'
        )
      );
    }

    next();
  };
}
