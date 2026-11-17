import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { env } from './env';
import { inMemoryPrisma } from './inMemoryDb';

/**
 * Defense-in-depth: In addition to the PostgreSQL kernel trigger
 * `trg_audit_logs_block_update_delete`, this Prisma Client extension
 * blocks any ORM-level mutation or deletion on `auditLog`.
 */
function createRealPrisma() {
  const basePrisma = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  return basePrisma.$extends({
    query: {
      auditLog: {
        async update() {
          throw new AppError(
            'SECURITY VIOLATION: audit_logs is append-only; UPDATE is strictly prohibited.',
            403,
            'AUDIT_LOG_IMMUTABLE'
          );
        },
        async updateMany() {
          throw new AppError(
            'SECURITY VIOLATION: audit_logs is append-only; UPDATE is strictly prohibited.',
            403,
            'AUDIT_LOG_IMMUTABLE'
          );
        },
        async upsert() {
          throw new AppError(
            'SECURITY VIOLATION: audit_logs is append-only; UPSERT is strictly prohibited.',
            403,
            'AUDIT_LOG_IMMUTABLE'
          );
        },
        async delete() {
          throw new AppError(
            'SECURITY VIOLATION: audit_logs is append-only; DELETE is strictly prohibited.',
            403,
            'AUDIT_LOG_IMMUTABLE'
          );
        },
        async deleteMany() {
          throw new AppError(
            'SECURITY VIOLATION: audit_logs is append-only; DELETE is strictly prohibited.',
            403,
            'AUDIT_LOG_IMMUTABLE'
          );
        },
      },
    },
  });
}

export type DbClient = ReturnType<typeof createRealPrisma>;

const hasExplicitDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());

if (!hasExplicitDatabaseUrl && env.NODE_ENV !== 'test') {
  console.log(
    '[KCP Sports DB] DATABASE_URL is not configured; using pre-seeded in-memory store for local development.'
  );
}

export const prisma: DbClient = hasExplicitDatabaseUrl
  ? createRealPrisma()
  : (inMemoryPrisma as unknown as DbClient);
