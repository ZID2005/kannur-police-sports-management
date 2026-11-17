# ==============================================================================
# Kannur City Police Sports Facilities Management System
# Multi-Stage Production Dockerfile — On-Premise Node.js / TypeScript Backend
# ==============================================================================

# Stage 1: Build & Prisma Client Generation
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies cleanly using lockfile
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client and compile TypeScript -> dist/
RUN npx prisma generate && npm run build

# Stage 2: Hardened Production Runtime
FROM node:20-alpine AS production

RUN apk add --no-cache openssl wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Copy runtime artifacts, Prisma schema/migrations, and generated client
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/health || exit 1

# Run pending database migrations on startup and launch the compiled server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
