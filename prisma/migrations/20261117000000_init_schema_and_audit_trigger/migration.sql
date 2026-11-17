-- ============================================================================
-- KANNUR CITY POLICE SPORTS FACILITIES MANAGEMENT SYSTEM
-- Migration: 20261117000000_init_schema_and_audit_trigger
-- Target: On-Premise PostgreSQL 15/16+ (Linux Department Server)
--
-- STRICT CONSTRAINTS ENFORCED:
-- 1. ZERO mobile phone / SMS / OTP columns in any table.
-- 2. ZERO Aadhaar or Government ID number columns in any table.
-- 3. `audit_logs` is strictly append-only via PostgreSQL triggers blocking
--    UPDATE, DELETE, and TRUNCATE operations.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUMERATED TYPES
-- ----------------------------------------------------------------------------

CREATE TYPE "user_role" AS ENUM (
  'PUBLIC',
  'GOVT_PERSONNEL',
  'STAFF_ADMIN',
  'GATE_OFFICER'
);

CREATE TYPE "account_status" AS ENUM (
  'ACTIVE',
  'SUSPENDED',
  'BANNED'
);

CREATE TYPE "facility_code" AS ENUM (
  'SYNTHETIC_TRACK',
  'FOOTBALL_GROUND',
  'POLICE_TURF',
  'BADMINTON_COURT'
);

CREATE TYPE "user_category" AS ENUM (
  'PUBLIC',
  'GOVT_PERSONNEL'
);

CREATE TYPE "booking_type" AS ENUM (
  'MONTHLY_PASS',
  'FULL_COURT',
  'HALF_COURT'
);

CREATE TYPE "session_window" AS ENUM (
  'MORNING',
  'EVENING',
  'BOTH'
);

CREATE TYPE "membership_status" AS ENUM (
  'PENDING_APPROVAL',
  'APPROVED_UNPAID',
  'ACTIVE',
  'REJECTED',
  'EXPIRED',
  'SUSPENDED'
);

CREATE TYPE "court_partition" AS ENUM (
  'FULL',
  'HALF_A',
  'HALF_B'
);

CREATE TYPE "slot_booking_status" AS ENUM (
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CANCELLED',
  'REFUNDED'
);

CREATE TYPE "payment_reference_type" AS ENUM (
  'MEMBERSHIP',
  'SLOT_BOOKING'
);

CREATE TYPE "payment_mode" AS ENUM (
  'ONLINE_GATEWAY',
  'OFFICE_RECEIPT'
);

CREATE TYPE "payment_status" AS ENUM (
  'SETTLED',
  'PENDING_RECONCILIATION',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "verification_type" AS ENUM (
  'QR_ONLY',
  'QR_AND_BIOMETRIC',
  'MANUAL_OVERRIDE'
);

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

-- 2.1 users (NO phone/mobile/OTP fields, NO Aadhaar/Govt ID number fields)
CREATE TABLE "users" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "username"          VARCHAR(64) NOT NULL UNIQUE,
  "password_hash"     VARCHAR(255) NOT NULL,
  "full_name"         VARCHAR(150) NOT NULL,
  "email"             VARCHAR(150) UNIQUE,
  "role"              "user_role" NOT NULL DEFAULT 'PUBLIC',
  "account_status"    "account_status" NOT NULL DEFAULT 'ACTIVE',
  "ban_reason"        TEXT,
  "profile_photo_url" TEXT,
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_users_username" ON "users" ("username");
CREATE INDEX "idx_users_role_status" ON "users" ("role", "account_status");

-- 2.2 facilities
CREATE TABLE "facilities" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code"                "facility_code" NOT NULL UNIQUE,
  "name"                VARCHAR(150) NOT NULL,
  "operating_start"     TIME(0) NOT NULL,
  "operating_end"       TIME(0) NOT NULL,
  "slot_duration_mins"  INTEGER NOT NULL DEFAULT 60,
  "daily_user_hour_cap" INTEGER NOT NULL,
  "monthly_member_cap"  INTEGER,
  "is_partitionable"    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "chk_facilities_operating_hours" CHECK ("operating_end" > "operating_start"),
  CONSTRAINT "chk_facilities_slot_duration" CHECK ("slot_duration_mins" > 0),
  CONSTRAINT "chk_facilities_daily_hour_cap" CHECK ("daily_user_hour_cap" > 0),
  CONSTRAINT "chk_facilities_partitionable_turf_only" CHECK (
    ("is_partitionable" = FALSE) OR ("code" = 'POLICE_TURF')
  )
);

-- 2.3 tariffs
CREATE TABLE "tariffs" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id"   UUID NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "user_category" "user_category" NOT NULL,
  "booking_type"  "booking_type" NOT NULL,
  "base_price"    DECIMAL(10, 2) NOT NULL,
  "gst_percent"   DECIMAL(5, 2) NOT NULL DEFAULT 18.00,
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT "uq_tariff_facility_category_type" UNIQUE ("facility_id", "user_category", "booking_type"),
  CONSTRAINT "chk_tariffs_base_price" CHECK ("base_price" >= 0),
  CONSTRAINT "chk_tariffs_gst_percent" CHECK ("gst_percent" >= 0 AND "gst_percent" <= 100)
);

CREATE INDEX "idx_tariffs_facility_active" ON "tariffs" ("facility_id", "is_active");

-- 2.4 memberships (Only govt_service_proof_url stored; ZERO Aadhaar/ID numbers)
CREATE TABLE "memberships" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pass_code"              VARCHAR(32) NOT NULL UNIQUE,
  "user_id"                UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "facility_id"            UUID NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "duration_months"        INTEGER NOT NULL,
  "start_date"             DATE,
  "end_date"               DATE,
  "session_window"         "session_window" NOT NULL,
  "govt_service_proof_url" TEXT,
  "status"                 "membership_status" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "reviewed_by_officer_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "officer_remarks"        TEXT,
  "qr_token_hash"          VARCHAR(128) UNIQUE,
  "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_memberships_duration_months" CHECK ("duration_months" BETWEEN 1 AND 6),
  CONSTRAINT "chk_memberships_dates" CHECK (
    ("start_date" IS NULL AND "end_date" IS NULL) OR
    ("start_date" IS NOT NULL AND "end_date" IS NOT NULL AND "end_date" >= "start_date")
  )
);

CREATE INDEX "idx_memberships_user_status" ON "memberships" ("user_id", "status");
CREATE INDEX "idx_memberships_facility_status" ON "memberships" ("facility_id", "status");

-- 2.5 slot_bookings
CREATE TABLE "slot_bookings" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_code"    VARCHAR(32) NOT NULL UNIQUE,
  "user_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "facility_id"     UUID NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "booking_date"    DATE NOT NULL,
  "start_time"      TIME(0) NOT NULL,
  "end_time"        TIME(0) NOT NULL,
  "court_partition" "court_partition" NOT NULL DEFAULT 'FULL',
  "total_amount"    DECIMAL(10, 2) NOT NULL,
  "status"          "slot_booking_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "qr_token_hash"   VARCHAR(128) UNIQUE,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_slot_bookings_time_range" CHECK ("end_time" > "start_time"),
  CONSTRAINT "chk_slot_bookings_total_amount" CHECK ("total_amount" >= 0)
);

CREATE INDEX "idx_slot_bookings_facility_date_status" ON "slot_bookings" ("facility_id", "booking_date", "status");
CREATE INDEX "idx_slot_bookings_user_date" ON "slot_bookings" ("user_id", "booking_date");

-- 2.6 authority_blocks (`internal_reason` strictly omitted from public APIs)
CREATE TABLE "authority_blocks" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id"           UUID NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "block_date"            DATE NOT NULL,
  "start_time"            TIME(0) NOT NULL,
  "end_time"              TIME(0) NOT NULL,
  "court_partition"       "court_partition" NOT NULL DEFAULT 'FULL',
  "internal_reason"       TEXT NOT NULL,
  "created_by_officer_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "is_active"             BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_authority_blocks_time_range" CHECK ("end_time" > "start_time")
);

CREATE INDEX "idx_authority_blocks_facility_date_active" ON "authority_blocks" ("facility_id", "block_date", "is_active");

-- 2.7 payments
CREATE TABLE "payments" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "receipt_no"             VARCHAR(48) NOT NULL UNIQUE,
  "reference_type"         "payment_reference_type" NOT NULL,
  "reference_id"           UUID NOT NULL,
  "user_id"                UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "payment_mode"           "payment_mode" NOT NULL,
  "base_amount"            DECIMAL(10, 2) NOT NULL,
  "gst_amount"             DECIMAL(10, 2) NOT NULL,
  "total_amount"           DECIMAL(10, 2) NOT NULL,
  "status"                 "payment_status" NOT NULL DEFAULT 'PENDING_RECONCILIATION',
  "recorded_by_officer_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_payments_amounts" CHECK (
    "base_amount" >= 0 AND "gst_amount" >= 0 AND "total_amount" = ("base_amount" + "gst_amount")
  )
);

CREATE INDEX "idx_payments_reference" ON "payments" ("reference_type", "reference_id");
CREATE INDEX "idx_payments_user_status" ON "payments" ("user_id", "status");

-- 2.8 gate_logs
CREATE TABLE "gate_logs" (
  "id"                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "facility_id"                UUID NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT,
  "gate_name"                  VARCHAR(100) NOT NULL,
  "user_id"                    UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "pass_or_booking_code"       VARCHAR(64) NOT NULL,
  "verification_type"          "verification_type" NOT NULL,
  "stage1_qr_passed"           BOOLEAN NOT NULL,
  "stage2_biometric_passed"    BOOLEAN NOT NULL,
  "access_granted"             BOOLEAN NOT NULL,
  "failure_or_override_reason" TEXT,
  "verified_by_officer_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "scanned_at"                 TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_gate_logs_facility_scanned" ON "gate_logs" ("facility_id", "scanned_at");
CREATE INDEX "idx_gate_logs_code" ON "gate_logs" ("pass_or_booking_code");

-- 2.9 audit_logs (STRICTLY APPEND-ONLY IMMUTABLE LEDGER)
CREATE TABLE "audit_logs" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "officer_id"         UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action_category"    VARCHAR(64) NOT NULL,
  "action_description" TEXT NOT NULL,
  "target_ref_id"      VARCHAR(64),
  "details"            JSONB NOT NULL DEFAULT '{}'::jsonb,
  "ip_address"         VARCHAR(64) NOT NULL,
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_audit_logs_officer_created" ON "audit_logs" ("officer_id", "created_at" DESC);
CREATE INDEX "idx_audit_logs_category_created" ON "audit_logs" ("action_category", "created_at" DESC);

-- ----------------------------------------------------------------------------
-- 3. AUTOMATIC `updated_at` TRIGGER FOR `users`
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. IMMUTABLE LOCAL AUDIT LOGGING TRIGGER (`audit_logs` APPEND-ONLY)
--    Blocks UPDATE, DELETE, and TRUNCATE operations at the PostgreSQL kernel level.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: audit_logs is an append-only immutable ledger. Operation % is strictly prohibited.', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Audit records in the Kannur City Police Sports Facilities Management System cannot be modified, deleted, or truncated.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_block_update_delete
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_block_truncate
BEFORE TRUNCATE ON "audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_audit_log_mutation();
