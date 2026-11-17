import { MembershipStatus, SessionWindow, UserRole } from '@prisma/client';
import { z } from 'zod';

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

export type ApplyMembershipInput = z.infer<typeof applyMembershipSchema>;
export type AdminMembershipFilterQuery = z.infer<typeof adminMembershipFilterSchema>;
export type ReviewMembershipInput = z.infer<typeof reviewMembershipSchema>;
