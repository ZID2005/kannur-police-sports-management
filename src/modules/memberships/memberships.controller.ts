import { Request, Response, NextFunction } from 'express';
import {
  AdminMembershipFilterQuery,
  ApplyMembershipInput,
  ReviewMembershipInput,
} from './memberships.schema';
import { MembershipsService } from './memberships.service';

export class MembershipsController {
  /**
   * POST /api/memberships/apply
   */
  static async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ApplyMembershipInput;
      const result = await MembershipsService.applyForMembership(req.user!, payload);

      res.status(201).json({
        success: true,
        message:
          'Synthetic Track membership application submitted. Payment remains locked until officer verification.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/memberships/my
   */
  static async getMyMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await MembershipsService.getMyMemberships(req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/memberships
   */
  static async listAdminMemberships(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = req.query as unknown as AdminMembershipFilterQuery;
      const result = await MembershipsService.listAdminMemberships(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/memberships/:id
   */
  static async getAdminMembershipById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await MembershipsService.getAdminMembershipById(req.params.id);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/memberships/:id/review
   */
  static async reviewMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ReviewMembershipInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await MembershipsService.reviewMembership(
        req.params.id,
        req.user!,
        payload,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `Membership review action '${payload.action}' recorded successfully.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
