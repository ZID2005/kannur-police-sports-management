import { Request, Response, NextFunction } from 'express';
import { CancelBookingInput, ReserveSlotInput } from './bookings.schema';
import { BookingsService } from './bookings.service';

export class BookingsController {
  /**
   * POST /api/bookings/reserve
   */
  static async reserve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.body as ReserveSlotInput;
      const result = await BookingsService.reserveSlot(req.user!, payload);

      res.status(201).json({
        success: true,
        message: 'Slot reserved in PENDING_PAYMENT status.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bookings/my
   */
  static async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await BookingsService.getMyBookings(req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bookings/:id/cancel
   */
  static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = (req.body ?? {}) as CancelBookingInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await BookingsService.cancelBooking(
        req.params.id,
        req.user!,
        payload,
        ipAddress
      );

      res.status(200).json({
        success: true,
        message: 'Slot booking cancelled successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
