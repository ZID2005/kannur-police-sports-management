import { Request, Response, NextFunction } from 'express';
import {
  BatchSyncGateLogsInput,
  ManualOverrideInput,
  SyncCacheQuery,
  VerifyGateEntryInput,
} from './gate.schema';
import { GateService } from './gate.service';

export class GateController {
  /**
   * GET /api/gate/sync-cache
   */
  static async getOfflineSyncCache(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as SyncCacheQuery;
      const result = await GateService.getOfflineSyncCache(query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/gate/verify
   */
  static async verifyGateEntry(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as VerifyGateEntryInput;
      const result = await GateService.verifyGateEntry(req.user!, payload);

      res.status(200).json({
        success: true,
        message: result.access_granted
          ? 'Gate entry verified and granted.'
          : `Gate entry rejected: ${result.failure_or_override_reason}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/gate/manual-override
   */
  static async manualOverride(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as ManualOverrideInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await GateService.manualOverride(
        req.user!,
        payload,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: 'Manual gate override granted and logged to gate_logs and audit_logs.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/gate/batch-sync
   */
  static async batchSyncLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const payload = req.body as BatchSyncGateLogsInput;
      const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await GateService.batchSyncLogs(
        req.user!,
        payload,
        ipAddress
      );

      res.status(201).json({
        success: true,
        message: `Successfully synchronized ${result.synced_count} offline gate scan log(s).`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
