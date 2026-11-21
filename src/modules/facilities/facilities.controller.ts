import { Request, Response, NextFunction } from 'express';
import { FacilitiesService } from './facilities.service';

export class FacilitiesController {
  /**
   * GET /api/facilities
   * Lists all facilities (core + admin-created) with operating hours, operational status,
   * daily user hour caps, partition rules, and active tariffs for the user's category.
   */
  static async listFacilities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const facilities = await FacilitiesService.listFacilities(req.user?.role);

      res.status(200).json({
        success: true,
        data: { facilities },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/facilities/:code/slots?date=YYYY-MM-DD
   * Member/public slot availability endpoint synchronized with live admin facility & slot controls.
   */
  static async getPublicSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code;
      const date = req.query.date as string;

      const result = await FacilitiesService.getPublicFacilitySlots(code, date);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/facilities/:code/slots?date=YYYY-MM-DD
   * Admin slot breakdown endpoint returning full details (AVAILABLE, BOOKED, AUTHORITY_BLOCKED)
   * with internal_reason, booking_code, and user full_name.
   */
  static async getAdminSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.params.code;
      const date = req.query.date as string;

      const result = await FacilitiesService.getAdminFacilitySlots(code, date);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
