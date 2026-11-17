import {
  FacilityCode,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
} from '@prisma/client';
import { z } from 'zod';

export const settlePaymentSchema = z
  .object({
    reference_type: z.nativeEnum(PaymentReferenceType, {
      errorMap: () => ({
        message: "reference_type must be either 'MEMBERSHIP' or 'SLOT_BOOKING'.",
      }),
    }),
    reference_id: z
      .string()
      .uuid('reference_id must be a valid UUID.')
      .optional(),
    pass_or_booking_code: z
      .string()
      .trim()
      .min(1, 'pass_or_booking_code cannot be empty.')
      .max(64)
      .optional(),
    base_amount: z.coerce
      .number()
      .positive('base_amount must be greater than 0.')
      .optional(),
    gst_amount: z.coerce
      .number()
      .nonnegative('gst_amount cannot be negative.')
      .optional(),
    total_amount: z.coerce
      .number()
      .positive('total_amount must be greater than 0.')
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.reference_id && !data.pass_or_booking_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reference_id'],
        message: 'Either reference_id (UUID) or pass_or_booking_code is required.',
      });
    }
  });

export const officeReceiptSchema = z
  .object({
    reference_type: z.nativeEnum(PaymentReferenceType, {
      errorMap: () => ({
        message: "reference_type must be either 'MEMBERSHIP' or 'SLOT_BOOKING'.",
      }),
    }),
    reference_id: z
      .string()
      .uuid('reference_id must be a valid UUID.')
      .optional(),
    pass_or_booking_code: z
      .string()
      .trim()
      .min(1, 'pass_or_booking_code cannot be empty.')
      .max(64)
      .optional(),
    base_amount: z.coerce
      .number()
      .positive('base_amount must be greater than 0.')
      .optional(),
    gst_amount: z.coerce
      .number()
      .nonnegative('gst_amount cannot be negative.')
      .optional(),
    total_amount: z.coerce
      .number()
      .positive('total_amount must be greater than 0.')
      .optional(),
    treasury_challan_no: z
      .string()
      .trim()
      .min(1, 'treasury_challan_no cannot be empty when provided.')
      .max(100)
      .optional(),
    remarks: z
      .string()
      .trim()
      .min(1, 'remarks cannot be empty when provided.')
      .max(500)
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.reference_id && !data.pass_or_booking_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reference_id'],
        message: 'Either reference_id (UUID) or pass_or_booking_code is required.',
      });
    }
  });

export const adminPaymentFilterSchema = z
  .object({
    payment_mode: z.nativeEnum(PaymentMode).optional(),
    reference_type: z.nativeEnum(PaymentReferenceType).optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    facility_code: z.nativeEnum(FacilityCode).optional(),
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
  })
  .strict();

export type SettlePaymentInput = z.infer<typeof settlePaymentSchema>;
export type OfficeReceiptInput = z.infer<typeof officeReceiptSchema>;
export type AdminPaymentFilterQuery = z.infer<typeof adminPaymentFilterSchema>;
