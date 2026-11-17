import { CourtPartition, FacilityCode } from '@prisma/client';
import { z } from 'zod';

export const reserveSlotSchema = z
  .object({
    facility_code: z.nativeEnum(FacilityCode, {
      errorMap: () => ({
        message:
          "Invalid facility_code. Expected 'FOOTBALL_GROUND', 'POLICE_TURF', 'BADMINTON_COURT', or 'SYNTHETIC_TRACK'.",
      }),
    }),
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
