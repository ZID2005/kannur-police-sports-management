import { FacilityCode, VerificationType } from '@prisma/client';
import { z } from 'zod';

export const syncCacheQuerySchema = z
  .object({
    facility: z.nativeEnum(FacilityCode).optional(),
    facility_code: z.nativeEnum(FacilityCode).optional(),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
  })
  .strict()
  .transform((data) => ({
    facility: data.facility ?? data.facility_code,
    date: data.date,
  }));

export const verifyGateEntrySchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode, {
      errorMap: () => ({
        message:
          "Invalid facility_code. Expected 'SYNTHETIC_TRACK', 'FOOTBALL_GROUND', 'POLICE_TURF', or 'BADMINTON_COURT'.",
      }),
    }),
    gate_name: z
      .string()
      .trim()
      .min(1, 'gate_name cannot be empty.')
      .max(100)
      .optional()
      .default('MAIN_ENTRY_GATE'),
    qr_token: z
      .string()
      .trim()
      .min(1, 'qr_token cannot be empty.')
      .max(256)
      .optional(),
    qr_token_hash: z
      .string()
      .trim()
      .min(1, 'qr_token_hash cannot be empty.')
      .max(256)
      .optional(),
    pass_or_booking_code: z
      .string()
      .trim()
      .min(1, 'pass_or_booking_code cannot be empty.')
      .max(64)
      .optional(),
    stage1_qr_passed: z.boolean().optional(),
    stage2_biometric_passed: z.boolean().optional(),
    biometric_passed: z.boolean().optional(),
    biometric_verified: z.boolean().optional(),
    scan_timestamp: z.string().datetime().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.qr_token && !data.qr_token_hash && !data.pass_or_booking_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['qr_token'],
        message:
          'At least one of qr_token, qr_token_hash, or pass_or_booking_code is required for gate verification.',
      });
    }
  })
  .transform((data) => ({
    facility_code: data.facility_code,
    gate_name: data.gate_name,
    qr_token: data.qr_token ?? data.qr_token_hash,
    pass_or_booking_code: data.pass_or_booking_code,
    stage1_qr_passed: data.stage1_qr_passed,
    stage2_biometric_passed:
      data.stage2_biometric_passed ??
      data.biometric_passed ??
      data.biometric_verified ??
      false,
    scan_timestamp: data.scan_timestamp,
  }));

export const manualOverrideSchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode, {
      errorMap: () => ({
        message:
          "Invalid facility_code. Expected 'SYNTHETIC_TRACK', 'FOOTBALL_GROUND', 'POLICE_TURF', or 'BADMINTON_COURT'.",
      }),
    }),
    gate_name: z
      .string()
      .trim()
      .min(1, 'gate_name cannot be empty.')
      .max(100)
      .optional()
      .default('MAIN_ENTRY_GATE'),
    pass_or_booking_code: z
      .string({ required_error: 'pass_or_booking_code is required.' })
      .trim()
      .min(1, 'pass_or_booking_code cannot be empty.')
      .max(64),
    user_id: z.string().uuid('user_id must be a valid UUID.').optional(),
    override_reason: z
      .string({
        required_error: 'override_reason is mandatory for manual gate override.',
      })
      .trim()
      .min(1, 'override_reason cannot be empty.')
      .max(1000, 'override_reason cannot exceed 1000 characters.'),
    stage1_qr_passed: z.boolean().optional().default(false),
    stage2_biometric_passed: z.boolean().optional().default(false),
  })
  .strict();

const offlineScanItemSchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode),
    gate_name: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .default('OFFLINE_SYNC_GATE'),
    user_id: z.string().uuid().optional(),
    pass_or_booking_code: z.string().trim().min(1).max(64),
    verification_type: z.nativeEnum(VerificationType).optional(),
    stage1_qr_passed: z.boolean(),
    stage2_biometric_passed: z.boolean().optional().default(false),
    access_granted: z.boolean().optional(),
    failure_or_override_reason: z.string().trim().max(1000).nullable().optional(),
    scanned_at: z.string().datetime().optional(),
  })
  .strict();

export const batchSyncGateLogsSchema = z
  .object({
    logs: z.array(offlineScanItemSchema).min(1).max(500).optional(),
    entries: z.array(offlineScanItemSchema).min(1).max(500).optional(),
    scans: z.array(offlineScanItemSchema).min(1).max(500).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const resolved = data.logs ?? data.entries ?? data.scans;
    if (!resolved || resolved.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['logs'],
        message: 'At least one offline gate scan log entry is required in logs[].',
      });
    }
  })
  .transform((data) => ({
    logs: (data.logs ?? data.entries ?? data.scans)!,
  }));

export type SyncCacheQuery = z.infer<typeof syncCacheQuerySchema>;
export type VerifyGateEntryInput = z.infer<typeof verifyGateEntrySchema>;
export type ManualOverrideInput = z.infer<typeof manualOverrideSchema>;
export type BatchSyncGateLogsInput = z.infer<typeof batchSyncGateLogsSchema>;
