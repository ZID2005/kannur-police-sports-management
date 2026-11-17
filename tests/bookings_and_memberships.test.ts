import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import {
  AccountStatus,
  BookingType,
  CourtPartition,
  FacilityCode,
  MembershipStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { parseTimeToDate } from '../src/utils/time';

// ============================================================================
// In-Memory Relational Mock Store for Step 2 Integration Tests
// ============================================================================
const mockUsers = new Map<string, any>();
const mockFacilities = new Map<string, any>();
const mockTariffs = new Map<string, any>();
const mockMemberships = new Map<string, any>();
const mockSlotBookings = new Map<string, any>();
const mockAuthorityBlocks = new Map<string, any>();
const mockAuditLogs: any[] = [];
const mockRawQueries: string[] = [];
const mockTransactionOptions: any[] = [];

function projectSelect(record: any, select?: Record<string, any>, include?: Record<string, any>) {
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
    if (include.created_by_officer) {
      const off = copy.created_by_officer_id
        ? mockUsers.get(copy.created_by_officer_id) ?? null
        : null;
      copy.created_by_officer = off
        ? projectSelect(off, include.created_by_officer.select)
        : null;
    }
    if (include.tariffs) {
      const allTariffs = Array.from(mockTariffs.values()).filter(
        (t) => t.facility_id === copy.id && (!include.tariffs.where?.is_active || t.is_active)
      );
      copy.tariffs = allTariffs;
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
    if (typeof where.court_partition === 'string' && b.court_partition !== where.court_partition) {
      return false;
    }
    if (where.court_partition.in && !where.court_partition.in.includes(b.court_partition)) {
      return false;
    }
  }
  return true;
}

function matchesAuthorityBlockWhere(blk: any, where?: any): boolean {
  if (!where) return true;
  if (where.id && blk.id !== where.id) return false;
  if (where.facility_id && blk.facility_id !== where.facility_id) return false;
  if (where.block_date && blk.block_date.getTime() !== where.block_date.getTime()) {
    return false;
  }
  if (where.is_active !== undefined && blk.is_active !== where.is_active) return false;
  if (where.court_partition) {
    if (
      typeof where.court_partition === 'string' &&
      blk.court_partition !== where.court_partition
    ) {
      return false;
    }
    if (where.court_partition.in && !where.court_partition.in.includes(blk.court_partition)) {
      return false;
    }
  }
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
        } else if (where.email) {
          for (const u of mockUsers.values()) {
            if (u.email && u.email === where.email) {
              found = u;
              break;
            }
          }
        }
        return projectSelect(found, select);
      }),
      create: vi.fn(async ({ data, select }: any) => {
        const now = new Date();
        const newUser = {
          id: `00000000-0000-4000-8000-${String(mockUsers.size + 1).padStart(12, '0')}`,
          username: data.username,
          password_hash: data.password_hash,
          full_name: data.full_name,
          email: data.email ?? null,
          role: data.role ?? UserRole.PUBLIC,
          account_status: data.account_status ?? AccountStatus.ACTIVE,
          ban_reason: data.ban_reason ?? null,
          profile_photo_url: data.profile_photo_url ?? null,
          created_at: now,
          updated_at: now,
        };
        mockUsers.set(newUser.id, newUser);
        return projectSelect(newUser, select);
      }),
      update: vi.fn(async ({ where, data, select }: any) => {
        const existing = mockUsers.get(where.id);
        if (!existing) throw new Error('User not found');
        const updated = {
          ...existing,
          ...data,
          updated_at: new Date(),
        };
        mockUsers.set(updated.id, updated);
        return projectSelect(updated, select);
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
      findMany: vi.fn(async ({ include }: any) => {
        return Array.from(mockFacilities.values()).map((f) =>
          projectSelect(f, undefined, include)
        );
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
          qr_token_hash: data.qr_token_hash ?? null,
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
          qr_token_hash: data.qr_token_hash ?? null,
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
      findUnique: vi.fn(async ({ where, select, include }: any) => {
        const found = where.id ? mockAuthorityBlocks.get(where.id) ?? null : null;
        return projectSelect(found, select, include);
      }),
      findMany: vi.fn(async ({ where, select, include }: any) => {
        return Array.from(mockAuthorityBlocks.values())
          .filter((blk) => matchesAuthorityBlockWhere(blk, where))
          .map((blk) => projectSelect(blk, select, include));
      }),
      create: vi.fn(async ({ data, select, include }: any) => {
        const record = {
          id: `30000000-0000-4000-8000-${String(mockAuthorityBlocks.size + 1).padStart(12, '0')}`,
          facility_id: data.facility_id,
          block_date: data.block_date,
          start_time: data.start_time,
          end_time: data.end_time,
          court_partition: data.court_partition ?? CourtPartition.FULL,
          internal_reason: data.internal_reason,
          created_by_officer_id: data.created_by_officer_id,
          is_active: data.is_active ?? true,
          created_at: new Date(),
        };
        mockAuthorityBlocks.set(record.id, record);
        return projectSelect(record, select, include);
      }),
      update: vi.fn(async ({ where, data, select, include }: any) => {
        const existing = mockAuthorityBlocks.get(where.id);
        if (!existing) throw new Error('AuthorityBlock not found');
        const updated = { ...existing, ...data };
        mockAuthorityBlocks.set(updated.id, updated);
        return projectSelect(updated, select, include);
      }),
    },

    auditLog: {
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

    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      mockRawQueries.push(sql.trim());
      return [];
    }),

    $transaction: vi.fn(async (callback: any, options?: any) => {
      if (options) {
        mockTransactionOptions.push(options);
      }
      return callback(prismaMock);
    }),
  };

  return { prisma: prismaMock };
});

import app from '../src/app';

// ============================================================================
// Seed Helper for Test Environment
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
  PUBLIC_RAHUL: '33333333-3333-4333-8333-333333333333',
  GOVT_ANAND: '44444444-4444-4444-8444-444444444444',
};

async function resetAndSeedMockDatabase() {
  mockUsers.clear();
  mockFacilities.clear();
  mockTariffs.clear();
  mockMemberships.clear();
  mockSlotBookings.clear();
  mockAuthorityBlocks.clear();
  mockAuditLogs.length = 0;
  mockRawQueries.length = 0;
  mockTransactionOptions.length = 0;

  // 1. Seed Facilities
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
      facility_id: FACILITY_IDS.FOOTBALL_GROUND,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '1200.00',
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
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '900.00',
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
      facility_id: FACILITY_IDS.POLICE_TURF,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.HALF_COURT,
      base_price: '500.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facility_id: FACILITY_IDS.BADMINTON_COURT,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '400.00',
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
    profile_photo_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  mockUsers.set(USER_IDS.PUBLIC_RAHUL, {
    id: USER_IDS.PUBLIC_RAHUL,
    username: 'rahul_nair',
    password_hash: passwordHash,
    full_name: 'Rahul Nair',
    email: 'rahul@example.org',
    role: UserRole.PUBLIC,
    account_status: AccountStatus.ACTIVE,
    ban_reason: null,
    profile_photo_url: null,
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
    profile_photo_url: null,
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

// ============================================================================
// TEST SUITE
// ============================================================================
describe('Step 2: Facilities, Synthetic Track Memberships, Hourly Slot Engine, Partitioning & Confidential Masking', () => {
  beforeEach(async () => {
    await resetAndSeedMockDatabase();
  });

  // --------------------------------------------------------------------------
  // 1. SYNTHETIC TRACK 300-MEMBER CAPACITY & OFFICER REVIEW WORKFLOW
  // --------------------------------------------------------------------------
  describe('1. Synthetic Track Membership Engine (/api/memberships & /api/admin/memberships)', () => {
    it('requires govt_service_proof_url for GOVT_PERSONNEL and generates KCP-GOV-2026-XXXX when provided', async () => {
      const govtCookie = await loginAs('si_anand');

      // Missing govt_service_proof_url -> 400
      const missingProofRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', govtCookie)
        .send({
          duration_months: 3,
          session_window: 'MORNING',
        });

      expect(missingProofRes.status).toBe(400);
      expect(missingProofRes.body.errorCode).toBe('GOVT_SERVICE_PROOF_REQUIRED');

      // Valid govt_service_proof_url -> 201 PENDING_APPROVAL
      const validRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', govtCookie)
        .send({
          duration_months: 3,
          session_window: 'MORNING',
          govt_service_proof_url: 'https://intranet.kannurpolice.kerala.gov.in/docs/si_anand_cert.pdf',
        });

      expect(validRes.status).toBe(201);
      const membership = validRes.body.data.membership;
      expect(membership.pass_code).toMatch(/^KCP-GOV-2026-\d{4}$/);
      expect(membership.status).toBe('PENDING_APPROVAL');
      expect(membership.payment_locked).toBe(true);
      // Govt tariff: 250 * 3 = 750 + 18% GST (135) = 885.00
      expect(membership.calculated_tariff.base_amount).toBe('750.00');
      expect(membership.calculated_tariff.gst_amount).toBe('135.00');
      expect(membership.calculated_tariff.total_amount).toBe('885.00');
    });

    it('creates PUBLIC membership in PENDING_APPROVAL, prevents duplicates, and unlocks APPROVED_UNPAID upon officer approval with audit log', async () => {
      const publicCookie = await loginAs('priya_mohan');
      const adminCookie = await loginAs('insp_rajeev');

      // Apply as PUBLIC for 2 months
      const applyRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', publicCookie)
        .send({
          duration_months: 2,
          session_window: 'BOTH',
        });

      expect(applyRes.status).toBe(201);
      const created = applyRes.body.data.membership;
      expect(created.pass_code).toMatch(/^KCP-PUB-2026-\d{4}$/);
      expect(created.status).toBe('PENDING_APPROVAL');

      // Duplicate application while PENDING_APPROVAL must fail with 409
      const dupRes = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', publicCookie)
        .send({
          duration_months: 1,
          session_window: 'EVENING',
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.errorCode).toBe('DUPLICATE_OPEN_MEMBERSHIP');

      // Verify GET /api/memberships/my returns calculated tariff (500 * 2 = 1000 + 18% GST = 1180.00)
      const myBeforeRes = await request(app)
        .get('/api/memberships/my')
        .set('Cookie', publicCookie);

      expect(myBeforeRes.status).toBe(200);
      expect(myBeforeRes.body.data.memberships).toHaveLength(1);
      expect(myBeforeRes.body.data.memberships[0].calculated_tariff.total_amount).toBe('1180.00');
      expect(myBeforeRes.body.data.memberships[0].payment_locked).toBe(true);

      // Admin inspects dossier queue & single dossier
      const queueRes = await request(app)
        .get('/api/admin/memberships?status=PENDING_APPROVAL')
        .set('Cookie', adminCookie);

      expect(queueRes.status).toBe(200);
      expect(queueRes.body.data.memberships).toHaveLength(1);
      expect(queueRes.body.data.memberships[0].user.username).toBe('priya_mohan');

      const detailRes = await request(app)
        .get(`/api/admin/memberships/${created.id}`)
        .set('Cookie', adminCookie);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.membership.pass_code).toBe(created.pass_code);

      // Officer review with APPROVE transitions to APPROVED_UNPAID and records audit log
      const logsBefore = mockAuditLogs.length;
      const reviewRes = await request(app)
        .post(`/api/admin/memberships/${created.id}/review`)
        .set('Cookie', adminCookie)
        .send({
          action: 'APPROVE',
          officer_remarks: 'Identity and applicant profile verified by Sports Admin.',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.membership.status).toBe('APPROVED_UNPAID');
      expect(reviewRes.body.data.membership.payment_unlocked).toBe(true);
      expect(reviewRes.body.data.membership.officer_remarks).toBe(
        'Identity and applicant profile verified by Sports Admin.'
      );

      expect(mockAuditLogs.length).toBe(logsBefore + 1);
      const lastLog = mockAuditLogs[mockAuditLogs.length - 1];
      expect(lastLog.action_category).toBe('MEMBERSHIP_REVIEW');
      expect(lastLog.target_ref_id).toBe(created.pass_code);
      expect(lastLog.details.new_status).toBe('APPROVED_UNPAID');
    });

    it('strictly enforces the 300-member capacity cap (ACTIVE + APPROVED_UNPAID) with 409 CAPACITY_FULL', async () => {
      const publicCookie = await loginAs('priya_mohan');

      // Seed 300 active/approved_unpaid memberships on SYNTHETIC_TRACK
      for (let i = 1; i <= 300; i++) {
        const status = i <= 250 ? MembershipStatus.ACTIVE : MembershipStatus.APPROVED_UNPAID;
        const id = `cap00000-0000-4000-8000-${String(i).padStart(12, '0')}`;
        mockMemberships.set(id, {
          id,
          pass_code: `KCP-PUB-2026-${String(i).padStart(4, '0')}`,
          user_id: `usr00000-0000-4000-8000-${String(i).padStart(12, '0')}`,
          facility_id: FACILITY_IDS.SYNTHETIC_TRACK,
          duration_months: 1,
          start_date: new Date('2026-11-01T00:00:00.000Z'),
          end_date: new Date('2026-12-01T00:00:00.000Z'),
          session_window: 'MORNING',
          govt_service_proof_url: null,
          status,
          reviewed_by_officer_id: USER_IDS.ADMIN,
          officer_remarks: 'Pre-seeded member',
          qr_token_hash: null,
          created_at: new Date(),
        });
      }

      // 301st applicant must be rejected with 409 CAPACITY_FULL
      const res = await request(app)
        .post('/api/memberships/apply')
        .set('Cookie', publicCookie)
        .send({
          duration_months: 1,
          session_window: 'MORNING',
        });

      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('CAPACITY_FULL');
    });
  });

  // --------------------------------------------------------------------------
  // 2. POLICE TURF PARTITIONING & CONCURRENT DOUBLE-BOOKING RACE PROTECTION
  // --------------------------------------------------------------------------
  describe('2. Hourly Slot Engine, Police Turf Partitioning & Race Condition Protection', () => {
    it('lists all 4 facilities with operating hours, hour caps, partition rules, and category tariffs', async () => {
      const govtCookie = await loginAs('si_anand');

      const res = await request(app).get('/api/facilities').set('Cookie', govtCookie);
      expect(res.status).toBe(200);
      expect(res.body.data.facilities).toHaveLength(4);

      const turf = res.body.data.facilities.find((f: any) => f.code === 'POLICE_TURF');
      expect(turf).toBeDefined();
      expect(turf.is_partitionable).toBe(true);
      expect(turf.daily_user_hour_cap).toBe(2);
      expect(turf.partition_rules.supported_partitions).toEqual(['FULL', 'HALF_A', 'HALF_B']);
      expect(turf.user_category).toBe('GOVT_PERSONNEL');
    });

    it('enforces Police Turf partitioning: HALF_A booking blocks FULL & HALF_A while leaving HALF_B open; FULL booking blocks all three', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const rahulCookie = await loginAs('rahul_nair');
      const targetDate = '2026-12-10';

      // 1. Priya books HALF_A from 07:00 to 08:00 on POLICE_TURF
      const halfARes = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'POLICE_TURF',
          booking_date: targetDate,
          start_time: '07:00',
          end_time: '08:00',
          court_partition: 'HALF_A',
        });

      expect(halfARes.status).toBe(201);
      expect(halfARes.body.data.booking.booking_code).toMatch(/^KCP-SLT-2026-\d{4}$/);
      expect(halfARes.body.data.booking.status).toBe('PENDING_PAYMENT');
      // Public HALF_COURT tariff: 800 + 18% GST (144) = 944.00
      expect(halfARes.body.data.booking.total_amount).toBe('944.00');

      // 2. Check slot availability for 07:00 - 08:00: FULL and HALF_A must be ALREADY_BOOKED, HALF_B must be AVAILABLE
      const slotsAfterHalfA = await request(app).get(
        `/api/facilities/POLICE_TURF/slots?date=${targetDate}`
      );
      expect(slotsAfterHalfA.status).toBe(200);
      const slot07 = slotsAfterHalfA.body.data.slots.find(
        (s: any) => s.start_time === '07:00'
      );
      expect(slot07.partitions.FULL.status).toBe('ALREADY_BOOKED');
      expect(slot07.partitions.HALF_A.status).toBe('ALREADY_BOOKED');
      expect(slot07.partitions.HALF_B.status).toBe('AVAILABLE');

      // 3. Rahul tries to book FULL for 07:00 - 08:00 -> must fail with 409 SLOT_ALREADY_BOOKED
      const rahulFullConflict = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', rahulCookie)
        .send({
          facility_code: 'POLICE_TURF',
          booking_date: targetDate,
          start_time: '07:00',
          end_time: '08:00',
          court_partition: 'FULL',
        });
      expect(rahulFullConflict.status).toBe(409);
      expect(rahulFullConflict.body.errorCode).toBe('SLOT_ALREADY_BOOKED');

      // 4. Rahul books HALF_B for 07:00 - 08:00 -> succeeds!
      const rahulHalfB = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', rahulCookie)
        .send({
          facility_code: 'POLICE_TURF',
          booking_date: targetDate,
          start_time: '07:00',
          end_time: '08:00',
          court_partition: 'HALF_B',
        });
      expect(rahulHalfB.status).toBe(201);

      // 5. Priya books FULL for 09:00 - 10:00 -> blocks FULL, HALF_A, and HALF_B
      const fullRes = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'POLICE_TURF',
          booking_date: targetDate,
          start_time: '09:00',
          end_time: '10:00',
          court_partition: 'FULL',
        });
      expect(fullRes.status).toBe(201);
      // Public FULL_COURT tariff: 1400 + 18% GST (252) = 1652.00
      expect(fullRes.body.data.booking.total_amount).toBe('1652.00');

      const slotsAfterFull = await request(app).get(
        `/api/facilities/POLICE_TURF/slots?date=${targetDate}`
      );
      const slot09 = slotsAfterFull.body.data.slots.find(
        (s: any) => s.start_time === '09:00'
      );
      expect(slot09.status).toBe('ALREADY_BOOKED');
      expect(slot09.partitions.FULL.status).toBe('ALREADY_BOOKED');
      expect(slot09.partitions.HALF_A.status).toBe('ALREADY_BOOKED');
      expect(slot09.partitions.HALF_B.status).toBe('ALREADY_BOOKED');
    });

    it('prevents concurrent double-booking race conditions on overlapping partitions (FULL vs HALF_A) via Serializable transaction + SELECT FOR UPDATE', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const rahulCookie = await loginAs('rahul_nair');
      const raceDate = '2026-12-15';

      // Fire two overlapping reservations concurrently at the exact same instant (FULL vs HALF_A at 18:00)
      const [resA, resB] = await Promise.all([
        request(app).post('/api/bookings/reserve').set('Cookie', priyaCookie).send({
          facility_code: 'POLICE_TURF',
          booking_date: raceDate,
          start_time: '18:00',
          end_time: '19:00',
          court_partition: 'FULL',
        }),
        request(app).post('/api/bookings/reserve').set('Cookie', rahulCookie).send({
          facility_code: 'POLICE_TURF',
          booking_date: raceDate,
          start_time: '18:00',
          end_time: '19:00',
          court_partition: 'HALF_A',
        }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const failedRes = resA.status === 409 ? resA : resB;
      expect(failedRes.body.errorCode).toBe('SLOT_ALREADY_BOOKED');

      // Verify PostgreSQL Serializable isolation and SELECT ... FOR UPDATE were invoked
      expect(mockTransactionOptions.some((o) => o.isolationLevel === 'Serializable')).toBe(
        true
      );
      expect(mockRawQueries.some((q) => q.includes('FOR UPDATE'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. STRICT CONFIDENTIAL SLOT MASKING & OFFICER AUTHORITY BLOCKING
  // --------------------------------------------------------------------------
  describe('3. Confidential Slot Masking & Officer Authority Blocks', () => {
    it('masks authority_blocks as ALREADY_BOOKED on public API without leaking internal_reason, while exposing full details on admin API', async () => {
      const adminCookie = await loginAs('insp_rajeev');
      const priyaCookie = await loginAs('priya_mohan');
      const blockDate = '2026-12-20';
      const confidentialReason =
        'Confidential District Police Superintendent Security Drill & Tactical Inspection';

      // Officer blocks HALF_A on POLICE_TURF from 16:00 to 17:00
      const blockRes = await request(app)
        .post('/api/admin/slots/block')
        .set('Cookie', adminCookie)
        .send({
          facility_code: 'POLICE_TURF',
          block_date: blockDate,
          start_time: '16:00',
          end_time: '17:00',
          court_partition: 'HALF_A',
          internal_reason: confidentialReason,
        });

      expect(blockRes.status).toBe(201);
      const blockId = blockRes.body.data.authority_block.id;

      // 1. Public endpoint check: MUST return status: 'ALREADY_BOOKED' for FULL and HALF_A,
      //    AVAILABLE for HALF_B, and NEVER leak internal_reason or AUTHORITY_BLOCKED
      const publicSlotsRes = await request(app)
        .get(`/api/facilities/POLICE_TURF/slots?date=${blockDate}`)
        .set('Cookie', priyaCookie);

      expect(publicSlotsRes.status).toBe(200);
      const rawPublicJson = JSON.stringify(publicSlotsRes.body);
      expect(rawPublicJson).not.toContain(confidentialReason);
      expect(rawPublicJson).not.toContain('internal_reason');
      expect(rawPublicJson).not.toContain('AUTHORITY_BLOCKED');
      expect(rawPublicJson).not.toContain('insp_rajeev');

      const publicSlot16 = publicSlotsRes.body.data.slots.find(
        (s: any) => s.start_time === '16:00'
      );
      expect(publicSlot16.partitions.FULL.status).toBe('ALREADY_BOOKED');
      expect(publicSlot16.partitions.HALF_A.status).toBe('ALREADY_BOOKED');
      expect(publicSlot16.partitions.HALF_B.status).toBe('AVAILABLE');

      // 2. Admin endpoint check: MUST show AUTHORITY_BLOCKED and the exact internal_reason
      const adminSlotsRes = await request(app)
        .get(`/api/admin/facilities/POLICE_TURF/slots?date=${blockDate}`)
        .set('Cookie', adminCookie);

      expect(adminSlotsRes.status).toBe(200);
      const adminSlot16 = adminSlotsRes.body.data.slots.find(
        (s: any) => s.start_time === '16:00'
      );
      expect(adminSlot16.status).toBe('AUTHORITY_BLOCKED');
      expect(adminSlot16.internal_reason).toBe(confidentialReason);
      expect(adminSlot16.partitions.HALF_A.status).toBe('AUTHORITY_BLOCKED');
      expect(adminSlot16.partitions.HALF_A.internal_reason).toBe(confidentialReason);
      expect(adminSlot16.partitions.FULL.status).toBe('AUTHORITY_BLOCKED');
      expect(adminSlot16.partitions.HALF_B.status).toBe('AVAILABLE');

      // 3. Deactivate authority block via DELETE /api/admin/slots/block/:id
      const unblockRes = await request(app)
        .delete(`/api/admin/slots/block/${blockId}`)
        .set('Cookie', adminCookie);

      expect(unblockRes.status).toBe(200);
      expect(unblockRes.body.data.authority_block.is_active).toBe(false);

      // Verify slot is now AVAILABLE again on public endpoint
      const publicAfterUnblock = await request(app).get(
        `/api/facilities/POLICE_TURF/slots?date=${blockDate}`
      );
      const reopenedSlot16 = publicAfterUnblock.body.data.slots.find(
        (s: any) => s.start_time === '16:00'
      );
      expect(reopenedSlot16.partitions.FULL.status).toBe('AVAILABLE');
      expect(reopenedSlot16.partitions.HALF_A.status).toBe('AVAILABLE');
    });

    it('blocks authority slot block when a CONFIRMED citizen booking exists unless force_override: true is supplied', async () => {
      const adminCookie = await loginAs('insp_rajeev');
      const conflictDate = '2026-12-22';

      // Seed a CONFIRMED citizen booking on FOOTBALL_GROUND at 10:00 - 11:00
      const confirmedId = '20000000-0000-4000-8000-000000000999';
      mockSlotBookings.set(confirmedId, {
        id: confirmedId,
        booking_code: 'KCP-SLT-2026-9999',
        user_id: USER_IDS.PUBLIC_PRIYA,
        facility_id: FACILITY_IDS.FOOTBALL_GROUND,
        booking_date: new Date(`${conflictDate}T00:00:00.000Z`),
        start_time: parseTimeToDate('10:00'),
        end_time: parseTimeToDate('11:00'),
        court_partition: CourtPartition.FULL,
        total_amount: '2360.00',
        status: SlotBookingStatus.CONFIRMED,
        qr_token_hash: null,
        created_at: new Date(),
      });

      // Without force_override -> 409 CONFIRMED_BOOKING_CONFLICT
      const conflictRes = await request(app)
        .post('/api/admin/slots/block')
        .set('Cookie', adminCookie)
        .send({
          facility_code: 'FOOTBALL_GROUND',
          block_date: conflictDate,
          start_time: '10:00',
          end_time: '11:00',
          internal_reason: 'Emergency Helicopter Landing Readiness',
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.errorCode).toBe('CONFIRMED_BOOKING_CONFLICT');

      // With force_override: true -> 201 and cancels conflicting booking
      const overrideRes = await request(app)
        .post('/api/admin/slots/block')
        .set('Cookie', adminCookie)
        .send({
          facility_code: 'FOOTBALL_GROUND',
          block_date: conflictDate,
          start_time: '10:00',
          end_time: '11:00',
          internal_reason: 'Emergency Helicopter Landing Readiness',
          force_override: true,
        });

      expect(overrideRes.status).toBe(201);
      expect(overrideRes.body.data.authority_block.overridden_bookings).toContain(
        'KCP-SLT-2026-9999'
      );
      expect(mockSlotBookings.get(confirmedId).status).toBe(SlotBookingStatus.CANCELLED);
    });
  });

  // --------------------------------------------------------------------------
  // 4. DAILY USER HOUR CAP, BOOKING CANCELLATION & USER MODERATION + AUDIT LOGS
  // --------------------------------------------------------------------------
  describe('4. Daily User Hour Cap Enforcement, Cancellations & User Moderation Audit Logs', () => {
    it('enforces daily_user_hour_cap (2 hours/day on BADMINTON_COURT) and supports >4h booking cancellation', async () => {
      const priyaCookie = await loginAs('priya_mohan');
      const futureDate = '2027-01-15';

      // Hour 1 (06:00 - 07:00) -> 201
      const b1 = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: futureDate,
          start_time: '06:00',
          end_time: '07:00',
        });
      expect(b1.status).toBe(201);

      // Hour 2 (07:00 - 08:00) -> 201
      const b2 = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: futureDate,
          start_time: '07:00',
          end_time: '08:00',
        });
      expect(b2.status).toBe(201);

      // Hour 3 (08:00 - 09:00) on the same date -> rejected with 409 DAILY_HOUR_CAP_EXCEEDED
      const b3 = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', priyaCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: futureDate,
          start_time: '08:00',
          end_time: '09:00',
        });
      expect(b3.status).toBe(409);
      expect(b3.body.errorCode).toBe('DAILY_HOUR_CAP_EXCEEDED');

      // List user's bookings via GET /api/bookings/my
      const myBookingsRes = await request(app)
        .get('/api/bookings/my')
        .set('Cookie', priyaCookie);
      expect(myBookingsRes.status).toBe(200);
      expect(myBookingsRes.body.data.bookings).toHaveLength(2);
      expect(myBookingsRes.body.data.bookings[0].can_cancel).toBe(true);

      // Cancel future booking (> 4 hours prior to slot start) -> 200
      const bookingIdToCancel = b2.body.data.booking.id;
      const cancelRes = await request(app)
        .post(`/api/bookings/${bookingIdToCancel}/cancel`)
        .set('Cookie', priyaCookie)
        .send({ reason: 'Schedule change' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.booking.status).toBe('CANCELLED');
    });

    it('allows STAFF_ADMIN to moderate user status (PATCH /api/admin/users/:id/status) with mandatory ban_reason and records immutable audit logs', async () => {
      const adminCookie = await loginAs('insp_rajeev');
      const rahulCookie = await loginAs('rahul_nair');

      const auditCountBefore = mockAuditLogs.length;

      // Suspend Rahul's account with mandatory ban_reason
      const modRes = await request(app)
        .patch(`/api/admin/users/${USER_IDS.PUBLIC_RAHUL}/status`)
        .set('Cookie', adminCookie)
        .send({
          account_status: 'BANNED',
          ban_reason: 'Repeated violation of Kannur Police Turf footwear and conduct regulations.',
        });

      expect(modRes.status).toBe(200);
      expect(modRes.body.data.user.account_status).toBe('BANNED');
      expect(modRes.body.data.user.ban_reason).toContain('footwear and conduct regulations');

      // Verify audit log was recorded
      expect(mockAuditLogs.length).toBe(auditCountBefore + 1);
      const moderationLog = mockAuditLogs[mockAuditLogs.length - 1];
      expect(moderationLog.action_category).toBe('USER_STATUS_MODERATION');
      expect(moderationLog.target_ref_id).toBe(USER_IDS.PUBLIC_RAHUL);
      expect(moderationLog.details.new_status).toBe('BANNED');

      // Rahul's existing session cookie must immediately be blocked with 403 ACCOUNT_BANNED
      const blockedReserveRes = await request(app)
        .post('/api/bookings/reserve')
        .set('Cookie', rahulCookie)
        .send({
          facility_code: 'BADMINTON_COURT',
          booking_date: '2027-01-20',
          start_time: '10:00',
        });

      expect(blockedReserveRes.status).toBe(403);
      expect(blockedReserveRes.body.errorCode).toBe('ACCOUNT_BANNED');
    });
  });
});
