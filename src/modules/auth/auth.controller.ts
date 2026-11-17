import { Request, Response, NextFunction } from 'express';
import { clearSessionCookie, setSessionCookie } from '../../utils/jwt';
import { AuthService } from './auth.service';
import { LoginInput, RegisterInput } from './auth.schema';

export class AuthController {
  /**
   * POST /api/auth/register
   * Public & Govt Personnel self-registration (username + password, no mobile/OTP/Aadhaar).
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as RegisterInput;
      const { user, token } = await AuthService.register(payload);

      setSessionCookie(res, token);

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Standard username & password login; blocks BANNED and SUSPENDED users.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as LoginInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const { user, token } = await AuthService.login(payload, ipAddress);

      setSessionCookie(res, token);

      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Clears the HTTP-only session cookie.
   */
  static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      clearSessionCookie(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully. Session cookie cleared.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user profile.
   */
  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}
