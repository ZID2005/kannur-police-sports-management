import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate.middleware';
import { BookingsController } from './bookings.controller';
import {
  bookingIdParamSchema,
  cancelBookingSchema,
  reserveSlotSchema,
} from './bookings.schema';

const bookingsRouter = Router();

bookingsRouter.post(
  '/reserve',
  authenticate,
  validateBody(reserveSlotSchema),
  BookingsController.reserve
);

bookingsRouter.get('/my', authenticate, BookingsController.getMyBookings);

bookingsRouter.post(
  '/:id/cancel',
  authenticate,
  validateParams(bookingIdParamSchema),
  validateBody(cancelBookingSchema),
  BookingsController.cancel
);

export default bookingsRouter;
