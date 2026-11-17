import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export interface CreateAuditLogInput {
  officerId: string;
  actionCategory: string;
  actionDescription: string;
  targetRefId?: string | null;
  details?: Prisma.InputJsonValue;
  ipAddress: string;
}

/**
 * Appends an immutable entry to `audit_logs`.
 * Note: `audit_logs` is protected by PostgreSQL triggers that block UPDATE, DELETE, and TRUNCATE.
 */
export async function recordAuditLog(input: CreateAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      officer_id: input.officerId,
      action_category: input.actionCategory,
      action_description: input.actionDescription,
      target_ref_id: input.targetRefId ?? null,
      details: input.details ?? {},
      ip_address: input.ipAddress,
    },
  });
}
