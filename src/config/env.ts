import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://kcp_app_user:kcp_local_pass@127.0.0.1:5432/kcp_sports_db?schema=public'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for on-premise security')
    .default('kcp-on-premise-local-department-jwt-secret-key-2026-kannur-police'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  SESSION_COOKIE_NAME: z.string().default('kcp_session'),
  SESSION_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return process.env.NODE_ENV === 'production';
    }),
  ALLOWED_ORIGIN: z.string().default('http://localhost:3000'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
