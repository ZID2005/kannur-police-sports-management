import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { PaymentsController } from './payments.controller';
import { settlePaymentSchema } from './payments.schema';

const paymentsRouter = Router();

paymentsRouter.use(authenticate);

// 1. Settle an eligible MEMBERSHIP (APPROVED_UNPAID) or SLOT_BOOKING (PENDING_PAYMENT) via ONLINE_GATEWAY
paymentsRouter.post(
  '/settle',
  validateBody(settlePaymentSchema),
  PaymentsController.settleOnlinePayment
);

// 2. View authenticated user's payment receipts & pricing breakdowns
paymentsRouter.get('/my', PaymentsController.getMyPayments);

export default paymentsRouter;
