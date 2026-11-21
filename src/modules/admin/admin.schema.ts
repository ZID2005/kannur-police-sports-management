import {
  AccountStatus,
  CourtPartition,
  FacilityCode,
  Gender,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { z } from 'zod';

const timeStringRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export const facilityOperationalStatusSchema = z.enum(['ACTIVE', 'MAINTENANCE', 'CLOSED'], {
  errorMap: () => ({
    message: "operational_status must be one of: 'ACTIVE', 'MAINTENANCE', 'CLOSED'.",
  }),
});

export const managedSlotStatusSchema = z.enum(
  ['OPEN', 'BLOCKED_MAINTENANCE', 'RESERVED_DEPARTMENT'],
  {
    errorMap: () => ({
      message:
        "status must be one of: 'OPEN', 'BLOCKED_MAINTENANCE', 'RESERVED_DEPARTMENT'.",
    }),
  }
);

export const facilityBookingModeSchema = z.enum(['HOURLY_SLOTS', 'MONTHLY_MEMBERSHIP_ONLY']);

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
      .regex(dateStringRegex, "block_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
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

export const auditEntityTypeSchema = z.enum(['FACILITY', 'SLOT', 'PAYMENT', 'USER', 'SYSTEM']);

export const adminAuditLogsQuerySchema = z
  .object({
    action_category: z.string().trim().max(64).optional(),
    entity_type: auditEntityTypeSchema.optional(),
    officer_id: z.string().uuid('officer_id must be a valid UUID.').optional(),
    target_ref_id: z.string().trim().max(64).optional(),
    from_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict();

export const adminPaymentsQuerySchema = z
  .object({
    payment_mode: z.nativeEnum(PaymentMode).optional(),
    reference_type: z.nativeEnum(PaymentReferenceType).optional(),
    status: z
      .enum(['SETTLED', 'COMPLETED', 'PENDING_RECONCILIATION', 'PENDING', 'FAILED', 'REFUNDED'])
      .optional(),
    facility_code: z.string().trim().min(2).max(64).optional(),
    facility: z.string().trim().min(2).max(64).optional(),
    user_category: z.nativeEnum(UserCategory).optional(),
    from_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    search: z.string().trim().max(100).optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict()
  .transform((data) => {
    let normalizedStatus: PaymentStatus | undefined;
    if (data.status === 'COMPLETED' || data.status === 'SETTLED') {
      normalizedStatus = PaymentStatus.SETTLED;
    } else if (data.status === 'PENDING' || data.status === 'PENDING_RECONCILIATION') {
      normalizedStatus = PaymentStatus.PENDING_RECONCILIATION;
    } else if (data.status === 'FAILED') {
      normalizedStatus = PaymentStatus.FAILED;
    } else if (data.status === 'REFUNDED') {
      normalizedStatus = PaymentStatus.REFUNDED;
    }

    return {
      payment_mode: data.payment_mode,
      reference_type: data.reference_type,
      status: normalizedStatus,
      facility_code: data.facility_code ?? data.facility,
      user_category: data.user_category,
      from_date: data.from_date,
      to_date: data.to_date,
      search: data.search,
      format: data.format,
    };
  });

export const financialReportQuerySchema = z
  .object({
    from_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "from_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    to_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "to_date must be in 'YYYY-MM-DD' format.")
      .optional(),
    facility_code: z.nativeEnum(FacilityCode).optional(),
    payment_mode: z.nativeEnum(PaymentMode).optional(),
    user_category: z.nativeEnum(UserCategory).optional(),
    format: z.enum(['json', 'csv']).optional().default('json'),
  })
  .strict();

export const adminBookingsQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
    facility_code: z.string().trim().min(2).max(64).optional(),
    status: z.nativeEnum(SlotBookingStatus).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export const adminMembersQuerySchema = z
  .object({
    role: z.enum([UserRole.PUBLIC, UserRole.GOVT_PERSONNEL]).optional(),
    account_status: z.nativeEnum(AccountStatus).optional(),
    gender: z.nativeEnum(Gender).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

/* ============================================================================
 * Facilities & Slot Manager Schemas
 * ========================================================================== */

export const facilityIdParamSchema = z
  .object({
    id: z.string().trim().min(1, 'Facility ID or code is required.').max(64),
  })
  .strict();

export const facilityParamSchema = z
  .object({
    facilityId: z.string().trim().min(1, 'Facility ID or code is required.').max(64),
  })
  .strict();

export const facilitySlotParamsSchema = z
  .object({
    facilityId: z.string().trim().min(1, 'Facility ID or code is required.').max(64),
    slotId: z.string().uuid('Invalid slot UUID parameter.'),
  })
  .strict();

export const adminFacilitiesQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
    status: facilityOperationalStatusSchema.optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export const adminFacilityScheduleQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
  })
  .strict();

export const createFacilitySchema = z
  .object({
    name: z
      .string({ required_error: 'Facility name is required.' })
      .trim()
      .min(2, 'Facility name must be at least 2 characters.')
      .max(150, 'Facility name cannot exceed 150 characters.'),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z0-9_]{3,40}$/,
        'Facility code must contain 3-40 uppercase letters, numbers, or underscores.'
      )
      .optional(),
    category: z
      .string({ required_error: 'Facility category is required.' })
      .trim()
      .min(2, 'Category must be at least 2 characters.')
      .max(80, 'Category cannot exceed 80 characters.'),
    court_count: z.coerce
      .number()
      .int('Court count must be a whole number.')
      .min(1, 'Court count must be at least 1.')
      .max(100, 'Court count cannot exceed 100.')
      .default(1),
    court_unit_label: z.string().trim().min(1).max(40).optional().default('Courts'),
    operational_status: facilityOperationalStatusSchema.optional().default('ACTIVE'),
    max_capacity_per_slot: z.coerce
      .number()
      .int('Max capacity per slot must be a whole number.')
      .min(1, 'Max capacity per slot must be at least 1.')
      .max(500, 'Max capacity per slot cannot exceed 500.'),
    operating_start: z
      .string({ required_error: 'operating_start (HH:MM) is required.' })
      .trim()
      .regex(timeStringRegex, "operating_start must be in 24-hour 'HH:MM' format."),
    operating_end: z
      .string({ required_error: 'operating_end (HH:MM) is required.' })
      .trim()
      .regex(timeStringRegex, "operating_end must be in 24-hour 'HH:MM' format."),
    slot_duration_mins: z.coerce
      .number()
      .int()
      .min(15, 'Slot duration must be at least 15 minutes.')
      .max(240, 'Slot duration cannot exceed 240 minutes.')
      .optional()
      .default(60),
    daily_user_hour_cap: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .default(2),
    monthly_member_cap: z.coerce.number().int().min(1).max(5000).nullable().optional(),
    is_partitionable: z.boolean().optional().default(false),
    booking_mode: facilityBookingModeSchema.optional().default('HOURLY_SLOTS'),
    public_rate: z.coerce
      .number({ required_error: 'Public fee rate is required.' })
      .min(0, 'Public fee rate cannot be negative.')
      .max(100000),
    govt_rate: z.coerce
      .number({ required_error: 'Govt/Police fee rate is required.' })
      .min(0, 'Govt/Police fee rate cannot be negative.')
      .max(100000),
    half_court_public_rate: z.coerce.number().min(0).max(100000).nullable().optional(),
    half_court_govt_rate: z.coerce.number().min(0).max(100000).nullable().optional(),
    description: z.string().trim().max(600).optional().default(''),
  })
  .strict();

export const updateFacilitySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    court_count: z.coerce.number().int().min(1).max(100).optional(),
    court_unit_label: z.string().trim().min(1).max(40).optional(),
    operational_status: facilityOperationalStatusSchema.optional(),
    max_capacity_per_slot: z.coerce.number().int().min(1).max(500).optional(),
    operating_start: z
      .string()
      .trim()
      .regex(timeStringRegex, "operating_start must be in 24-hour 'HH:MM' format.")
      .optional(),
    operating_end: z
      .string()
      .trim()
      .regex(timeStringRegex, "operating_end must be in 24-hour 'HH:MM' format.")
      .optional(),
    slot_duration_mins: z.coerce.number().int().min(15).max(240).optional(),
    daily_user_hour_cap: z.coerce.number().int().min(1).max(12).optional(),
    monthly_member_cap: z.coerce.number().int().min(1).max(5000).nullable().optional(),
    is_partitionable: z.boolean().optional(),
    booking_mode: facilityBookingModeSchema.optional(),
    public_rate: z.coerce.number().min(0).max(100000).optional(),
    govt_rate: z.coerce.number().min(0).max(100000).optional(),
    half_court_public_rate: z.coerce.number().min(0).max(100000).nullable().optional(),
    half_court_govt_rate: z.coerce.number().min(0).max(100000).nullable().optional(),
    description: z.string().trim().max(600).optional(),
  })
  .strict();

export const updateFacilityStatusSchema = z
  .object({
    operational_status: facilityOperationalStatusSchema,
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const createFacilitySlotSchema = z
  .object({
    start_time: z
      .string({ required_error: 'start_time (HH:MM) is required.' })
      .trim()
      .regex(timeStringRegex, "start_time must be in 24-hour 'HH:MM' format."),
    end_time: z
      .string({ required_error: 'end_time (HH:MM) is required.' })
      .trim()
      .regex(timeStringRegex, "end_time must be in 24-hour 'HH:MM' format."),
    max_capacity: z.coerce
      .number()
      .int('max_capacity must be a whole number.')
      .min(1, 'max_capacity must be at least 1.')
      .max(500, 'max_capacity cannot exceed 500.')
      .optional(),
    slot_date: z
      .string()
      .trim()
      .regex(dateStringRegex, "slot_date must be in 'YYYY-MM-DD' format.")
      .nullable()
      .optional(),
    status: managedSlotStatusSchema.optional().default('OPEN'),
    block_reason: z.string().trim().max(500).nullable().optional(),
    court_partition: z.nativeEnum(CourtPartition).optional().default(CourtPartition.FULL),
  })
  .strict();

export const updateFacilitySlotSchema = z
  .object({
    start_time: z
      .string()
      .trim()
      .regex(timeStringRegex, "start_time must be in 24-hour 'HH:MM' format.")
      .optional(),
    end_time: z
      .string()
      .trim()
      .regex(timeStringRegex, "end_time must be in 24-hour 'HH:MM' format.")
      .optional(),
    max_capacity: z.coerce.number().int().min(1).max(500).optional(),
    status: managedSlotStatusSchema.optional(),
    block_reason: z.string().trim().max(500).nullable().optional(),
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
  })
  .strict();

export const toggleSlotBlockSchema = z
  .object({
    blocked: z.boolean({ required_error: "'blocked' boolean flag is required." }),
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
    block_status: z
      .enum(['BLOCKED_MAINTENANCE', 'RESERVED_DEPARTMENT'])
      .optional()
      .default('BLOCKED_MAINTENANCE'),
    reason: z.string().trim().max(500).optional(),
    force_override: z.boolean().optional().default(false),
  })
  .strict();

export const deleteSlotQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(dateStringRegex, "date must be in 'YYYY-MM-DD' format.")
      .optional(),
  })
  .strict();

export type CreateAuthorityBlockInput = z.infer<typeof createAuthorityBlockSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AdminAuditLogsQuery = z.infer<typeof adminAuditLogsQuerySchema>;
export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuerySchema>;
export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;
export type AdminBookingsQuery = z.infer<typeof adminBookingsQuerySchema>;
export type AdminMembersQuery = z.infer<typeof adminMembersQuerySchema>;
export type AdminFacilitiesQuery = z.infer<typeof adminFacilitiesQuerySchema>;
export type AdminFacilityScheduleQuery = z.infer<typeof adminFacilityScheduleQuerySchema>;
export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type UpdateFacilityStatusInput = z.infer<typeof updateFacilityStatusSchema>;
export type CreateFacilitySlotInput = z.infer<typeof createFacilitySlotSchema>;
export type UpdateFacilitySlotInput = z.infer<typeof updateFacilitySlotSchema>;
export type ToggleSlotBlockInput = z.infer<typeof toggleSlotBlockSchema>;
export type DeleteSlotQuery = z.infer<typeof deleteSlotQuerySchema>;
