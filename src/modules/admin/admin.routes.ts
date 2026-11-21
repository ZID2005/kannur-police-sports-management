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
import { officeReceiptSchema } from '../payments/payments.schema';
import { AdminController } from './admin.controller';
import {
  adminAuditLogsQuerySchema,
  adminBookingsQuerySchema,
  adminFacilitiesQuerySchema,
  adminFacilityScheduleQuerySchema,
  adminMembersQuerySchema,
  adminPaymentsQuerySchema,
  blockIdParamSchema,
  createAuthorityBlockSchema,
  createFacilitySchema,
  createFacilitySlotSchema,
  deleteSlotQuerySchema,
  facilityIdParamSchema,
  facilityParamSchema,
  facilitySlotParamsSchema,
  financialReportQuerySchema,
  toggleSlotBlockSchema,
  updateFacilitySchema,
  updateFacilitySlotSchema,
  updateFacilityStatusSchema,
  updateUserStatusSchema,
  userIdParamSchema,
} from './admin.schema';

const adminRouter = Router();

// All /api/admin/* endpoints strictly require STAFF_ADMIN authentication
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

// 2. Facilities & Slot Schedule Manager (`STAFF_ADMIN` only)
adminRouter.get(
  '/facilities',
  validateQuery(adminFacilitiesQuerySchema),
  AdminController.listFacilities
);

adminRouter.post(
  '/facilities',
  validateBody(createFacilitySchema),
  AdminController.createFacility
);

adminRouter.patch(
  '/facilities/:id',
  validateParams(facilityIdParamSchema),
  validateBody(updateFacilitySchema),
  AdminController.updateFacility
);

adminRouter.patch(
  '/facilities/:id/status',
  validateParams(facilityIdParamSchema),
  validateBody(updateFacilityStatusSchema),
  AdminController.updateFacilityStatus
);

adminRouter.get(
  '/facilities/:facilityId/schedule',
  validateParams(facilityParamSchema),
  validateQuery(adminFacilityScheduleQuerySchema),
  AdminController.getFacilitySchedule
);

// Unmasked Facility Slots View (shows BOOKED vs AUTHORITY_BLOCKED + internal_reason)
adminRouter.get(
  '/facilities/:code/slots',
  validateParams(facilityCodeParamSchema),
  validateQuery(facilitySlotsQuerySchema),
  FacilitiesController.getAdminSlots
);

adminRouter.post(
  '/facilities/:facilityId/slots',
  validateParams(facilityParamSchema),
  validateBody(createFacilitySlotSchema),
  AdminController.createFacilitySlot
);

adminRouter.patch(
  '/facilities/:facilityId/slots/:slotId',
  validateParams(facilitySlotParamsSchema),
  validateBody(updateFacilitySlotSchema),
  AdminController.updateFacilitySlot
);

adminRouter.patch(
  '/facilities/:facilityId/slots/:slotId/block',
  validateParams(facilitySlotParamsSchema),
  validateBody(toggleSlotBlockSchema),
  AdminController.toggleFacilitySlotBlock
);

adminRouter.delete(
  '/facilities/:facilityId/slots/:slotId',
  validateParams(facilitySlotParamsSchema),
  validateQuery(deleteSlotQuerySchema),
  AdminController.deleteFacilitySlot
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

// 5. Admin Payments & Financial Ledger + Offline Office Receipts (`STAFF_ADMIN` only)
adminRouter.get(
  '/payments',
  validateQuery(adminPaymentsQuerySchema),
  AdminController.listPayments
);

adminRouter.post(
  '/payments/office-receipt',
  validateBody(officeReceiptSchema),
  PaymentsController.recordOfficeReceipt
);

// 6. Immutable Audit Logs Ledger (strictly read-only GET — no edit/delete routes) & Financial Reporting
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

// 7. Admin Dashboard Overview, Bookings Schedule & Member Directory (`STAFF_ADMIN` only)
adminRouter.get('/dashboard-overview', AdminController.getDashboardOverview);

adminRouter.get(
  '/bookings',
  validateQuery(adminBookingsQuerySchema),
  AdminController.listBookings
);

adminRouter.get(
  '/members',
  validateQuery(adminMembersQuerySchema),
  AdminController.listMembers
);

export default adminRouter;
