import { FacilityCode } from '@prisma/client';
import { z } from 'zod';

export const facilityCodeParamSchema = z
  .object({
    code: z.nativeEnum(FacilityCode, {
      errorMap: () => ({
        message:
          "Invalid facility code. Expected one of: 'SYNTHETIC_TRACK', 'FOOTBALL_GROUND', 'POLICE_TURF', 'BADMINTON_COURT'.",
      }),
    }),
  })
  .strict();

export const facilitySlotsQuerySchema = z
  .object({
    date: z
      .string({ required_error: "Query parameter 'date' (YYYY-MM-DD) is required." })
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Query parameter 'date' must be in 'YYYY-MM-DD' format."),
  })
  .strict();

export type FacilityCodeParam = z.infer<typeof facilityCodeParamSchema>;
export type FacilitySlotsQuery = z.infer<typeof facilitySlotsQuerySchema>;
