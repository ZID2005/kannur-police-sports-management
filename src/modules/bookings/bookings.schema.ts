import { CourtPartition } from '@prisma/client';
import { z } from 'zod';

export const reserveSlotSchema = z
  .object({
    facility_code: z
      .string({ required_error: 'facility_code is required.' })
      .trim()
      .min(2, 'facility_code must be at least 2 characters.')
      .max(64, 'facility_code cannot exceed 64 characters.')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'facility_code may only contain letters, numbers, underscores, and hyphens.'
      )
      .transform((val) => val.toUpperCase()),
    booking_date: z
      .string({ required_error: 'booking_date (YYYY-MM-DD) is required.' })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "booking_date must be in 'YYYY-MM-DD' format."),
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
  })
  .strict();

export const bookingIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid booking UUID parameter'),
  })
  .strict();

export const cancelBookingSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'Cancellation reason cannot be empty if provided')
      .max(500, 'Cancellation reason cannot exceed 500 characters')
      .optional(),
  })
  .strict();

export type ReserveSlotInput = z.infer<typeof reserveSlotSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
