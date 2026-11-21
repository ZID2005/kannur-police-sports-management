import { Request, Response, NextFunction } from 'express';
import {
  AdminPaymentFilterQuery,
  OfficeReceiptInput,
  SettlePaymentInput,
} from './payments.schema';
import { PaymentsService } from './payments.service';

export class PaymentsController {
  /**
   * POST /api/payments/settle
   */
  static async settleOnlinePayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as SettlePaymentInput;
      const result = await PaymentsService.settleOnlinePayment(req.user!, payload);

      res.status(201).json({
        success: true,
        message: 'Payment settled and booking confirmation receipt generated successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/my
   */
  static async getMyPayments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await PaymentsService.getMyPayments(req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/payments/office-receipt
   */
  static async recordOfficeReceipt(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as OfficeReceiptInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await PaymentsService.recordOfficeReceipt(
        req.user!,
        payload,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Office receipt recorded and settlement confirmed successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/payments
   */
  static async listAdminPayments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = req.query as unknown as AdminPaymentFilterQuery;
      const result = await PaymentsService.listAdminPayments(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
