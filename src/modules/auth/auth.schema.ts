import { Gender } from '@prisma/client';
import { z } from 'zod';

const optionalTrimmedString = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .transform((val) => (val.length === 0 ? null : val))
    .optional()
    .nullable();

const optionalDateOfBirth = z
  .string()
  .trim()
  .max(32)
  .transform((val) => (val.length === 0 ? null : val))
  .refine(
    (val) => val === null || /^\d{4}-\d{2}-\d{2}$/.test(val),
    "date_of_birth must be in 'YYYY-MM-DD' format."
  )
  .optional()
  .nullable();

const optionalPinCode = z
  .string()
  .trim()
  .max(12)
  .transform((val) => (val.length === 0 ? null : val))
  .refine((val) => val === null || /^\d{6}$/.test(val), 'pin_code must be a 6-digit Indian PIN code.')
  .optional()
  .nullable();

const optionalGender = z
  .preprocess(
    (val) => (val === '' ? null : typeof val === 'string' ? val.trim().toUpperCase() : val),
    z
      .nativeEnum(Gender, {
        errorMap: () => ({
          message: "gender must be 'MALE', 'FEMALE', or 'TRANSGENDER'.",
        }),
      })
      .nullable()
  )
  .optional();

export const memberOnboardingFieldsSchema = {
  gender: optionalGender,
  date_of_birth: optionalDateOfBirth,
  parent_name: optionalTrimmedString(150),
  present_address: optionalTrimmedString(500),
  city_locality: optionalTrimmedString(120),
  pin_code: optionalPinCode,
  permanent_address: optionalTrimmedString(500),
  designation: optionalTrimmedString(150),
  office_address: optionalTrimmedString(500),
  track_purpose: optionalTrimmedString(255),
  is_registered_sportsperson: z.boolean().optional(),
  sport_discipline: optionalTrimmedString(120),
  association_details: optionalTrimmedString(200),
};

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(64, 'Username cannot exceed 64 characters')
      .regex(
        /^[a-zA-Z0-9_.-]+$/,
        'Username may only contain letters, numbers, underscores, dots, and hyphens'
      )
      .transform((val) => val.toLowerCase())
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters'),
    email: z
      .string()
      .trim()
      .email('Invalid email format')
      .max(150)
      .transform((val) => val.toLowerCase())
      .optional()
      .nullable(),
    role: z
      .enum(['PUBLIC', 'GOVT_PERSONNEL'], {
        errorMap: () => ({
          message:
            "Self-registration is restricted to 'PUBLIC' or 'GOVT_PERSONNEL' roles only. Officer accounts must be provisioned by STAFF_ADMIN.",
        }),
      })
      .default('PUBLIC'),
    profile_photo_url: z.string().trim().url('Invalid profile photo URL').optional().nullable(),
    ...memberOnboardingFieldsSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(150, 'Full name cannot exceed 150 characters')
      .optional(),
    email: z
      .preprocess(
        (val) => (val === '' ? null : val),
        z
          .string()
          .trim()
          .email('Invalid email format')
          .max(150)
          .transform((val) => val.toLowerCase())
          .nullable()
      )
      .optional(),
    ...memberOnboardingFieldsSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Username is required')
      .transform((val) => val.toLowerCase()),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
