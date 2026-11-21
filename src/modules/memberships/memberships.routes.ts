import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateBody, validateParams } from '../../middleware/validate.middleware';
import { MembershipsController } from './memberships.controller';
import {
  applyMembershipSchema,
  membershipIdParamSchema,
  updateMembershipPeriodSchema,
} from './memberships.schema';

const membershipsRouter = Router();

membershipsRouter.post(
  '/apply',
  authenticate,
  requireRole(UserRole.PUBLIC, UserRole.GOVT_PERSONNEL),
  validateBody(applyMembershipSchema),
  MembershipsController.apply
);

membershipsRouter.get('/my', authenticate, MembershipsController.getMyMemberships);

membershipsRouter.patch(
  '/:id/period',
  authenticate,
  requireRole(UserRole.PUBLIC, UserRole.GOVT_PERSONNEL),
  validateParams(membershipIdParamSchema),
  validateBody(updateMembershipPeriodSchema),
  MembershipsController.updatePeriod
);

export default membershipsRouter;
