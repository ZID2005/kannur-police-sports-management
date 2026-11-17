import { Request, Response, NextFunction } from 'express';
import {
  AdminAuditLogsQuery,
  AdminGateLogsQuery,
  CreateAuthorityBlockInput,
  FinancialReportQuery,
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
   * GET /api/admin/gate-logs
   */
  static async listGateLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as AdminGateLogsQuery;
      const result = await AdminService.listGateLogs(query);

      res.status(200).json({
        success: true,
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
          pagination: result.pagination,
          audit_logs: result.audit_logs,
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
}
