import { Request, Response, NextFunction } from 'express';
import {
  AdminAuditLogsQuery,
  AdminBookingsQuery,
  AdminFacilitiesQuery,
  AdminFacilityScheduleQuery,
  AdminMembersQuery,
  AdminPaymentsQuery,
  CreateAuthorityBlockInput,
  CreateFacilityInput,
  CreateFacilitySlotInput,
  DeleteSlotQuery,
  FinancialReportQuery,
  ToggleSlotBlockInput,
  UpdateFacilityInput,
  UpdateFacilitySlotInput,
  UpdateFacilityStatusInput,
  UpdateUserStatusInput,
} from './admin.schema';
import { AdminService } from './admin.service';

export class AdminController {
  /**
   * POST /api/admin/slots/block
   */
  static async createAuthorityBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as CreateAuthorityBlockInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await AdminService.createAuthorityBlock(req.user!, payload, ipAddress);

      res.status(201).json({
        success: true,
        message: 'Authority slot block created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/slots/block/:id
   */
  static async deactivateAuthorityBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await AdminService.deactivateAuthorityBlock(
        req.params.id,
        req.user!,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'Authority slot block deactivated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/status
   */
  static async updateUserStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as UpdateUserStatusInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await AdminService.updateUserAccountStatus(
        req.params.id,
        req.user!,
        payload,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: `User account status updated to '${payload.account_status}'.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/audit-logs
   */
  static async listAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminAuditLogsQuery;
      const result = await AdminService.listAuditLogs(query);

      if (result.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="kcp-audit-logs.csv"'
        );
        res.status(200).send(result.csv);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          summary: result.summary,
          pagination: result.pagination,
          audit_logs: result.audit_logs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/payments
   */
  static async listPayments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminPaymentsQuery;
      const result = await AdminService.listPayments(query);

      if (result.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="kcp-payments-ledger.csv"'
        );
        res.status(200).send(result.csv);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          summary: result.summary,
          facilities: result.facilities,
          payments: result.payments,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/reports/financial
   */
  static async getFinancialReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as FinancialReportQuery;
      const result = await AdminService.getFinancialReport(query);

      if (result.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="kcp-financial-report.csv"'
        );
        res.status(200).send(result.csv);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/dashboard-overview
   */
  static async getDashboardOverview(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AdminService.getDashboardOverview();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/bookings
   */
  static async listBookings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminBookingsQuery;
      const result = await AdminService.listBookings(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/members
   */
  static async listMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminMembersQuery;
      const result = await AdminService.listMembers(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/facilities
   */
  static async listFacilities(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminFacilitiesQuery;
      const result = await AdminService.listFacilitiesWithSlots(query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/facilities/:facilityId/schedule
   */
  static async getFacilitySchedule(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminFacilityScheduleQuery;
      const result = await AdminService.getFacilitySchedule(
        req.params.facilityId,
        query.date
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/facilities
   */
  static async createFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as CreateFacilityInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.createFacility(req.user!, payload, ipAddress);
      res.status(201).json({
        success: true,
        message: 'Sports facility created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/facilities/:id
   */
  static async updateFacility(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as UpdateFacilityInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.updateFacility(
        req.params.id,
        req.user!,
        payload,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: 'Facility details updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/facilities/:id/status
   */
  static async updateFacilityStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as UpdateFacilityStatusInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.updateFacilityStatus(
        req.params.id,
        req.user!,
        payload,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: `Facility operational status updated to '${payload.operational_status}'.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/facilities/:facilityId/slots
   */
  static async createFacilitySlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as CreateFacilitySlotInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.createFacilitySlot(
        req.params.facilityId,
        req.user!,
        payload,
        ipAddress
      );
      res.status(201).json({
        success: true,
        message: 'Facility time slot created successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/facilities/:facilityId/slots/:slotId
   */
  static async updateFacilitySlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as UpdateFacilitySlotInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.updateFacilitySlot(
        req.params.facilityId,
        req.params.slotId,
        req.user!,
        payload,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: 'Facility time slot updated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/facilities/:facilityId/slots/:slotId/block
   */
  static async toggleFacilitySlotBlock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as ToggleSlotBlockInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.toggleFacilitySlotBlock(
        req.params.facilityId,
        req.params.slotId,
        req.user!,
        payload,
        ipAddress
      );
      res.status(200).json({
        success: true,
        message: payload.blocked
          ? 'Time slot blocked successfully.'
          : 'Time slot unblocked and reopened.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/facilities/:facilityId/slots/:slotId
   */
  static async deleteFacilitySlot(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as DeleteSlotQuery;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await AdminService.deleteFacilitySlot(
        req.params.facilityId,
        req.params.slotId,
        req.user!,
        ipAddress,
        query.date
      );
      res.status(200).json({
        success: true,
        message: 'Facility time slot deleted successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
