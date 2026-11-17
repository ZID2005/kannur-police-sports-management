import {
  AccountStatus,
  CourtPartition,
  FacilityCode,
  PaymentMode,
  UserCategory,
  VerificationType,
} from '@prisma/client';
import { z } from 'zod';

export const createAuthorityBlockSchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode, {
      errorMap: () => ({
        message:
          "Invalid facility_code. Expected 'SYNTHETIC_TRACK', 'FOOTBALL_GROUND', 'POLICE_TURF', or 'BADMINTON_COURT'.",
      }),
    }),
    block_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "block_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
    start_time: z
      .string({ required_error: 'start_time (HH:MM) is required.' })
      .trim()
      .regex(/^\d{2}:\d{2}$/, "start_time must be in 24-hour 'HH:MM' format."),
    end_time: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "end_time must be in 24-hour 'HH:MM' format.")
      .optional(),
    court_partition: z.nativeEnum(CourtPartition).optional().default(CourtPartition.FULL),
    internal_reason: z
      .string({ required_error: 'internal_reason is required for authority blocks.' })
      .trim()
      .min(1, 'internal_reason cannot be empty.')
      .max(1000, 'internal_reason cannot exceed 1000 characters.'),
    force_override: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.block_date && !data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['block_date'],
        message: 'block_date (YYYY-MM-DD) is required.',
      });
    }
  })
  .transform((data) => ({
    facility_code: data.facility_code,
    block_date: (data.block_date ?? data.date) as string,
    start_time: data.start_time,
    end_time: data.end_time,
    court_partition: data.court_partition,
    internal_reason: data.internal_reason,
    force_override: data.force_override,
  }));

export const blockIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid authority block UUID parameter'),
  })
  .strict();

export const userIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid user UUID parameter'),
  })
  .strict();

export const updateUserStatusSchema = z
  .object({
    account_status: z.nativeEnum(AccountStatus, {
      errorMap: () => ({
        message: "account_status must be one of: 'ACTIVE', 'SUSPENDED', 'BANNED'.",
      }),
    }),
    ban_reason: z
      .string({
        required_error: 'ban_reason is mandatory when updating user account status.',
      })
      .trim()
      .min(1, 'ban_reason cannot be empty.')
      .max(1000, 'ban_reason cannot exceed 1000 characters.'),
  })
  .strict();

export const adminGateLogsQuerySchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode).optional(),
    facility: z.nativeEnum(FacilityCode).optional(),
    verification_type: z.nativeEnum(VerificationType).optional(),
    access_granted: z.enum(['true', 'false']).optional(),
    pass_or_booking_code: z.string().trim().max(64).optional(),
    from_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  })
  .strict()
  .transform((data) => ({
    facility_code: data.facility_code ?? data.facility,
    verification_type: data.verification_type,
    access_granted:
      data.access_granted === 'true'
        ? true
        : data.access_granted === 'false'
          ? false
          : undefined,
    pass_or_booking_code: data.pass_or_booking_code,
    from_date: data.from_date,
    to_date: data.to_date,
    page: data.page,
    limit: data.limit,
  }));

export const adminAuditLogsQuerySchema = z
  .object({
    action_category: z.string().trim().max(64).optional(),
    officer_id: z.string().uuid('officer_id must be a valid UUID.').optional(),
    target_ref_id: z.string().trim().max(64).optional(),
    from_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict();

export const financialReportQuerySchema = z
  .object({
    from_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    facility_code: z.nativeEnum(FacilityCode).optional(),
    payment_mode: z.nativeEnum(PaymentMode).optional(),
    user_category: z.nativeEnum(UserCategory).optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict();

export type CreateAuthorityBlockInput = z.infer<typeof createAuthorityBlockSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AdminGateLogsQuery = z.infer<typeof adminGateLogsQuerySchema>;
export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>;
export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;
