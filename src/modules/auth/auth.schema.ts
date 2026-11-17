import { z } from 'zod';

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
      .transform((val) => val.toLowerCase()),
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
export type LoginInput = z.infer<typeof loginSchema>;
