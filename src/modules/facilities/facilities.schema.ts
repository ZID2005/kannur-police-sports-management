import { z } from 'zod';

export const facilityCodeParamSchema = z
  .object({
    code: z
      .string({ required_error: 'Facility code parameter is required.' })
      .trim()
      .min(2, 'Facility code must be at least 2 characters.')
      .max(64, 'Facility code cannot exceed 64 characters.')
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Facility code may only contain letters, numbers, underscores, and hyphens.'
      )
      .transform((val) => val.toUpperCase()),
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
