import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate.middleware';
import { GateController } from './gate.controller';
import {
  batchSyncGateLogsSchema,
  manualOverrideSchema,
  syncCacheQuerySchema,
  verifyGateEntrySchema,
} from './gate.schema';

const gateRouter = Router();

// All /api/gate/* endpoints require GATE_OFFICER or STAFF_ADMIN authentication
gateRouter.use(
  authenticate,
  requireRole(UserRole.GATE_OFFICER, UserRole.STAFF_ADMIN)
);

// 1. Offline Cache Sync Manifest (ACTIVE memberships + today's CONFIRMED slot bookings)
gateRouter.get(
  '/sync-cache',
  validateQuery(syncCacheQuerySchema),
  GateController.getOfflineSyncCache
);

// 2. Live Gate Verification (2-Stage QR+Biometric on SYNTHETIC_TRACK, 1-Stage QR_ONLY on Courts/Turf/Ground)
gateRouter.post(
  '/verify',
  validateBody(verifyGateEntrySchema),
  GateController.verifyGateEntry
);

// 3. Manual Override during Hardware/Sensor Failure (writes to gate_logs AND audit_logs)
gateRouter.post(
  '/manual-override',
  validateBody(manualOverrideSchema),
  GateController.manualOverride
);

// 4. Offline Queued Scan Batch Reconciliation
gateRouter.post(
  '/batch-sync',
  validateBody(batchSyncGateLogsSchema),
  GateController.batchSyncLogs
);

export default gateRouter;
