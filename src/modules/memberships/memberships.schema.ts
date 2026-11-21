import { MembershipStatus, SessionWindow, UserRole } from '@prisma/client';
import { z } from 'zod';
import { memberOnboardingFieldsSchema } from '../auth/auth.schema';

export const applyMembershipSchema = z
  .object({
    facility_code: z.literal('SYNTHETIC_TRACK').optional().default('SYNTHETIC_TRACK'),
    duration_months: z
      .number()
      .int('Duration must be an integer number of months')
      .min(1, 'Minimum membership duration is 1 month')
      .max(6, 'Maximum membership duration is 6 months')
      .optional(),
    duration: z
      .number()
      .int('Duration must be an integer number of months')
      .min(1, 'Minimum membership duration is 1 month')
      .max(6, 'Maximum membership duration is 6 months')
      .optional(),
    session_window: z.nativeEnum(SessionWindow, {
      errorMap: () => ({
        message: "session_window must be 'MORNING', 'EVENING', or 'BOTH'.",
      }),
    }),
    govt_service_proof_url: z
      .string()
      .trim()
      .url('govt_service_proof_url must be a valid URL')
      .optional()
      .nullable(),
    instant_checkout: z.boolean().optional().default(false),
    declaration_accepted: z.boolean().optional().default(false),
    ...memberOnboardingFieldsSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.duration_months === undefined && data.duration === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration_months'],
        message: 'duration_months (1 to 6) is required.',
      });
    }
  })
  .transform((data) => ({
    facility_code: data.facility_code,
    duration_months: (data.duration_months ?? data.duration) as number,
    session_window: data.session_window,
    govt_service_proof_url: data.govt_service_proof_url ?? null,
    instant_checkout: data.instant_checkout ?? false,
    declaration_accepted: data.declaration_accepted ?? false,
    gender: data.gender,
    date_of_birth: data.date_of_birth,
    parent_name: data.parent_name,
    present_address: data.present_address,
    city_locality: data.city_locality,
    pin_code: data.pin_code,
    permanent_address: data.permanent_address,
    designation: data.designation,
    office_address: data.office_address,
    track_purpose: data.track_purpose,
    is_registered_sportsperson: data.is_registered_sportsperson,
    sport_discipline: data.sport_discipline,
    association_details: data.association_details,
  }));

export const adminMembershipFilterSchema = z
  .object({
    status: z.nativeEnum(MembershipStatus).optional(),
    role: z.enum([UserRole.PUBLIC, UserRole.GOVT_PERSONNEL]).optional(),
    session_window: z.nativeEnum(SessionWindow).optional(),
    search: z.string().trim().optional(),
  })
  .strict();

export const membershipIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid membership UUID parameter'),
  })
  .strict();

export const reviewMembershipSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_REVISION', 'SUSPEND'], {
      errorMap: () => ({
        message: "Review action must be one of: 'APPROVE', 'REJECT', 'REQUEST_REVISION', 'SUSPEND'.",
      }),
    }),
    officer_remarks: z
      .string({ required_error: 'officer_remarks is mandatory for all officer reviews.' })
      .trim()
      .min(1, 'officer_remarks cannot be empty.')
      .max(1000, 'officer_remarks cannot exceed 1000 characters.'),
  })
  .strict();

export const updateMembershipPeriodSchema = z
  .object({
    duration_months: z
      .number()
      .int('Duration must be an integer number of months')
      .min(1, 'Minimum membership duration is 1 month')
      .max(6, 'Maximum membership duration is 6 months')
      .optional(),
    session_window: z
      .nativeEnum(SessionWindow, {
        errorMap: () => ({
          message: "session_window must be 'MORNING', 'EVENING', or 'BOTH'.",
        }),
      })
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.duration_months === undefined && data.session_window === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration_months'],
        message: 'At least one of duration_months or session_window must be provided.',
      });
    }
  });

export type ApplyMembershipInput = z.infer<typeof applyMembershipSchema>;
export type UpdateMembershipPeriodInput = z.infer<typeof updateMembershipPeriodSchema>;
export type AdminMembershipFilterQuery = z.infer<typeof adminMembershipFilterSchema>;
export type ReviewMembershipInput = z.infer<typeof reviewMembershipSchema>;
