import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import {
  AccountStatus,
  BookingType,
  CourtPartition,
  FacilityCode,
  MembershipStatus,
  PaymentMode,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { formatDateOnly, parseTimeToDate } from '../src/utils/time';

// ============================================================================
// In-Memory Relational Mock Store for Step 3 Payment & Reporting Integration Tests
// ============================================================================
const mockUsers = new Map<string, any>();
const mockFacilities = new Map<string, any>();
const mockTariffs = new Map<string, any>();
const mockMemberships = new Map<string, any>();
const mockSlotBookings = new Map<string, any>();
const mockAuthorityBlocks = new Map<string, any>();
const mockPayments = new Map<string, any>();
const mockAuditLogs: any[] = [];

function projectSelect(
  record: any,
  select?: Record<string, any>,
  include?: Record<string, any>
) {
  if (!record) return null;
  const copy = { ...record };

  if (include) {
    if (include.facility && copy.facility_id) {
      copy.facility = mockFacilities.get(copy.facility_id) ?? null;
    }
    if (include.user && copy.user_id) {
      const u = mockUsers.get(copy.user_id) ?? null;
      copy.user = u ? projectSelect(u, include.user.select) : null;
    }
    if (include.reviewed_by_officer) {
      const off = copy.reviewed_by_officer_id
        ? mockUsers.get(copy.reviewed_by_officer_id) ?? null
        : null;
      copy.reviewed_by_officer = off
        ? projectSelect(off, include.reviewed_by_officer.select)
        : null;
    }
    if (include.recorded_by_officer) {
      const off = copy.recorded_by_officer_id
        ? mockUsers.get(copy.recorded_by_officer_id) ?? null
        : null;
      copy.recorded_by_officer = off
        ? projectSelect(off, include.recorded_by_officer.select)
        : null;
    }
    if (include.officer) {
      const off = copy.officer_id ? mockUsers.get(copy.officer_id) ?? null : null;
      copy.officer = off ? projectSelect(off, include.officer.select) : null;
    }
  }

  if (!select) return copy;

  const projected: Record<string, any> = {};
  for (const key of Object.keys(select)) {
    if (select[key]) projected[key] = copy[key];
  }
  return projected;
}

function matchesMembershipWhere(m: any, where?: any): boolean {
  if (!where) return true;
  if (where.id && m.id !== where.id) return false;
  if (where.pass_code && m.pass_code !== where.pass_code) return false;
  if (where.user_id && m.user_id !== where.user_id) return false;
  if (where.facility_id && m.facility_id !== where.facility_id) return false;
  if (where.session_window && m.session_window !== where.session_window) return false;
  if (where.status) {
    if (typeof where.status === 'string' && m.status !== where.status) return false;
    if (where.status.in && !where.status.in.includes(m.status)) return false;
  }
  return true;
}

function matchesSlotBookingWhere(b: any, where?: any): boolean {
  if (!where) return true;
  if (where.id && b.id !== where.id) return false;
  if (where.booking_code && b.booking_code !== where.booking_code) return false;
  if (where.user_id && b.user_id !== where.user_id) return false;
  if (where.facility_id && b.facility_id !== where.facility_id) return false;
  if (where.booking_date && b.booking_date.getTime() !== where.booking_date.getTime()) {
    return false;
  }
  if (where.status) {
    if (typeof where.status === 'string' && b.status !== where.status) return false;
    if (where.status.in && !where.status.in.includes(b.status)) return false;
  }
  if (where.court_partition) {
    if (
      typeof where.court_partition === 'string' &&
      b.court_partition !== where.court_partition
    ) {
      return false;
    }
    if (
      where.court_partition.in &&
      !where.court_partition.in.includes(b.court_partition)
    ) {
      return false;
    }
  }
  return true;
}

function matchesPaymentWhere(p: any, where?: any): boolean {
  if (!where) return true;
  if (where.id && p.id !== where.id) return false;
  if (where.receipt_no && p.receipt_no !== where.receipt_no) return false;
  if (where.user_id && p.user_id !== where.user_id) return false;
  if (where.reference_type && p.reference_type !== where.reference_type) return false;
  if (where.reference_id && p.reference_id !== where.reference_id) return false;
  if (where.payment_mode && p.payment_mode !== where.payment_mode) return false;
  if (where.status && p.status !== where.status) return false;
  return true;
}

function matchesAuditLogWhere(a: any, where?: any): boolean {
  if (!where) return true;
  if (where.action_category && a.action_category !== where.action_category) return false;
  if (where.officer_id && a.officer_id !== where.officer_id) return false;
  if (where.target_ref_id && a.target_ref_id !== where.target_ref_id) return false;
  return true;
}

vi.mock('../src/config/database', () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(async ({ where, select }: any) => {
        let found: any = null;
        if (where.id) {
          found = mockUsers.get(where.id) ?? null;
        } else if (where.username) {
          for (const u of mockUsers.values()) {
            if (u.username === where.username) {
              found = u;
              break;
            }
          }
        }
        return projectSelect(found, select);
      }),
    },

    facility: {
      findUnique: vi.fn(async ({ where, include }: any) => {
        let found: any = null;
        if (where.id) {
          found = mockFacilities.get(where.id) ?? null;
        } else if (where.code) {
          for (const f of mockFacilities.values()) {
            if (f.code === where.code) {
              found = f;
              break;
            }
          }
        }
        return projectSelect(found, undefined, include);
      }),
    },

    tariff: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) return mockTariffs.get(where.id) ?? null;
        if (where.uq_tariff_facility_category_type) {
          const { facility_id, user_category, booking_type } =
            where.uq_tariff_facility_category_type;
          for (const t of mockTariffs.values()) {
            if (
              t.facility_id === facility_id &&
              t.user_category === user_category &&
              t.booking_type === booking_type
            ) {
              return { ...t };
            }
          }
        }
        return null;
      }),
    },

    membership: {
      findUnique: vi.fn(async ({ where, select, include }: any) => {
        let found: any = null;
        if (where.id) {
          found = mockMemberships.get(where.id) ?? null;
        } else if (where.pass_code) {
          for (const m of mockMemberships.values()) {
            if (m.pass_code === where.pass_code) {
              found = m;
              break;
            }
          }
        }
        return projectSelect(found, select, include);
      }),
      findFirst: vi.fn(async ({ where, select, include }: any) => {
        for (const m of mockMemberships.values()) {
          if (matchesMembershipWhere(m, where)) {
            return projectSelect(m, select, include);
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, select, include }: any) => {
        return Array.from(mockMemberships.values())
          .filter((m) => matchesMembershipWhere(m, where))
          .map((m) => projectSelect(m, select, include));
      }),
      count: vi.fn(async ({ where }: any) => {
        return Array.from(mockMemberships.values()).filter((m) =>
          matchesMembershipWhere(m, where)
        ).length;
      }),
      create: vi.fn(async ({ data, select, include }: any) => {
        const record = {
          id: `10000000-0000-4000-8000-${String(mockMemberships.size + 1).padStart(12, '0')}`,
          pass_code: data.pass_code,
          user_id: data.user_id,
          facility_id: data.facility_id,
          duration_months: data.duration_months,
          start_date: data.start_date ?? null,
          end_date: data.end_date ?? null,
          session_window: data.session_window,
          govt_service_proof_url: data.govt_service_proof_url ?? null,
          status: data.status ?? MembershipStatus.PENDING_APPROVAL,
          reviewed_by_officer_id: data.reviewed_by_officer_id ?? null,
          officer_remarks: data.officer_remarks ?? null,
          created_at: new Date(),
        };
        mockMemberships.set(record.id, record);
        return projectSelect(record, select, include);
      }),
      update: vi.fn(async ({ where, data, select, include }: any) => {
        const existing = mockMemberships.get(where.id);
        if (!existing) throw new Error('Membership not found');
        const updated = { ...existing, ...data };
        mockMemberships.set(updated.id, updated);
        return projectSelect(updated, select, include);
      }),
    },

    slotBooking: {
      findUnique: vi.fn(async ({ where, select, include }: any) => {
        let found: any = null;
        if (where.id) {
          found = mockSlotBookings.get(where.id) ?? null;
        } else if (where.booking_code) {
          for (const b of mockSlotBookings.values()) {
            if (b.booking_code === where.booking_code) {
              found = b;
              break;
            }
          }
        }
        return projectSelect(found, select, include);
      }),
      findFirst: vi.fn(async ({ where, select, include }: any) => {
        for (const b of mockSlotBookings.values()) {
          if (matchesSlotBookingWhere(b, where)) {
            return projectSelect(b, select, include);
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, select, include }: any) => {
        return Array.from(mockSlotBookings.values())
          .filter((b) => matchesSlotBookingWhere(b, where))
          .map((b) => projectSelect(b, select, include));
      }),
      create: vi.fn(async ({ data, select, include }: any) => {
        const record = {
          id: `20000000-0000-4000-8000-${String(mockSlotBookings.size + 1).padStart(12, '0')}`,
          booking_code: data.booking_code,
          user_id: data.user_id,
          facility_id: data.facility_id,
          booking_date: data.booking_date,
          start_time: data.start_time,
          end_time: data.end_time,
          court_partition: data.court_partition ?? CourtPartition.FULL,
          total_amount: data.total_amount,
          status: data.status ?? SlotBookingStatus.PENDING_PAYMENT,
          created_at: new Date(),
        };
        mockSlotBookings.set(record.id, record);
        return projectSelect(record, select, include);
      }),
      update: vi.fn(async ({ where, data, select, include }: any) => {
        const existing = mockSlotBookings.get(where.id);
        if (!existing) throw new Error('SlotBooking not found');
        const updated = { ...existing, ...data };
        mockSlotBookings.set(updated.id, updated);
        return projectSelect(updated, select, include);
      }),
    },

    authorityBlock: {
      findMany: vi.fn(async () => Array.from(mockAuthorityBlocks.values())),
    },

    payment: {
      findUnique: vi.fn(async ({ where, select, include }: any) => {
        let found: any = null;
        if (where.id) {
          found = mockPayments.get(where.id) ?? null;
        } else if (where.receipt_no) {
          for (const p of mockPayments.values()) {
            if (p.receipt_no === where.receipt_no) {
              found = p;
              break;
            }
          }
        }
        return projectSelect(found, select, include);
      }),
      findFirst: vi.fn(async ({ where, select, include }: any) => {
        for (const p of mockPayments.values()) {
          if (matchesPaymentWhere(p, where)) {
            return projectSelect(p, select, include);
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where, select, include }: any) => {
        return Array.from(mockPayments.values())
          .filter((p) => matchesPaymentWhere(p, where))
          .map((p) => projectSelect(p, select, include));
      }),
      create: vi.fn(async ({ data, select, include }: any) => {
        const record = {
          id: `50000000-0000-4000-8000-${String(mockPayments.size + 1).padStart(12, '0')}`,
          receipt_no: data.receipt_no,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          user_id: data.user_id,
          payment_mode: data.payment_mode,
          base_amount: data.base_amount,
          gst_amount: data.gst_amount,
          total_amount: data.total_amount,
          status: data.status ?? PaymentStatus.SETTLED,
          recorded_by_officer_id: data.recorded_by_officer_id ?? null,
          created_at: new Date(),
        };
        mockPayments.set(record.id, record);
        return projectSelect(record, select, include);
      }),
    },

    auditLog: {
      findMany: vi.fn(async ({ where, select, include }: any) => {
        return mockAuditLogs
          .filter((a) => matchesAuditLogWhere(a, where))
          .map((a) => projectSelect(a, select, include));
      }),
      create: vi.fn(async ({ data }: any) => {
        const entry = {
          id: `40000000-0000-4000-8000-${String(mockAuditLogs.length + 1).padStart(12, '0')}`,
          ...data,
          created_at: new Date(),
        };
        mockAuditLogs.push(entry);
        return entry;
      }),
    },

    $queryRaw: vi.fn(async () => []),

    $transaction: vi.fn(async (callback: any) => {
      return callback(prismaMock);
    }),
  };

  return { prisma: prismaMock };
});

import app from '../src/app';

// ============================================================================
// Seed Helper for Step 3 Payment & Financial Reporting Test Environment
// ============================================================================
const FACILITY_IDS = {
  SYNTHETIC_TRACK: 'fac00000-0000-4000-8000-000000000001',
  FOOTBALL_GROUND: 'fac00000-0000-4000-8000-000000000002',
  POLICE_TURF: 'fac00000-0000-4000-8000-000000000003',
  BADMINTON_COURT: 'fac00000-0000-4000-8000-000000000004',
};

const USER_IDS = {
  ADMIN: '11111111-1111-4111-8111-111111111111',
  PUBLIC_PRIYA: '22222222-2222-4222-8222-222222222222',
  GOVT_ANAND: '44444444-4444-4444-8444-444444444444',
};

async function resetAndSeedMockDatabase() {
  mockUsers.clear();
  mockFacilities.clear();
  mockTariffs.clear();
  mockMemberships.clear();
  mockSlotBookings.clear();
  mockAuthorityBlocks.clear();
  mockPayments.clear();
  mockAuditLogs.length = 0;

  // 1. Seed 4 Facilities
  mockFacilities.set(FACILITY_IDS.SYNTHETIC_TRACK, {
    id: FACILITY_IDS.SYNTHETIC_TRACK,
    code: FacilityCode.SYNTHETIC_TRACK,
    name: 'Kannur City Police 8-Lane Synthetic Athletic Track',
    operating_start: parseTimeToDate('05:00'),
    operating_end: parseTimeToDate('22:00'),
    slot_duration_mins: 60,
    daily_user_hour_cap: 2,
    monthly_member_cap: 300,
    is_partitionable: false,
  });

  mockFacilities.set(FACILITY_IDS.FOOTBALL_GROUND, {
    id: FACILITY_IDS.FOOTBALL_GROUND,
    code: FacilityCode.FOOTBALL_GROUND,
    name: 'Kannur Police Parade & Natural Turf Football Ground',
    operating_start: parseTimeToDate('05:00'),
    operating_end: parseTimeToDate('22:00'),
    slot_duration_mins: 60,
    daily_user_hour_cap: 4,
    monthly_member_cap: null,
    is_partitionable: false,
  });

  mockFacilities.set(FACILITY_IDS.POLICE_TURF, {
    id: FACILITY_IDS.POLICE_TURF,
    code: FacilityCode.POLICE_TURF,
    name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
    operating_start: parseTimeToDate('05:00'),
    operating_end: parseTimeToDate('22:00'),
    slot_duration_mins: 60,
    daily_user_hour_cap: 2,
    monthly_member_cap: null,
    is_partitionable: true,
  });

  mockFacilities.set(FACILITY_IDS.BADMINTON_COURT, {
    id: FACILITY_IDS.BADMINTON_COURT,
    code: FacilityCode.BADMINTON_COURT,
    name: 'Kannur Police Indoor Wooden Badminton Court Complex',
    operating_start: parseTimeToDate('05:00'),
    operating_end: parseTimeToDate('22:00'),
    slot_duration_mins: 60,
    daily_user_hour_cap: 2,
    monthly_member_cap: null,
    is_partitionable: false,
  });

  // 2. Seed Tariffs (18% GST)
  const tariffsSeed = [
    {
      facility_id: FACILITY_IDS.SYNTHETIC_TRACK,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '500.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.SYNTHETIC_TRACK,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '250.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.FOOTBALL_GROUND,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '2000.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.POLICE_TURF,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '1400.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.POLICE_TURF,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.HALF_COURT,
      base_price: '800.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.BADMINTON_COURT,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '250.00',
      gst_percent: '18.00',
      is_active: true,
    },
  ];

  tariffsSeed.forEach((t, idx) => {
    const id = `tar00000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`;
    mockTariffs.set(id, { id, ...t });
  });

  // 3. Seed Users
  const passwordHash = await hashPassword('TestPass@2026!');

  mockUsers.set(USER_IDS.ADMIN, {
    id: USER_IDS.ADMIN,
    username: 'insp_rajeev',
    password_hash: passwordHash,
    full_name: 'Inspector Rajeev Kumar (Sports Admin)',
    email: 'insp.rajeev@kannurpolice.kerala.gov.in',
    role: UserRole.STAFF_ADMIN,
    account_status: AccountStatus.ACTIVE,
    ban_reason: null,
    profile_photo_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  mockUsers.set(USER_IDS.PUBLIC_PRIYA, {
    id: USER_IDS.PUBLIC_PRIYA,
    username: 'priya_mohan',
    password_hash: passwordHash,
    full_name: 'Priya Mohan',
    email: 'priya@example.org',
    role: UserRole.PUBLIC,
    account_status: AccountStatus.ACTIVE,
    ban_reason: null,
    profile_photo_url: 'https://intranet.kannurpolice.kerala.gov.in/photos/priya.jpg',
    created_at: new Date(),
    updated_at: new Date(),
  });

  mockUsers.set(USER_IDS.GOVT_ANAND, {
    id: USER_IDS.GOVT_ANAND,
    username: 'si_anand',
    password_hash: passwordHash,
    full_name: 'SI Anandakrishnan M.',
    email: 'anand@kerala.gov.in',
    role: UserRole.GOVT_PERSONNEL,
    account_status: AccountStatus.ACTIVE,
    ban_reason: null,
    profile_photo_url: 'https://intranet.kannurpolice.kerala.gov.in/photos/anand.jpg',
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function loginAs(username: string): Promise<string[]> {
  const res = await request(app).post('/api/auth/login').send({
    username,
    password: 'TestPass@2026!',
  });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'];
}

function getFutureDateStr(daysAhead = 2): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return formatDateOnly(d);
}

// ============================================================================
// STEP 3 PAYMENT & FINANCIAL REPORTING TEST SUITE
// ============================================================================
describe('Step 3: Payment Settlement, Pass Activation, Office Receipts & Financial/Audit Reporting', () => {
  beforeEach(async () => {
    await resetAndSeedMockDatabase();
  });

  // --------------------------------------------------------------------------
  // 1. ONLINE PAYMENT SETTLEMENT & OFFLINE OFFICE RECEIPT ACTIVATION
  // --------------------------------------------------------------------------
  describe('1. Payment Settlement & Office Receipts (/api/payments & /api/admin/payments)', () => {
    it('settles an APPROVED_UNPAID membership via ONLINE_GATEWAY, verifies 18% GST, and activates pass with start_date and end_date', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const adminCookie = await loginAs('insp_rajeev');

      // 1a. Apply for 2-month Synthetic Track membership (PUBLIC: 500 * 2 = 1000 base + 180 GST = 1180.00)
      const applyRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', priyaCookie)
        .send({
          duration_months: 2,
          session_window: 'MORNING',
        });

      expect(applyRes.status).toBe(201);
      const membershipId = applyRes.body.data.membership.id;
      const passCode = applyRes.body.data.membership.pass_code;

      // 1b. Attempting to settle while still PENDING_APPROVAL must fail with 400
      const prematureSettle = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: membershipId,
        });

      expect(prematureSettle.status).toBe(400);
      expect(prematureSettle.body.errorCode).toBe('MEMBERSHIP_NOT_ELIGIBLE_FOR_PAYMENT');

      // 1c. Officer approves the membership -> APPROVED_UNPAID
      const reviewRes = await request(app)
        .post(`/api/admin/memberships/${membershipId}/review`)
        .set('Cookie', adminCookie)
        .send({
          action: 'APPROVE',
          officer_remarks: 'Approved for Synthetic Track pass.',
        });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.membership.status).toBe('APPROVED_UNPAID');

      // 1d. Attempting to settle with tampered GST calculation must fail with 400
      const invalidGstRes = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: membershipId,
          base_amount: 1000,
          gst_amount: 100, // Wrong GST (not 18%)
          total_amount: 1100,
        });
      expect(invalidGstRes.status).toBe(400);
      expect(invalidGstRes.body.errorCode).toBe('INVALID_GST_CALCULATION');

      // 1e. Settle online with valid 18% GST breakdown
      const settleRes = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: membershipId,
          base_amount: 1000,
          gst_amount: 180,
          total_amount: 1180,
        });

      expect(settleRes.status).toBe(201);
      expect(Object.keys(settleRes.body.data).sort()).toEqual([
        'membership',
        'payment',
        'receipt',
      ]);
      const { payment, receipt, membership } = settleRes.body.data;
      expect(payment.receipt_no).toMatch(/^RCP-KCP-2026-\d{4}$/);
      expect(payment.payment_mode).toBe(PaymentMode.ONLINE_GATEWAY);
      expect(payment.status).toBe(PaymentStatus.SETTLED);
      expect(payment.base_amount).toBe('1000.00');
      expect(payment.gst_amount).toBe('180.00');
      expect(payment.total_amount).toBe('1180.00');

      expect(receipt).toBeDefined();
      expect(receipt.booking_or_pass_code).toBe(passCode);
      expect(receipt.pricing_breakdown).toEqual({
        base_fee: '1000.00',
        concession_discount: '0.00',
        concession_percent: 0,
        taxable_subtotal: '1000.00',
        gst_rate: 18,
        gst_amount: '180.00',
        final_total_paid: '1180.00',
      });

      expect(membership.status).toBe(MembershipStatus.ACTIVE);
      expect(membership.start_date_formatted).toBe(formatDateOnly(new Date()));

      // Verify end_date is 2 months after start_date
      const expectedEnd = new Date(`${membership.start_date_formatted}T00:00:00.000Z`);
      expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 2);
      expect(membership.end_date_formatted).toBe(formatDateOnly(expectedEnd));

      // Duplicate payment attempt must fail with 409 ALREADY_PAID
      const dupSettle = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: membershipId,
        });
      expect(dupSettle.status).toBe(409);
      expect(dupSettle.body.errorCode).toBe('ALREADY_PAID');
    });

    it('settles a PENDING_PAYMENT slot booking via ONLINE_GATEWAY and records an offline OFFICE_RECEIPT with immutable audit log', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const govtCookie = await loginAs('si_anand');
      const adminCookie = await loginAs('insp_rajeev');
      const bookingDate = getFutureDateStr(2);

      // 1. Priya reserves POLICE_TURF HALF_A (PUBLIC: 800 base + 144 GST = 944.00) and settles online
      const reservePriya = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'POLICE_TURF',
          booking_date: bookingDate,
          start_time: '06:00',
          end_time: '07:00',
          court_partition: 'HALF_A',
        });
      expect(reservePriya.status).toBe(201);
      const priyaBooking = reservePriya.body.data.booking;
      expect(priyaBooking.status).toBe('PENDING_PAYMENT');

      const settleBookingRes = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'SLOT_BOOKING',
          reference_id: priyaBooking.id,
        });

      expect(settleBookingRes.status).toBe(201);
      expect(Object.keys(settleBookingRes.body.data).sort()).toEqual([
        'payment',
        'receipt',
        'slot_booking',
      ]);
      expect(settleBookingRes.body.data.payment.receipt_no).toMatch(
        /^RCP-KCP-2026-\d{4}$/
      );
      expect(settleBookingRes.body.data.payment.base_amount).toBe('800.00');
      expect(settleBookingRes.body.data.payment.gst_amount).toBe('144.00');
      expect(settleBookingRes.body.data.payment.total_amount).toBe('944.00');
      expect(settleBookingRes.body.data.slot_booking.status).toBe(
        SlotBookingStatus.CONFIRMED
      );

      // 2. Govt user reserves BADMINTON_COURT (GOVT_PERSONNEL: 250 base + 45 GST = 295.00)
      //    and STAFF_ADMIN settles via POST /api/admin/payments/office-receipt
      const reserveAnand = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', govtCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: bookingDate,
          start_time: '08:00',
          end_time: '09:00',
        });
      expect(reserveAnand.status).toBe(201);
      const anandBooking = reserveAnand.body.data.booking;

      const auditLogsBefore = mockAuditLogs.length;

      const officeReceiptRes = await request(app)
        .post('/api/admin/payments/office-receipt')
        .set('Cookie', adminCookie)
        .send({
          reference_type: 'SLOT_BOOKING',
          reference_id: anandBooking.id,
          treasury_challan_no: 'TR-KNR-2026-8891',
          remarks: 'Treasury challan verified at District Police Sports Office.',
        });

      expect(officeReceiptRes.status).toBe(201);
      expect(Object.keys(officeReceiptRes.body.data).sort()).toEqual([
        'payment',
        'receipt',
        'slot_booking',
      ]);
      const officePayment = officeReceiptRes.body.data.payment;
      expect(officePayment.payment_mode).toBe(PaymentMode.OFFICE_RECEIPT);
      expect(officePayment.recorded_by_officer_id).toBe(USER_IDS.ADMIN);
      expect(officePayment.base_amount).toBe('250.00');
      expect(officePayment.gst_amount).toBe('45.00');
      expect(officePayment.total_amount).toBe('295.00');
      expect(officeReceiptRes.body.data.receipt.booking_or_pass_code).toBe(
        anandBooking.booking_code
      );
      expect(officeReceiptRes.body.data.receipt.pricing_breakdown).toEqual({
        base_fee: '250.00',
        concession_discount: '0.00',
        concession_percent: 0,
        taxable_subtotal: '250.00',
        gst_rate: 18,
        gst_amount: '45.00',
        final_total_paid: '295.00',
      });
      expect(officeReceiptRes.body.data.slot_booking.status).toBe(
        SlotBookingStatus.CONFIRMED
      );

      // Verify immutable audit_logs entry was created
      expect(mockAuditLogs.length).toBe(auditLogsBefore + 1);
      const lastAudit = mockAuditLogs[mockAuditLogs.length - 1];
      expect(lastAudit.action_category).toBe('OFFICE_RECEIPT_PAYMENT');
      expect(lastAudit.target_ref_id).toBe(officePayment.receipt_no);
      expect(lastAudit.details.treasury_challan_no).toBe('TR-KNR-2026-8891');

      // 3. Verify GET /api/payments/my & GET /api/admin/payments KPIs
      const myPaymentsRes = await request(app)
        .get('/api/payments/my')
        .set('Cookie', priyaCookie);
      expect(myPaymentsRes.status).toBe(200);
      expect(myPaymentsRes.body.data.payments).toHaveLength(1);
      expect(myPaymentsRes.body.data.payments[0].pass_or_booking_code).toBe(
        priyaBooking.booking_code
      );

      const adminPaymentsRes = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', adminCookie);
      expect(adminPaymentsRes.status).toBe(200);
      expect(adminPaymentsRes.body.data.summary.total_transactions).toBe(2);
      expect(adminPaymentsRes.body.data.summary.online_gateway_revenue).toBe('944.00');
      expect(adminPaymentsRes.body.data.summary.office_receipt_revenue).toBe('295.00');
      expect(adminPaymentsRes.body.data.summary.total_revenue).toBe('1239.00');
    });

    it('calculates 50% GOVT_PERSONNEL concession and 18% GST breakdown on Synthetic Track membership settlement', async () => {
      const govtCookie = await loginAs('si_anand');
      const adminCookie = await loginAs('insp_rajeev');

      const applyRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', govtCookie)
        .send({
          duration_months: 1,
          session_window: 'MORNING',
          govt_service_proof_url: 'https://intranet.kannurpolice.kerala.gov.in/docs/anand-id.pdf',
        });
      expect(applyRes.status).toBe(201);
      const membershipId = applyRes.body.data.membership.id;

      await request(app)
        .post(`/api/admin/memberships/${membershipId}/review`)
        .set('Cookie', adminCookie)
        .send({
          action: 'APPROVE',
          officer_remarks: 'Verified departmental service certificate.',
        })
        .expect(200);

      const settleRes = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', govtCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: membershipId,
        });

      expect(settleRes.status).toBe(201);
      expect(settleRes.body.data.receipt.pricing_breakdown).toEqual({
        base_fee: '500.00',
        concession_discount: '250.00',
        concession_percent: 50,
        taxable_subtotal: '250.00',
        gst_rate: 18,
        gst_amount: '45.00',
        final_total_paid: '295.00',
      });
      expect(settleRes.body.data.membership.status).toBe(MembershipStatus.ACTIVE);
    });
  });

  // --------------------------------------------------------------------------
  // 2. FINANCIAL REPORT AGGREGATION & IMMUTABLE AUDIT LOGS (JSON & CSV)
  // --------------------------------------------------------------------------
  describe('2. Financial Report Aggregation & Immutable Audit Ledger (/api/admin/reports/financial & /api/admin/audit-logs)', () => {
    it('aggregates revenue by facility, payment_mode, and user_category, and exports both financial reports and audit_logs as JSON and CSV', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const govtCookie = await loginAs('si_anand');
      const adminCookie = await loginAs('insp_rajeev');
      const bookingDate = getFutureDateStr(3);

      // 1. PUBLIC Synthetic Track Membership settled via ONLINE_GATEWAY (1 month: 500 + 90 GST = 590.00)
      const pubApply = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', priyaCookie)
        .send({ duration_months: 1, session_window: 'MORNING' });
      const pubMemId = pubApply.body.data.membership.id;

      await request(app)
        .post(`/api/admin/memberships/${pubMemId}/review`)
        .set('Cookie', adminCookie)
        .send({ action: 'APPROVE', officer_remarks: 'Approved.' });

      await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({ reference_type: 'MEMBERSHIP', reference_id: pubMemId });

      // 2. GOVT_PERSONNEL Badminton Court Slot settled via OFFICE_RECEIPT (1 hr: 250 + 45 GST = 295.00)
      const govtBook = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', govtCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: bookingDate,
          start_time: '09:00',
          end_time: '10:00',
        });
      const govtBookingId = govtBook.body.data.booking.id;

      await request(app)
        .post('/api/admin/payments/office-receipt')
        .set('Cookie', adminCookie)
        .send({
          reference_type: 'SLOT_BOOKING',
          reference_id: govtBookingId,
          treasury_challan_no: 'TR-KNR-2026-9900',
        });

      // 3. Query JSON Financial Report
      const finJsonRes = await request(app)
        .get('/api/admin/reports/financial')
        .set('Cookie', adminCookie);

      expect(finJsonRes.status).toBe(200);
      const report = finJsonRes.body.data;
      expect(report.overall_summary.transaction_count).toBe(2);
      expect(report.overall_summary.base_amount).toBe('750.00');
      expect(report.overall_summary.gst_amount).toBe('135.00');
      expect(report.overall_summary.total_amount).toBe('885.00');

      expect(report.by_facility.SYNTHETIC_TRACK.total_amount).toBe('590.00');
      expect(report.by_facility.BADMINTON_COURT.total_amount).toBe('295.00');
      expect(report.by_facility.POLICE_TURF.total_amount).toBe('0.00');

      expect(report.by_payment_mode.ONLINE_GATEWAY.total_amount).toBe('590.00');
      expect(report.by_payment_mode.OFFICE_RECEIPT.total_amount).toBe('295.00');

      expect(report.by_user_category.PUBLIC.total_amount).toBe('590.00');
      expect(report.by_user_category.GOVT_PERSONNEL.total_amount).toBe('295.00');

      // 4. Query CSV Financial Report (?format=csv)
      const finCsvRes = await request(app)
        .get('/api/admin/reports/financial?format=csv')
        .set('Cookie', adminCookie);

      expect(finCsvRes.status).toBe(200);
      expect(finCsvRes.headers['content-type']).toContain('text/csv');
      expect(finCsvRes.text).toContain(
        'receipt_no,created_at,facility_code,reference_type,pass_or_booking_code,user_category,payment_mode,base_amount,gst_amount,total_amount,status'
      );
      expect(finCsvRes.text).toContain('SYNTHETIC_TRACK');
      expect(finCsvRes.text).toContain('BADMINTON_COURT');

      // 5. Query JSON & CSV Audit Logs (/api/admin/audit-logs)
      const auditJsonRes = await request(app)
        .get('/api/admin/audit-logs?action_category=OFFICE_RECEIPT_PAYMENT')
        .set('Cookie', adminCookie);

      expect(auditJsonRes.status).toBe(200);
      expect(auditJsonRes.body.data.audit_logs).toHaveLength(1);
      expect(auditJsonRes.body.data.audit_logs[0].action_category).toBe(
        'OFFICE_RECEIPT_PAYMENT'
      );

      const auditCsvRes = await request(app)
        .get('/api/admin/audit-logs?format=csv')
        .set('Cookie', adminCookie);

      expect(auditCsvRes.status).toBe(200);
      expect(auditCsvRes.headers['content-type']).toContain('text/csv');
      expect(auditCsvRes.text).toContain(
        'id,created_at,officer_id,officer_username,action_category,target_ref_id,action_description,ip_address,details_json'
      );
      expect(auditCsvRes.text).toContain('OFFICE_RECEIPT_PAYMENT');
      expect(auditCsvRes.text).toContain('MEMBERSHIP_REVIEW');

      // 6. Verify strict compliance guard rejects mobile/OTP/Government ID fields on Step 3 endpoints
      const prohibitedRes = await request(app)
        .post('/api/payments/settle')
        .set('Cookie', priyaCookie)
        .send({
          reference_type: 'MEMBERSHIP',
          reference_id: pubMemId,
          mobile_number: '9876543210',
        });

      expect(prohibitedRes.status).toBe(400);
      expect(prohibitedRes.body.errorCode).toBe('PROHIBITED_IDENTITY_OR_MOBILE_FIELD');
    });
  });

  // --------------------------------------------------------------------------
  // 3. REMOVED LEGACY ROUTES RETURN HTTP 404
  // --------------------------------------------------------------------------
  describe('3. Eliminated Legacy Entry Routes Return HTTP 404', () => {
    it('returns HTTP 404 Not Found for removed legacy gate verification endpoints', async () => {
      const adminCookie = await loginAs('insp_rajeev');
      const gatePrefix = ['/api', 'gate'].join('/');

      const verifyRes = await request(app)
        .post(`${gatePrefix}/verify`)
        .set('Cookie', adminCookie)
        .send({});
      expect(verifyRes.status).toBe(404);
      expect(verifyRes.body.errorCode).toBe('ROUTE_NOT_FOUND');

      const syncCacheRes = await request(app)
        .get(`${gatePrefix}/sync-cache`)
        .set('Cookie', adminCookie);
      expect(syncCacheRes.status).toBe(404);
      expect(syncCacheRes.body.errorCode).toBe('ROUTE_NOT_FOUND');

      const overrideRes = await request(app)
        .post(`${gatePrefix}/manual-override`)
        .set('Cookie', adminCookie)
        .send({});
      expect(overrideRes.status).toBe(404);
      expect(overrideRes.body.errorCode).toBe('ROUTE_NOT_FOUND');

      const batchSyncRes = await request(app)
        .post(`${gatePrefix}/batch-sync`)
        .set('Cookie', adminCookie)
        .send({});
      expect(batchSyncRes.status).toBe(404);
      expect(batchSyncRes.body.errorCode).toBe('ROUTE_NOT_FOUND');

      const adminLogsRes = await request(app)
        .get('/api/admin/gate-logs')
        .set('Cookie', adminCookie);
      expect(adminLogsRes.status).toBe(404);
      expect(adminLogsRes.body.errorCode).toBe('ROUTE_NOT_FOUND');
    });
  });
});
