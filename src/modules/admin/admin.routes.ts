import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../middleware/validate.middleware';
import { FacilitiesController } from '../facilities/facilities.controller';
import {
  facilityCodeParamSchema,
  facilitySlotsQuerySchema,
} from '../facilities/facilities.schema';
import { MembershipsController } from '../memberships/memberships.controller';
import {
  adminMembershipFilterSchema,
  membershipIdParamSchema,
  reviewMembershipSchema,
} from '../memberships/memberships.schema';
import { PaymentsController } from '../payments/payments.controller';
import {
  adminPaymentFilterSchema,
  officeReceiptSchema,
} from '../payments/payments.schema';
import { AdminController } from './admin.controller';
import {
  adminAuditLogsQuerySchema,
  adminGateLogsQuerySchema,
  blockIdParamSchema,
  createAuthorityBlockSchema,
  financialReportQuerySchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './admin.schema';

const adminRouter = Router();

// 0. Gate Telemetry Logs (`STAFF_ADMIN` or `GATE_OFFICER`)
adminRouter.get(
  '/gate-logs',
  authenticate,
  requireRole(UserRole.STAFF_ADMIN, UserRole.GATE_OFFICER),
  validateQuery(adminGateLogsQuerySchema),
  AdminController.listGateLogs
);

// All remaining /api/admin/* endpoints strictly require STAFF_ADMIN authentication
adminRouter.use(authenticate, requireRole(UserRole.STAFF_ADMIN));

// 1. Synthetic Track Membership Dossier Queue & Officer Review
adminRouter.get(
  '/memberships',
  validateQuery(adminMembershipFilterSchema),
  MembershipsController.listAdminMemberships
);

adminRouter.get(
  '/memberships/:id',
  validateParams(membershipIdParamSchema),
  MembershipsController.getAdminMembershipById
);

adminRouter.post(
  '/memberships/:id/review',
  validateParams(membershipIdParamSchema),
  validateBody(reviewMembershipSchema),
  MembershipsController.reviewMembership
);

// 2. Unmasked Facility Slots View (shows BOOKED vs AUTHORITY_BLOCKED + internal_reason)
adminRouter.get(
  '/facilities/:code/slots',
  validateParams(facilityCodeParamSchema),
  validateQuery(facilitySlotsQuerySchema),
  FacilitiesController.getAdminSlots
);

// 3. Authority Slot Blocking & Deactivation
adminRouter.post(
  '/slots/block',
  validateBody(createAuthorityBlockSchema),
  AdminController.createAuthorityBlock
);

adminRouter.delete(
  '/slots/block/:id',
  validateParams(blockIdParamSchema),
  AdminController.deactivateAuthorityBlock
);

// 4. User Account Moderation (ACTIVE | SUSPENDED | BANNED)
adminRouter.patch(
  '/users/:id/status',
  validateParams(userIdParamSchema),
  validateBody(updateUserStatusSchema),
  AdminController.updateUserStatus
);

// 5. Step 3: Admin Payment Ledger & Offline Office Receipts (`STAFF_ADMIN` only)
adminRouter.get(
  '/payments',
  validateQuery(adminPaymentFilterSchema),
  PaymentsController.listAdminPayments
);

adminRouter.post(
  '/payments/office-receipt',
  validateBody(officeReceiptSchema),
  PaymentsController.recordOfficeReceipt
);

// 6. Step 3: Immutable Audit Logs Ledger & Financial Revenue Reporting (`STAFF_ADMIN` only)
adminRouter.get(
  '/audit-logs',
  validateQuery(adminAuditLogsQuerySchema),
  AdminController.listAuditLogs
);

adminRouter.get(
  '/reports/financial',
  validateQuery(financialReportQuerySchema),
  AdminController.getFinancialReport
);

export default adminRouter;
