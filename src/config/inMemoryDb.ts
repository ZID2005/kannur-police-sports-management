import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingType,
  CourtPartition,
  FacilityCode,
  MembershipStatus,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
  VerificationType,
} from '@prisma/client';
import { AppError } from '../utils/AppError';
import { generateQrTokenHash } from '../utils/qrToken';
import { formatDateOnly, parseDateOnly, parseTimeToDate } from '../utils/time';

type AnyRecord = Record<string, any>;

function valuesMatch(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return a === b;
}

function matchesFilter(value: unknown, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (filter === null) return value === null;
  if (filter instanceof Date) {
    return value instanceof Date && value.getTime() === filter.getTime();
  }
  if (typeof filter === 'object') {
    const f = filter as AnyRecord;
    if ('in' in f && Array.isArray(f.in)) {
      if (!f.in.some((item) => valuesMatch(value, item))) return false;
    }
    if ('equals' in f && !valuesMatch(value, f.equals)) return false;
    if ('not' in f && valuesMatch(value, f.not)) return false;
    if ('contains' in f && typeof value === 'string') {
      const needle = String(f.contains);
      const hay = f.mode === 'insensitive' ? value.toLowerCase() : value;
      const target = f.mode === 'insensitive' ? needle.toLowerCase() : needle;
      if (!hay.includes(target)) return false;
    }
    const valComparable = value instanceof Date ? value.getTime() : value;
    if ('gte' in f) {
      const bound = f.gte instanceof Date ? f.gte.getTime() : f.gte;
      if ((valComparable as any) < bound) return false;
    }
    if ('gt' in f) {
      const bound = f.gt instanceof Date ? f.gt.getTime() : f.gt;
      if ((valComparable as any) <= bound) return false;
    }
    if ('lte' in f) {
      const bound = f.lte instanceof Date ? f.lte.getTime() : f.lte;
      if ((valComparable as any) > bound) return false;
    }
    if ('lt' in f) {
      const bound = f.lt instanceof Date ? f.lt.getTime() : f.lt;
      if ((valComparable as any) >= bound) return false;
    }
    return true;
  }
  return value === filter;
}

function matchesWhere(record: AnyRecord, where?: AnyRecord): boolean {
  if (!where) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (condition === undefined) continue;
    if (key === 'AND') {
      const clauses = Array.isArray(condition) ? condition : [condition];
      if (!clauses.every((c) => matchesWhere(record, c))) return false;
      continue;
    }
    if (key === 'OR') {
      const clauses = Array.isArray(condition) ? condition : [condition];
      if (!clauses.some((c) => matchesWhere(record, c))) return false;
      continue;
    }
    if (!matchesFilter(record[key], condition)) return false;
  }
  return true;
}

function compareField(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function sortRecords<T extends AnyRecord>(records: T[], orderBy?: AnyRecord | AnyRecord[]): T[] {
  if (!orderBy) return records;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...records].sort((left, right) => {
    for (const spec of specs) {
      for (const [field, dir] of Object.entries(spec)) {
        const cmp = compareField(left[field], right[field]);
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function selectFields(record: AnyRecord | null, select?: AnyRecord): AnyRecord | null {
  if (!record) return null;
  if (!select) return { ...record };
  const projected: AnyRecord = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (enabled) projected[key] = record[key];
  }
  return projected;
}

/**
 * In-memory Prisma-compatible data store seeded for local development
 * when `DATABASE_URL` is not configured.
 */
function createInMemoryPrisma() {
  const users = new Map<string, AnyRecord>();
  const facilities = new Map<string, AnyRecord>();
  const tariffs = new Map<string, AnyRecord>();
  const memberships = new Map<string, AnyRecord>();
  const slotBookings = new Map<string, AnyRecord>();
  const authorityBlocks = new Map<string, AnyRecord>();
  const payments = new Map<string, AnyRecord>();
  const gateLogs: AnyRecord[] = [];
  const auditLogs: AnyRecord[] = [];

  function resolveUserSelect(userId: string | null | undefined, spec?: AnyRecord) {
    if (!userId) return null;
    const found = users.get(userId) ?? null;
    return selectFields(found, spec?.select);
  }

  function projectRecord(
    record: AnyRecord | null,
    select?: AnyRecord,
    include?: AnyRecord
  ): AnyRecord | null {
    if (!record) return null;
    const copy: AnyRecord = { ...record };

    if (include) {
      if (include.facility && copy.facility_id) {
        const fac = facilities.get(copy.facility_id) ?? null;
        copy.facility = fac ? { ...fac } : null;
      }
      if (include.tariffs) {
        const tariffWhere =
          typeof include.tariffs === 'object' ? include.tariffs.where : undefined;
        copy.tariffs = Array.from(tariffs.values())
          .filter(
            (t) => t.facility_id === copy.id && matchesWhere(t, tariffWhere)
          )
          .map((t) => ({ ...t }));
      }
      if (include.user) {
        copy.user = resolveUserSelect(copy.user_id, include.user);
      }
      if (include.reviewed_by_officer) {
        copy.reviewed_by_officer = resolveUserSelect(
          copy.reviewed_by_officer_id,
          include.reviewed_by_officer
        );
      }
      if (include.created_by_officer) {
        copy.created_by_officer = resolveUserSelect(
          copy.created_by_officer_id,
          include.created_by_officer
        );
      }
      if (include.recorded_by_officer) {
        copy.recorded_by_officer = resolveUserSelect(
          copy.recorded_by_officer_id,
          include.recorded_by_officer
        );
      }
      if (include.verified_by_officer) {
        copy.verified_by_officer = resolveUserSelect(
          copy.verified_by_officer_id,
          include.verified_by_officer
        );
      }
      if (include.officer) {
        copy.officer = resolveUserSelect(copy.officer_id, include.officer);
      }
    }

    return selectFields(copy, select);
  }

  function seedInitialData() {
    const now = new Date();
    const todayStr = formatDateOnly(now);
    const todayDate = parseDateOnly(todayStr);
    const tomorrowObj = new Date(todayDate);
    tomorrowObj.setUTCDate(tomorrowObj.getUTCDate() + 1);
    const threeMonthsOut = new Date(todayDate);
    threeMonthsOut.setUTCMonth(threeMonthsOut.getUTCMonth() + 3);

    const ids = {
      admin: '11111111-1111-4111-8111-111111111111',
      gate: '55555555-5555-4555-8555-555555555555',
      priya: '22222222-2222-4222-8222-222222222222',
      anand: '44444444-4444-4444-8444-444444444444',
      arjun: '66666666-6666-4666-8666-666666666666',
      track: 'fac00000-0000-4000-8000-000000000001',
      football: 'fac00000-0000-4000-8000-000000000002',
      turf: 'fac00000-0000-4000-8000-000000000003',
      badminton: 'fac00000-0000-4000-8000-000000000004',
    };

    const seedUsers = [
      {
        id: ids.admin,
        username: 'insp_rajeev',
        password_hash: bcrypt.hashSync('KcpAdmin@2026!', 10),
        full_name: 'Inspector Rajeev Kumar (Sports Admin)',
        email: 'insp.rajeev@kannurpolice.kerala.gov.in',
        role: UserRole.STAFF_ADMIN,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
      },
      {
        id: ids.gate,
        username: 'hc_pradeep',
        password_hash: bcrypt.hashSync('KcpGate@2026!', 10),
        full_name: 'HC Pradeep V. (Gate Verification Officer)',
        email: 'hc.pradeep@kannurpolice.kerala.gov.in',
        role: UserRole.GATE_OFFICER,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
      },
      {
        id: ids.priya,
        username: 'priya_mohan',
        password_hash: bcrypt.hashSync('PriyaSports@2026!', 10),
        full_name: 'Priya Mohan',
        email: 'priya.mohan@example.org',
        role: UserRole.PUBLIC,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
      },
      {
        id: ids.anand,
        username: 'si_anand',
        password_hash: bcrypt.hashSync('AnandPolice@2026!', 10),
        full_name: 'SI Anandakrishnan M.',
        email: 'si.anand@kerala.gov.in',
        role: UserRole.GOVT_PERSONNEL,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
      },
      {
        id: ids.arjun,
        username: 'arjun_menon',
        password_hash: bcrypt.hashSync('ArjunSports@2026!', 10),
        full_name: 'Arjun Menon',
        email: 'arjun.menon@example.org',
        role: UserRole.PUBLIC,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
      },
    ];

    for (const u of seedUsers) {
      users.set(u.id, { ...u, created_at: now, updated_at: now });
    }

    const seedFacilities = [
      {
        id: ids.track,
        code: FacilityCode.SYNTHETIC_TRACK,
        name: 'Kannur City Police 8-Lane Synthetic Athletic Track',
        operating_start: parseTimeToDate('05:00'),
        operating_end: parseTimeToDate('22:00'),
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        monthly_member_cap: 300,
        is_partitionable: false,
      },
      {
        id: ids.football,
        code: FacilityCode.FOOTBALL_GROUND,
        name: 'Kannur Police Parade & Natural Turf Football Ground',
        operating_start: parseTimeToDate('05:00'),
        operating_end: parseTimeToDate('22:00'),
        slot_duration_mins: 60,
        daily_user_hour_cap: 4,
        monthly_member_cap: null,
        is_partitionable: false,
      },
      {
        id: ids.turf,
        code: FacilityCode.POLICE_TURF,
        name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
        operating_start: parseTimeToDate('05:00'),
        operating_end: parseTimeToDate('22:00'),
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        monthly_member_cap: null,
        is_partitionable: true,
      },
      {
        id: ids.badminton,
        code: FacilityCode.BADMINTON_COURT,
        name: 'Kannur Police Indoor Wooden Badminton Court Complex',
        operating_start: parseTimeToDate('05:00'),
        operating_end: parseTimeToDate('22:00'),
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        monthly_member_cap: null,
        is_partitionable: false,
      },
    ];

    for (const f of seedFacilities) {
      facilities.set(f.id, f);
    }

    const seedTariffs = [
      { facility_id: ids.track, user_category: UserCategory.PUBLIC, booking_type: BookingType.MONTHLY_PASS, base_price: '500.00', gst_percent: '18.00' },
      { facility_id: ids.track, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.MONTHLY_PASS, base_price: '250.00', gst_percent: '18.00' },
      { facility_id: ids.football, user_category: UserCategory.PUBLIC, booking_type: BookingType.FULL_COURT, base_price: '2000.00', gst_percent: '18.00' },
      { facility_id: ids.football, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.FULL_COURT, base_price: '1200.00', gst_percent: '18.00' },
      { facility_id: ids.turf, user_category: UserCategory.PUBLIC, booking_type: BookingType.FULL_COURT, base_price: '1400.00', gst_percent: '18.00' },
      { facility_id: ids.turf, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.FULL_COURT, base_price: '900.00', gst_percent: '18.00' },
      { facility_id: ids.turf, user_category: UserCategory.PUBLIC, booking_type: BookingType.HALF_COURT, base_price: '800.00', gst_percent: '18.00' },
      { facility_id: ids.turf, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.HALF_COURT, base_price: '500.00', gst_percent: '18.00' },
      { facility_id: ids.badminton, user_category: UserCategory.PUBLIC, booking_type: BookingType.FULL_COURT, base_price: '400.00', gst_percent: '18.00' },
      { facility_id: ids.badminton, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.FULL_COURT, base_price: '250.00', gst_percent: '18.00' },
      { facility_id: ids.badminton, user_category: UserCategory.PUBLIC, booking_type: BookingType.MONTHLY_PASS, base_price: '1000.00', gst_percent: '18.00' },
      { facility_id: ids.badminton, user_category: UserCategory.GOVT_PERSONNEL, booking_type: BookingType.MONTHLY_PASS, base_price: '600.00', gst_percent: '18.00' },
    ];

    seedTariffs.forEach((t, idx) => {
      const id = `tar00000-0000-4000-8000-${String(idx + 1).padStart(12, '0')}`;
      tariffs.set(id, { id, ...t, is_active: true });
    });

    const priyaPassId = '10000000-0000-4000-8000-000000000001';
    const priyaQrHash = generateQrTokenHash({
      passOrBookingCode: 'KCP-PUB-2026-1001',
      userId: ids.priya,
      facilityCode: FacilityCode.SYNTHETIC_TRACK,
    });

    memberships.set(priyaPassId, {
      id: priyaPassId,
      pass_code: 'KCP-PUB-2026-1001',
      user_id: ids.priya,
      facility_id: ids.track,
      duration_months: 3,
      start_date: todayDate,
      end_date: threeMonthsOut,
      session_window: 'MORNING',
      govt_service_proof_url: null,
      status: MembershipStatus.ACTIVE,
      reviewed_by_officer_id: ids.admin,
      officer_remarks: 'Verified identity documents and medical fitness certificate.',
      qr_token_hash: priyaQrHash,
      created_at: new Date(now.getTime() - 2 * 86400000),
    });

    const anandPassId = '10000000-0000-4000-8000-000000000002';
    memberships.set(anandPassId, {
      id: anandPassId,
      pass_code: 'KCP-GOV-2026-2001',
      user_id: ids.anand,
      facility_id: ids.track,
      duration_months: 6,
      start_date: null,
      end_date: null,
      session_window: 'BOTH',
      govt_service_proof_url: 'https://intranet.kannurpolice.kerala.gov.in/docs/si-anand-service.pdf',
      status: MembershipStatus.APPROVED_UNPAID,
      reviewed_by_officer_id: ids.admin,
      officer_remarks: 'Police department service certificate verified. Payment unlocked.',
      qr_token_hash: null,
      created_at: new Date(now.getTime() - 86400000),
    });

    const arjunPassId = '10000000-0000-4000-8000-000000000003';
    memberships.set(arjunPassId, {
      id: arjunPassId,
      pass_code: 'KCP-PUB-2026-1002',
      user_id: ids.arjun,
      facility_id: ids.track,
      duration_months: 1,
      start_date: null,
      end_date: null,
      session_window: 'EVENING',
      govt_service_proof_url: null,
      status: MembershipStatus.PENDING_APPROVAL,
      reviewed_by_officer_id: null,
      officer_remarks: null,
      qr_token_hash: null,
      created_at: new Date(now.getTime() - 3600000),
    });

    const turfBookingId = '20000000-0000-4000-8000-000000000001';
    const turfBookingQr = generateQrTokenHash({
      passOrBookingCode: 'KCP-SLT-2026-3001',
      userId: ids.priya,
      facilityCode: FacilityCode.POLICE_TURF,
    });

    slotBookings.set(turfBookingId, {
      id: turfBookingId,
      booking_code: 'KCP-SLT-2026-3001',
      user_id: ids.priya,
      facility_id: ids.turf,
      booking_date: todayDate,
      start_time: parseTimeToDate('18:00'),
      end_time: parseTimeToDate('19:00'),
      court_partition: CourtPartition.HALF_A,
      total_amount: '944.00',
      status: SlotBookingStatus.CONFIRMED,
      qr_token_hash: turfBookingQr,
      created_at: new Date(now.getTime() - 7200000),
    });

    const badmintonBookingId = '20000000-0000-4000-8000-000000000002';
    slotBookings.set(badmintonBookingId, {
      id: badmintonBookingId,
      booking_code: 'KCP-SLT-2026-3002',
      user_id: ids.anand,
      facility_id: ids.badminton,
      booking_date: tomorrowObj,
      start_time: parseTimeToDate('07:00'),
      end_time: parseTimeToDate('08:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '295.00',
      status: SlotBookingStatus.PENDING_PAYMENT,
      qr_token_hash: null,
      created_at: new Date(now.getTime() - 1800000),
    });

    const blockId = '30000000-0000-4000-8000-000000000001';
    authorityBlocks.set(blockId, {
      id: blockId,
      facility_id: ids.football,
      block_date: tomorrowObj,
      start_time: parseTimeToDate('06:00'),
      end_time: parseTimeToDate('07:00'),
      court_partition: CourtPartition.FULL,
      internal_reason: 'District Armed Reserve ceremonial parade rehearsal',
      created_by_officer_id: ids.admin,
      is_active: true,
      created_at: now,
    });

    payments.set('50000000-0000-4000-8000-000000000001', {
      id: '50000000-0000-4000-8000-000000000001',
      receipt_no: 'RCP-KCP-2026-4001',
      reference_type: PaymentReferenceType.MEMBERSHIP,
      reference_id: priyaPassId,
      user_id: ids.priya,
      payment_mode: PaymentMode.ONLINE_GATEWAY,
      base_amount: '1500.00',
      gst_amount: '270.00',
      total_amount: '1770.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: null,
      created_at: new Date(now.getTime() - 86400000),
    });

    payments.set('50000000-0000-4000-8000-000000000002', {
      id: '50000000-0000-4000-8000-000000000002',
      receipt_no: 'RCP-KCP-2026-4002',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: turfBookingId,
      user_id: ids.priya,
      payment_mode: PaymentMode.OFFICE_RECEIPT,
      base_amount: '800.00',
      gst_amount: '144.00',
      total_amount: '944.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: ids.admin,
      created_at: new Date(now.getTime() - 3600000),
    });

    gateLogs.push({
      id: '60000000-0000-4000-8000-000000000001',
      facility_id: ids.track,
      gate_name: 'Main Synthetic Track Gate A',
      user_id: ids.priya,
      pass_or_booking_code: 'KCP-PUB-2026-1001',
      verification_type: VerificationType.QR_AND_BIOMETRIC,
      stage1_qr_passed: true,
      stage2_biometric_passed: true,
      access_granted: true,
      failure_or_override_reason: null,
      verified_by_officer_id: ids.gate,
      scanned_at: new Date(now.getTime() - 3600000),
    });

    auditLogs.push({
      id: '40000000-0000-4000-8000-000000000001',
      officer_id: ids.admin,
      action_category: 'SYSTEM_SEED',
      action_description:
        'Initialized local in-memory Kannur City Police Sports Facilities database with 4 facilities, 12 tariffs, and demo accounts.',
      target_ref_id: ids.admin,
      details: {
        facilitiesSeeded: seedFacilities.map((f) => f.code),
        accountsSeeded: seedUsers.map((u) => u.username),
      },
      ip_address: '127.0.0.1',
      created_at: now,
    });
  }

  seedInitialData();

  const rejectAuditMutation = async (operation: string) => {
    throw new AppError(
      `SECURITY VIOLATION: audit_logs is append-only; ${operation} is strictly prohibited.`,
      403,
      'AUDIT_LOG_IMMUTABLE'
    );
  };

  const client: AnyRecord = {
    user: {
      findUnique: async ({ where, select }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = users.get(where.id) ?? null;
        else if (where?.username) {
          found = Array.from(users.values()).find((u) => u.username === where.username) ?? null;
        } else if (where?.email) {
          found =
            Array.from(users.values()).find((u) => u.email && u.email === where.email) ?? null;
        }
        return selectFields(found, select);
      },
      findMany: async ({ where, select, orderBy }: AnyRecord = {}) => {
        const list = Array.from(users.values()).filter((u) => matchesWhere(u, where));
        return sortRecords(list, orderBy).map((u) => selectFields(u, select));
      },
      create: async ({ data, select }: AnyRecord) => {
        const now = new Date();
        const record: AnyRecord = {
          id: crypto.randomUUID(),
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
        users.set(record.id, record);
        return selectFields(record, select);
      },
      update: async ({ where, data, select }: AnyRecord) => {
        const existing = users.get(where.id);
        if (!existing) throw new Error(`User '${where.id}' not found`);
        const updated = { ...existing, ...data, updated_at: new Date() };
        users.set(updated.id, updated);
        return selectFields(updated, select);
      },
    },

    facility: {
      findUnique: async ({ where, include, select }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = facilities.get(where.id) ?? null;
        else if (where?.code) {
          found = Array.from(facilities.values()).find((f) => f.code === where.code) ?? null;
        }
        return projectRecord(found, select, include);
      },
      findMany: async ({ where, include, select, orderBy }: AnyRecord = {}) => {
        const list = Array.from(facilities.values()).filter((f) => matchesWhere(f, where));
        return sortRecords(list, orderBy).map((f) => projectRecord(f, select, include));
      },
    },

    tariff: {
      findUnique: async ({ where }: AnyRecord) => {
        if (where?.id) return tariffs.get(where.id) ? { ...tariffs.get(where.id)! } : null;
        if (where?.uq_tariff_facility_category_type) {
          const { facility_id, user_category, booking_type } =
            where.uq_tariff_facility_category_type;
          const match = Array.from(tariffs.values()).find(
            (t) =>
              t.facility_id === facility_id &&
              t.user_category === user_category &&
              t.booking_type === booking_type
          );
          return match ? { ...match } : null;
        }
        return null;
      },
      findMany: async ({ where }: AnyRecord = {}) =>
        Array.from(tariffs.values())
          .filter((t) => matchesWhere(t, where))
          .map((t) => ({ ...t })),
    },

    membership: {
      findUnique: async ({ where, select, include }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = memberships.get(where.id) ?? null;
        else if (where?.pass_code) {
          found =
            Array.from(memberships.values()).find((m) => m.pass_code === where.pass_code) ?? null;
        } else if (where?.qr_token_hash) {
          found =
            Array.from(memberships.values()).find(
              (m) => m.qr_token_hash === where.qr_token_hash
            ) ?? null;
        }
        return projectRecord(found, select, include);
      },
      findFirst: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = sortRecords(
          Array.from(memberships.values()).filter((m) => matchesWhere(m, where)),
          orderBy
        );
        return list.length > 0 ? projectRecord(list[0], select, include) : null;
      },
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = Array.from(memberships.values()).filter((m) => matchesWhere(m, where));
        return sortRecords(list, orderBy).map((m) => projectRecord(m, select, include));
      },
      count: async ({ where }: AnyRecord = {}) =>
        Array.from(memberships.values()).filter((m) => matchesWhere(m, where)).length,
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
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
        memberships.set(record.id, record);
        return projectRecord(record, select, include);
      },
      update: async ({ where, data, select, include }: AnyRecord) => {
        const existing = memberships.get(where.id);
        if (!existing) throw new Error(`Membership '${where.id}' not found`);
        const updated = { ...existing, ...data };
        memberships.set(updated.id, updated);
        return projectRecord(updated, select, include);
      },
    },

    slotBooking: {
      findUnique: async ({ where, select, include }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = slotBookings.get(where.id) ?? null;
        else if (where?.booking_code) {
          found =
            Array.from(slotBookings.values()).find((b) => b.booking_code === where.booking_code) ??
            null;
        } else if (where?.qr_token_hash) {
          found =
            Array.from(slotBookings.values()).find(
              (b) => b.qr_token_hash === where.qr_token_hash
            ) ?? null;
        }
        return projectRecord(found, select, include);
      },
      findFirst: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = sortRecords(
          Array.from(slotBookings.values()).filter((b) => matchesWhere(b, where)),
          orderBy
        );
        return list.length > 0 ? projectRecord(list[0], select, include) : null;
      },
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = Array.from(slotBookings.values()).filter((b) => matchesWhere(b, where));
        return sortRecords(list, orderBy).map((b) => projectRecord(b, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
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
        slotBookings.set(record.id, record);
        return projectRecord(record, select, include);
      },
      update: async ({ where, data, select, include }: AnyRecord) => {
        const existing = slotBookings.get(where.id);
        if (!existing) throw new Error(`SlotBooking '${where.id}' not found`);
        const updated = { ...existing, ...data };
        slotBookings.set(updated.id, updated);
        return projectRecord(updated, select, include);
      },
    },

    authorityBlock: {
      findUnique: async ({ where, select, include }: AnyRecord) => {
        const found = where?.id ? authorityBlocks.get(where.id) ?? null : null;
        return projectRecord(found, select, include);
      },
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = Array.from(authorityBlocks.values()).filter((blk) =>
          matchesWhere(blk, where)
        );
        return sortRecords(list, orderBy).map((blk) => projectRecord(blk, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
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
        authorityBlocks.set(record.id, record);
        return projectRecord(record, select, include);
      },
      update: async ({ where, data, select, include }: AnyRecord) => {
        const existing = authorityBlocks.get(where.id);
        if (!existing) throw new Error(`AuthorityBlock '${where.id}' not found`);
        const updated = { ...existing, ...data };
        authorityBlocks.set(updated.id, updated);
        return projectRecord(updated, select, include);
      },
    },

    payment: {
      findUnique: async ({ where, select, include }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = payments.get(where.id) ?? null;
        else if (where?.receipt_no) {
          found =
            Array.from(payments.values()).find((p) => p.receipt_no === where.receipt_no) ?? null;
        }
        return projectRecord(found, select, include);
      },
      findFirst: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = sortRecords(
          Array.from(payments.values()).filter((p) => matchesWhere(p, where)),
          orderBy
        );
        return list.length > 0 ? projectRecord(list[0], select, include) : null;
      },
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = Array.from(payments.values()).filter((p) => matchesWhere(p, where));
        return sortRecords(list, orderBy).map((p) => projectRecord(p, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
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
        payments.set(record.id, record);
        return projectRecord(record, select, include);
      },
    },

    gateLog: {
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = gateLogs.filter((g) => matchesWhere(g, where));
        return sortRecords(list, orderBy).map((g) => projectRecord(g, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
          facility_id: data.facility_id,
          gate_name: data.gate_name,
          user_id: data.user_id ?? null,
          pass_or_booking_code: data.pass_or_booking_code,
          verification_type: data.verification_type,
          stage1_qr_passed: data.stage1_qr_passed,
          stage2_biometric_passed: data.stage2_biometric_passed,
          access_granted: data.access_granted,
          failure_or_override_reason: data.failure_or_override_reason ?? null,
          verified_by_officer_id: data.verified_by_officer_id,
          scanned_at: data.scanned_at ?? new Date(),
        };
        gateLogs.push(record);
        return projectRecord(record, select, include);
      },
    },

    auditLog: {
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = auditLogs.filter((a) => matchesWhere(a, where));
        return sortRecords(list, orderBy).map((a) => projectRecord(a, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const record: AnyRecord = {
          id: crypto.randomUUID(),
          officer_id: data.officer_id,
          action_category: data.action_category,
          action_description: data.action_description,
          target_ref_id: data.target_ref_id ?? null,
          details: data.details ?? {},
          ip_address: data.ip_address,
          created_at: new Date(),
        };
        auditLogs.push(record);
        return projectRecord(record, select, include);
      },
      update: () => rejectAuditMutation('UPDATE'),
      updateMany: () => rejectAuditMutation('UPDATE'),
      upsert: () => rejectAuditMutation('UPSERT'),
      delete: () => rejectAuditMutation('DELETE'),
      deleteMany: () => rejectAuditMutation('DELETE'),
    },

    $queryRaw: async () => [],
    $transaction: async (callback: (tx: AnyRecord) => Promise<unknown>) => callback(client),
    $disconnect: async () => undefined,
  };

  return client;
}

export const inMemoryPrisma = createInMemoryPrisma();
