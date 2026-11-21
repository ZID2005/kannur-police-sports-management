import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  AccountStatus,
  BookingType,
  CourtPartition,
  FacilityCode,
  Gender,
  MembershipStatus,
  PaymentMode,
  PaymentReferenceType,
  PaymentStatus,
  SlotBookingStatus,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { AppError } from '../utils/AppError';
import {
  formatDateOnly,
  formatDateToTime,
  minutesToTime,
  parseDateOnly,
  parseTimeToDate,
  timeToMinutes,
} from '../utils/time';

export type FacilityOperationalStatus = 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
export type ManagedSlotStatus = 'OPEN' | 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
export type FacilityBookingMode = 'MONTHLY_MEMBERSHIP_ONLY' | 'HOURLY_SLOTS';

export interface FacilitySlotRecord {
  id: string;
  facility_id: string;
  slot_date: string | null;
  start_time: Date;
  end_time: Date;
  max_capacity: number;
  status: ManagedSlotStatus;
  block_reason: string | null;
  court_partition: CourtPartition;
  created_at: Date;
  updated_at: Date;
}

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
export function createInMemoryPrisma() {
  const users = new Map<string, AnyRecord>();
  const facilities = new Map<string, AnyRecord>();
  const facilitySlots = new Map<string, FacilitySlotRecord>();
  const tariffs = new Map<string, AnyRecord>();
  const memberships = new Map<string, AnyRecord>();
  const slotBookings = new Map<string, AnyRecord>();
  const authorityBlocks = new Map<string, AnyRecord>();
  const payments = new Map<string, AnyRecord>();
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
      if (include.facility_slots) {
        const slotWhere =
          typeof include.facility_slots === 'object' ? include.facility_slots.where : undefined;
        copy.facility_slots = sortRecords(
          Array.from(facilitySlots.values()).filter(
            (s) => s.facility_id === copy.id && matchesWhere(s, slotWhere)
          ),
          { start_time: 'asc' }
        ).map((s) => ({ ...s }));
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
      if (include.officer) {
        copy.officer = resolveUserSelect(copy.officer_id, include.officer);
      }
    }

    return selectFields(copy, select);
  }

  function seedDefaultSlotsForFacility(fac: AnyRecord, facIndex: number, now: Date) {
    const startMins = timeToMinutes(formatDateToTime(fac.operating_start));
    const endMins = timeToMinutes(formatDateToTime(fac.operating_end));
    const step = fac.slot_duration_mins || 60;
    let slotSeq = 1;

    for (let current = startMins; current + step <= endMins; current += step) {
      const slotId = `51000000-0000-4000-8000-${String(facIndex).padStart(4, '0')}${String(slotSeq).padStart(8, '0')}`;
      facilitySlots.set(slotId, {
        id: slotId,
        facility_id: fac.id,
        slot_date: null,
        start_time: parseTimeToDate(minutesToTime(current)),
        end_time: parseTimeToDate(minutesToTime(current + step)),
        max_capacity: fac.max_capacity_per_slot ?? 1,
        status: 'OPEN',
        block_reason: null,
        court_partition: CourtPartition.FULL,
        created_at: now,
        updated_at: now,
      });
      slotSeq += 1;
    }
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
      priya: '22222222-2222-4222-8222-222222222222',
      anand: '44444444-4444-4444-8444-444444444444',
      arjun: '66666666-6666-4666-8666-666666666666',
      kavya: '77777777-7777-4777-8777-777777777777',
      deepak: '88888888-8888-4888-8888-888888888888',
      rahul: '99999999-9999-4999-8999-999999999999',
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
        gender: Gender.MALE,
        date_of_birth: '1984-06-12',
        parent_name: null,
        present_address: 'Police Officers Quarters, Block A-4',
        city_locality: 'Cantonment, Kannur',
        pin_code: '670013',
        permanent_address: 'Police Officers Quarters, Block A-4, Cantonment, Kannur 670013',
        designation: 'Inspector of Police (Sports Administration)',
        office_address: 'District Police Office, South Bazaar, Kannur 670002',
        track_purpose: null,
        is_registered_sportsperson: false,
        sport_discipline: null,
        association_details: null,
        created_at: new Date(now.getTime() - 30 * 86400000),
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
        gender: Gender.FEMALE,
        date_of_birth: '1995-04-14',
        parent_name: 'Mohanan Nair',
        present_address: 'Haritha Nagar, House No. 24, Near Pallikunnu Junction',
        city_locality: 'Pallikunnu, Kannur',
        pin_code: '670004',
        permanent_address: 'Haritha Nagar, House No. 24, Pallikunnu, Kannur 670004',
        designation: null,
        office_address: null,
        track_purpose: 'Daily fitness conditioning and 10K marathon preparation',
        is_registered_sportsperson: true,
        sport_discipline: 'Athletics',
        association_details: 'Kannur District Athletics Association',
        created_at: new Date(now.getTime() - 3 * 86400000),
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
        gender: Gender.MALE,
        date_of_birth: '1991-08-28',
        parent_name: 'Madhavan Kutty',
        present_address: 'AR Police Camp Quarters, Flat 12-B',
        city_locality: 'Thottada, Kannur',
        pin_code: '670007',
        permanent_address: 'Sree Nilayam, Talap Road, Kannur 670002',
        designation: 'Sub-Inspector of Police',
        office_address: 'Kannur Town Police Station, Fort Road, Kannur 670001',
        track_purpose: 'Departmental physical fitness conditioning and endurance running',
        is_registered_sportsperson: false,
        sport_discipline: null,
        association_details: null,
        created_at: new Date(now.getTime() - 2 * 86400000),
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
        gender: Gender.MALE,
        date_of_birth: '1998-11-05',
        parent_name: 'Ramesh Menon',
        present_address: 'Rose Villa, Civil Station Road',
        city_locality: 'South Bazaar, Kannur',
        pin_code: '670002',
        permanent_address: 'Rose Villa, Civil Station Road, South Bazaar, Kannur 670002',
        designation: null,
        office_address: null,
        track_purpose: 'Sprint drills and weekend turf football conditioning',
        is_registered_sportsperson: false,
        sport_discipline: null,
        association_details: null,
        created_at: new Date(now.getTime() - 18 * 3600000),
      },
      {
        id: ids.rahul,
        username: 'cpo_rahul',
        password_hash: bcrypt.hashSync('RahulPolice@2026!', 10),
        full_name: 'CPO Rahul Vijayan',
        email: 'rahul.v@kerala.gov.in',
        role: UserRole.GOVT_PERSONNEL,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
        gender: Gender.MALE,
        date_of_birth: '1996-02-19',
        parent_name: 'Vijayan P.',
        present_address: 'Police Barracks Annex, Room 8',
        city_locality: 'Burnassery, Kannur',
        pin_code: '670013',
        permanent_address: 'Kairali House, Chirakkal, Kannur 670011',
        designation: 'Civil Police Officer',
        office_address: 'Armed Reserve Camp, Kannur 670007',
        track_purpose: 'Police athletics trials and endurance training',
        is_registered_sportsperson: true,
        sport_discipline: '400m & Football',
        association_details: 'Kerala Police Sports Wing',
        created_at: new Date(now.getTime() - 5 * 3600000),
      },
      {
        id: ids.deepak,
        username: 'deepak_raj',
        password_hash: bcrypt.hashSync('DeepakSports@2026!', 10),
        full_name: 'Deepak Rajendran',
        email: 'deepak.raj@example.org',
        role: UserRole.PUBLIC,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
        gender: Gender.MALE,
        date_of_birth: '1993-09-22',
        parent_name: null,
        present_address: 'Green Park Apartments, 3rd Floor, Caltex Junction',
        city_locality: 'Thavakkara, Kannur',
        pin_code: '670002',
        permanent_address: 'Green Park Apartments, Thavakkara, Kannur 670002',
        designation: null,
        office_address: null,
        track_purpose: null,
        is_registered_sportsperson: false,
        sport_discipline: null,
        association_details: null,
        created_at: new Date(now.getTime() - 90 * 60000),
      },
      {
        id: ids.kavya,
        username: 'kavya_nair',
        password_hash: bcrypt.hashSync('KavyaSports@2026!', 10),
        full_name: 'Kavya S. Nair',
        email: 'kavya.nair@example.org',
        role: UserRole.PUBLIC,
        account_status: AccountStatus.ACTIVE,
        ban_reason: null,
        profile_photo_url: null,
        gender: Gender.FEMALE,
        date_of_birth: '1999-07-03',
        parent_name: 'Suresh Nair',
        present_address: 'Sea Breeze Lane, House No. 9',
        city_locality: 'Payyambalam, Kannur',
        pin_code: '670001',
        permanent_address: 'Sea Breeze Lane, House No. 9, Payyambalam, Kannur 670001',
        designation: null,
        office_address: null,
        track_purpose: 'Morning cardio and badminton agility workouts',
        is_registered_sportsperson: false,
        sport_discipline: null,
        association_details: null,
        created_at: new Date(now.getTime() - 25 * 60000),
      },
    ];

    for (const u of seedUsers) {
      users.set(u.id, { ...u, updated_at: u.created_at });
    }

    const seedFacilities = [
      {
        id: ids.track,
        code: FacilityCode.SYNTHETIC_TRACK,
        name: 'Kannur City Police 8-Lane Synthetic Athletic Track',
        category: 'Athletic Track',
        court_count: 8,
        court_unit_label: 'Lanes',
        operational_status: 'ACTIVE' as FacilityOperationalStatus,
        max_capacity_per_slot: 40,
        booking_mode: 'MONTHLY_MEMBERSHIP_ONLY' as FacilityBookingMode,
        description:
          '400m 8-lane synthetic athletic track at Kannur Armed Reserve Police Grounds. Monthly membership access across morning and evening conditioning windows with clean athletic footwear required.',
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
        category: 'Outdoor Grass Pitch',
        court_count: 1,
        court_unit_label: 'Full Pitch',
        operational_status: 'ACTIVE' as FacilityOperationalStatus,
        max_capacity_per_slot: 1,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Full 11-a-side natural turf football ground with stadium lighting towers. Available for club matches, community fixtures, and departmental training sessions.',
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
        category: 'Floodlit Artificial Turf',
        court_count: 2,
        court_unit_label: 'Half Courts',
        operational_status: 'ACTIVE' as FacilityOperationalStatus,
        max_capacity_per_slot: 2,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Floodlit artificial football turf supporting full 7-a-side bookings or dual independent 5-a-side half-court sessions. Turf shoes or flats required.',
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
        category: 'Indoor Court Complex',
        court_count: 4,
        court_unit_label: 'Courts',
        operational_status: 'ACTIVE' as FacilityOperationalStatus,
        max_capacity_per_slot: 4,
        booking_mode: 'HOURLY_SLOTS' as FacilityBookingMode,
        description:
          'Climate-controlled indoor maple wooden arena featuring 4 regulation badminton courts with anti-glare LED lighting. Non-marking court shoes mandatory.',
        operating_start: parseTimeToDate('05:00'),
        operating_end: parseTimeToDate('22:00'),
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        monthly_member_cap: null,
        is_partitionable: false,
      },
    ];

    seedFacilities.forEach((f, idx) => {
      facilities.set(f.id, f);
      seedDefaultSlotsForFacility(f, idx + 1, now);
    });

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
      track_purpose: 'Daily fitness conditioning and 10K marathon preparation',
      is_registered_sportsperson: true,
      sport_discipline: 'Athletics',
      association_details: 'Kannur District Athletics Association',
      declaration_accepted: true,
      status: MembershipStatus.ACTIVE,
      reviewed_by_officer_id: null,
      officer_remarks: 'Activated via self-service online GST checkout.',
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
      govt_service_proof_url: null,
      track_purpose: 'Departmental physical fitness conditioning and endurance running',
      is_registered_sportsperson: false,
      sport_discipline: null,
      association_details: null,
      declaration_accepted: true,
      status: MembershipStatus.APPROVED_UNPAID,
      reviewed_by_officer_id: null,
      officer_remarks: 'Ready for fee settlement.',
      created_at: new Date(now.getTime() - 86400000),
    });

    const turfBookingId = '20000000-0000-4000-8000-000000000001';

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
      created_at: new Date(now.getTime() - 1800000),
    });

    slotBookings.set('20000000-0000-4000-8000-000000000003', {
      id: '20000000-0000-4000-8000-000000000003',
      booking_code: 'KCP-SLT-2026-3003',
      user_id: ids.anand,
      facility_id: ids.football,
      booking_date: todayDate,
      start_time: parseTimeToDate('06:00'),
      end_time: parseTimeToDate('07:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '1416.00',
      status: SlotBookingStatus.CONFIRMED,
      created_at: new Date(now.getTime() - 5 * 3600000),
    });

    slotBookings.set('20000000-0000-4000-8000-000000000004', {
      id: '20000000-0000-4000-8000-000000000004',
      booking_code: 'KCP-SLT-2026-3004',
      user_id: ids.kavya,
      facility_id: ids.badminton,
      booking_date: todayDate,
      start_time: parseTimeToDate('08:00'),
      end_time: parseTimeToDate('09:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '472.00',
      status: SlotBookingStatus.CONFIRMED,
      created_at: new Date(now.getTime() - 4 * 3600000),
    });

    slotBookings.set('20000000-0000-4000-8000-000000000005', {
      id: '20000000-0000-4000-8000-000000000005',
      booking_code: 'KCP-SLT-2026-3005',
      user_id: ids.arjun,
      facility_id: ids.turf,
      booking_date: todayDate,
      start_time: parseTimeToDate('17:00'),
      end_time: parseTimeToDate('18:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '1652.00',
      status: SlotBookingStatus.CONFIRMED,
      created_at: new Date(now.getTime() - 3 * 3600000),
    });

    slotBookings.set('20000000-0000-4000-8000-000000000006', {
      id: '20000000-0000-4000-8000-000000000006',
      booking_code: 'KCP-SLT-2026-3006',
      user_id: ids.deepak,
      facility_id: ids.badminton,
      booking_date: todayDate,
      start_time: parseTimeToDate('19:00'),
      end_time: parseTimeToDate('20:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '472.00',
      status: SlotBookingStatus.CONFIRMED,
      created_at: new Date(now.getTime() - 90 * 60000),
    });

    slotBookings.set('20000000-0000-4000-8000-000000000007', {
      id: '20000000-0000-4000-8000-000000000007',
      booking_code: 'KCP-SLT-2026-3007',
      user_id: ids.rahul,
      facility_id: ids.football,
      booking_date: todayDate,
      start_time: parseTimeToDate('20:00'),
      end_time: parseTimeToDate('21:00'),
      court_partition: CourtPartition.FULL,
      total_amount: '1416.00',
      status: SlotBookingStatus.PENDING_PAYMENT,
      created_at: new Date(now.getTime() - 45 * 60000),
    });

    const blockId1 = '30000000-0000-4000-8000-000000000001';
    authorityBlocks.set(blockId1, {
      id: blockId1,
      facility_id: ids.football,
      block_date: tomorrowObj,
      start_time: parseTimeToDate('06:00'),
      end_time: parseTimeToDate('07:00'),
      court_partition: CourtPartition.FULL,
      internal_reason: 'District Armed Reserve ceremonial parade rehearsal',
      block_type: 'RESERVED_DEPARTMENT' as ManagedSlotStatus,
      created_by_officer_id: ids.admin,
      is_active: true,
      created_at: now,
    });

    const blockId2 = '30000000-0000-4000-8000-000000000002';
    authorityBlocks.set(blockId2, {
      id: blockId2,
      facility_id: ids.turf,
      block_date: todayDate,
      start_time: parseTimeToDate('10:00'),
      end_time: parseTimeToDate('11:00'),
      court_partition: CourtPartition.FULL,
      internal_reason: 'Routine turf brushing and net tension inspection',
      block_type: 'BLOCKED_MAINTENANCE' as ManagedSlotStatus,
      created_by_officer_id: ids.admin,
      is_active: true,
      created_at: now,
    });

    const blockId3 = '30000000-0000-4000-8000-000000000003';
    authorityBlocks.set(blockId3, {
      id: blockId3,
      facility_id: ids.turf,
      block_date: todayDate,
      start_time: parseTimeToDate('05:00'),
      end_time: parseTimeToDate('06:00'),
      court_partition: CourtPartition.FULL,
      internal_reason: 'Kannur Armed Reserve morning squad fitness drill',
      block_type: 'RESERVED_DEPARTMENT' as ManagedSlotStatus,
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
      created_at: new Date(now.getTime() - 28 * 3600000),
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
      created_at: new Date(now.getTime() - 6 * 3600000),
    });

    payments.set('50000000-0000-4000-8000-000000000003', {
      id: '50000000-0000-4000-8000-000000000003',
      receipt_no: 'RCP-KCP-2026-4003',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: '20000000-0000-4000-8000-000000000003',
      user_id: ids.anand,
      payment_mode: PaymentMode.ONLINE_GATEWAY,
      base_amount: '1200.00',
      gst_amount: '216.00',
      total_amount: '1416.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: null,
      created_at: new Date(now.getTime() - 5 * 3600000),
    });

    payments.set('50000000-0000-4000-8000-000000000004', {
      id: '50000000-0000-4000-8000-000000000004',
      receipt_no: 'RCP-KCP-2026-4004',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: '20000000-0000-4000-8000-000000000004',
      user_id: ids.kavya,
      payment_mode: PaymentMode.ONLINE_GATEWAY,
      base_amount: '400.00',
      gst_amount: '72.00',
      total_amount: '472.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: null,
      created_at: new Date(now.getTime() - 4 * 3600000),
    });

    payments.set('50000000-0000-4000-8000-000000000005', {
      id: '50000000-0000-4000-8000-000000000005',
      receipt_no: 'RCP-KCP-2026-4005',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: '20000000-0000-4000-8000-000000000005',
      user_id: ids.arjun,
      payment_mode: PaymentMode.ONLINE_GATEWAY,
      base_amount: '1400.00',
      gst_amount: '252.00',
      total_amount: '1652.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: null,
      created_at: new Date(now.getTime() - 3 * 3600000),
    });

    payments.set('50000000-0000-4000-8000-000000000006', {
      id: '50000000-0000-4000-8000-000000000006',
      receipt_no: 'RCP-KCP-2026-4006',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: '20000000-0000-4000-8000-000000000006',
      user_id: ids.deepak,
      payment_mode: PaymentMode.OFFICE_RECEIPT,
      base_amount: '400.00',
      gst_amount: '72.00',
      total_amount: '472.00',
      status: PaymentStatus.SETTLED,
      recorded_by_officer_id: ids.admin,
      created_at: new Date(now.getTime() - 90 * 60000),
    });

    payments.set('50000000-0000-4000-8000-000000000007', {
      id: '50000000-0000-4000-8000-000000000007',
      receipt_no: 'RCP-KCP-2026-4007',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: '20000000-0000-4000-8000-000000000007',
      user_id: ids.rahul,
      payment_mode: PaymentMode.ONLINE_GATEWAY,
      base_amount: '1200.00',
      gst_amount: '216.00',
      total_amount: '1416.00',
      status: PaymentStatus.PENDING_RECONCILIATION,
      recorded_by_officer_id: null,
      created_at: new Date(now.getTime() - 45 * 60000),
    });

    payments.set('50000000-0000-4000-8000-000000000008', {
      id: '50000000-0000-4000-8000-000000000008',
      receipt_no: 'RCP-KCP-2026-4008',
      reference_type: PaymentReferenceType.SLOT_BOOKING,
      reference_id: badmintonBookingId,
      user_id: ids.anand,
      payment_mode: PaymentMode.OFFICE_RECEIPT,
      base_amount: '250.00',
      gst_amount: '45.00',
      total_amount: '295.00',
      status: PaymentStatus.PENDING_RECONCILIATION,
      recorded_by_officer_id: ids.admin,
      created_at: new Date(now.getTime() - 25 * 60000),
    });

    const seededAuditEntries: AnyRecord[] = [
      {
        id: '40000000-0000-4000-8000-000000000001',
        officer_id: ids.admin,
        action_category: 'SYSTEM_SEED',
        action_description:
          'Initialized Kannur City Police Sports Facilities directory with 4 facilities, 12 tariff schedules, and recurring daily time slots.',
        target_ref_id: 'KCP-SPORTS-CORE',
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'SYSTEM',
          facilities_seeded: seedFacilities.map((f) => f.code),
          reason: 'Initial sports complex directory and tariff schedule bootstrap.',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 36 * 3600000),
      },
      {
        id: '40000000-0000-4000-8000-000000000002',
        officer_id: ids.admin,
        action_category: 'FACILITY_UPDATED',
        action_description:
          "Officer 'insp_rajeev' verified tariff schedule for 'Kannur Police Indoor Wooden Badminton Court Complex' (BADMINTON_COURT).",
        target_ref_id: FacilityCode.BADMINTON_COURT,
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'FACILITY',
          facility_id: ids.badminton,
          facility_code: FacilityCode.BADMINTON_COURT,
          facility_name: 'Kannur Police Indoor Wooden Badminton Court Complex',
          public_rate: 400,
          govt_rate: 250,
          updated_fields: ['public_rate', 'govt_rate', 'operating_hours'],
          reason: 'Confirmed Public (₹400/hr) and Govt/Police concession (₹250/hr) tariff rates.',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 18 * 3600000),
      },
      {
        id: '40000000-0000-4000-8000-000000000003',
        officer_id: ids.admin,
        action_category: 'FACILITY_SLOT_BLOCKED',
        action_description: `Officer 'insp_rajeev' marked slot 05:00-06:00 on 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)' (${todayStr}) as RESERVED_DEPARTMENT. Reason: Kannur Armed Reserve morning squad fitness drill`,
        target_ref_id: blockId3,
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'SLOT',
          block_id: blockId3,
          facility_code: FacilityCode.POLICE_TURF,
          facility_name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
          date: todayStr,
          start_time: '05:00',
          end_time: '06:00',
          block_type: 'RESERVED_DEPARTMENT',
          block_status: 'RESERVED_DEPARTMENT',
          reason: 'Kannur Armed Reserve morning squad fitness drill',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 8 * 3600000),
      },
      {
        id: '40000000-0000-4000-8000-000000000004',
        officer_id: ids.admin,
        action_category: 'FACILITY_SLOT_BLOCKED',
        action_description: `Officer 'insp_rajeev' marked slot 10:00-11:00 on 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)' (${todayStr}) as BLOCKED_MAINTENANCE. Reason: Routine turf brushing and net tension inspection`,
        target_ref_id: blockId2,
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'SLOT',
          block_id: blockId2,
          facility_code: FacilityCode.POLICE_TURF,
          facility_name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
          date: todayStr,
          start_time: '10:00',
          end_time: '11:00',
          block_type: 'BLOCKED_MAINTENANCE',
          block_status: 'BLOCKED_MAINTENANCE',
          reason: 'Routine turf brushing and net tension inspection',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 7 * 3600000),
      },
      {
        id: '40000000-0000-4000-8000-000000000005',
        officer_id: ids.admin,
        action_category: 'OFFICE_RECEIPT_PAYMENT',
        action_description:
          "Officer 'insp_rajeev' recorded OFFICE_RECEIPT 'RCP-KCP-2026-4002' (INR 944.00) for SLOT_BOOKING 'KCP-SLT-2026-3001'.",
        target_ref_id: 'RCP-KCP-2026-4002',
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'PAYMENT',
          receipt_no: 'RCP-KCP-2026-4002',
          pass_or_booking_code: 'KCP-SLT-2026-3001',
          facility_code: FacilityCode.POLICE_TURF,
          facility_name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
          payment_mode: PaymentMode.OFFICE_RECEIPT,
          base_amount: '800.00',
          gst_amount: '144.00',
          total_amount: '944.00',
          reason: 'Verified office receipt settlement for Police Turf half-court slot.',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 6 * 3600000),
      },
      {
        id: '40000000-0000-4000-8000-000000000006',
        officer_id: ids.admin,
        action_category: 'OFFICE_RECEIPT_PAYMENT',
        action_description:
          "Officer 'insp_rajeev' recorded OFFICE_RECEIPT 'RCP-KCP-2026-4006' (INR 472.00) for SLOT_BOOKING 'KCP-SLT-2026-3006'.",
        target_ref_id: 'RCP-KCP-2026-4006',
        details: {
          officer_username: 'insp_rajeev',
          officer_role: UserRole.STAFF_ADMIN,
          target_entity: 'PAYMENT',
          receipt_no: 'RCP-KCP-2026-4006',
          pass_or_booking_code: 'KCP-SLT-2026-3006',
          facility_code: FacilityCode.BADMINTON_COURT,
          facility_name: 'Kannur Police Indoor Wooden Badminton Court Complex',
          payment_mode: PaymentMode.OFFICE_RECEIPT,
          base_amount: '400.00',
          gst_amount: '72.00',
          total_amount: '472.00',
          reason: 'Recorded counter payment receipt for Indoor Badminton Court slot.',
        },
        ip_address: '127.0.0.1',
        created_at: new Date(now.getTime() - 90 * 60000),
      },
    ];

    for (const entry of seededAuditEntries) {
      auditLogs.push(
        Object.freeze({
          ...entry,
          details: Object.freeze({ ...(entry.details ?? {}) }),
        })
      );
    }
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
          gender: data.gender ?? null,
          date_of_birth: data.date_of_birth ?? null,
          parent_name: data.parent_name ?? null,
          present_address: data.present_address ?? null,
          city_locality: data.city_locality ?? null,
          pin_code: data.pin_code ?? null,
          permanent_address: data.permanent_address ?? null,
          designation: data.designation ?? null,
          office_address: data.office_address ?? null,
          track_purpose: data.track_purpose ?? null,
          is_registered_sportsperson: data.is_registered_sportsperson ?? false,
          sport_discipline: data.sport_discipline ?? null,
          association_details: data.association_details ?? null,
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
      create: async ({ data, include, select }: AnyRecord) => {
        const record: AnyRecord = {
          id: data.id ?? crypto.randomUUID(),
          code: data.code,
          name: data.name,
          category: data.category ?? 'Sports Facility',
          court_count: data.court_count ?? 1,
          court_unit_label: data.court_unit_label ?? 'Courts',
          operational_status: data.operational_status ?? 'ACTIVE',
          max_capacity_per_slot: data.max_capacity_per_slot ?? 1,
          booking_mode: data.booking_mode ?? 'HOURLY_SLOTS',
          description: data.description ?? '',
          operating_start: data.operating_start,
          operating_end: data.operating_end,
          slot_duration_mins: data.slot_duration_mins ?? 60,
          daily_user_hour_cap: data.daily_user_hour_cap ?? 2,
          monthly_member_cap: data.monthly_member_cap ?? null,
          is_partitionable: data.is_partitionable ?? false,
        };
        facilities.set(record.id, record);
        return projectRecord(record, select, include);
      },
      update: async ({ where, data, include, select }: AnyRecord) => {
        let existing: AnyRecord | undefined;
        if (where?.id) existing = facilities.get(where.id);
        else if (where?.code) {
          existing = Array.from(facilities.values()).find((f) => f.code === where.code);
        }
        if (!existing) throw new Error(`Facility '${where?.id ?? where?.code}' not found`);
        const updated = { ...existing, ...data };
        facilities.set(updated.id, updated);
        return projectRecord(updated, select, include);
      },
      delete: async ({ where }: AnyRecord) => {
        const existing = where?.id ? facilities.get(where.id) : null;
        if (!existing) throw new Error(`Facility '${where?.id}' not found`);
        facilities.delete(existing.id);
        return { ...existing };
      },
    },

    facilitySlot: {
      findUnique: async ({ where, include, select }: AnyRecord) => {
        const found = where?.id ? facilitySlots.get(where.id) ?? null : null;
        return projectRecord(found, select, include);
      },
      findMany: async ({ where, include, select, orderBy }: AnyRecord = {}) => {
        const list = Array.from(facilitySlots.values()).filter((s) => matchesWhere(s, where));
        return sortRecords(list, orderBy ?? { start_time: 'asc' }).map((s) =>
          projectRecord(s, select, include)
        );
      },
      create: async ({ data, include, select }: AnyRecord) => {
        const now = new Date();
        const record: FacilitySlotRecord = {
          id: data.id ?? crypto.randomUUID(),
          facility_id: data.facility_id,
          slot_date: data.slot_date ?? null,
          start_time: data.start_time,
          end_time: data.end_time,
          max_capacity: data.max_capacity ?? 1,
          status: data.status ?? 'OPEN',
          block_reason: data.block_reason ?? null,
          court_partition: data.court_partition ?? CourtPartition.FULL,
          created_at: now,
          updated_at: now,
        };
        facilitySlots.set(record.id, record);
        return projectRecord(record, select, include);
      },
      update: async ({ where, data, include, select }: AnyRecord) => {
        const existing = facilitySlots.get(where.id);
        if (!existing) throw new Error(`FacilitySlot '${where.id}' not found`);
        const updated: FacilitySlotRecord = {
          ...existing,
          ...data,
          updated_at: new Date(),
        };
        facilitySlots.set(updated.id, updated);
        return projectRecord(updated, select, include);
      },
      delete: async ({ where }: AnyRecord) => {
        const existing = facilitySlots.get(where.id);
        if (!existing) throw new Error(`FacilitySlot '${where.id}' not found`);
        facilitySlots.delete(existing.id);
        return { ...existing };
      },
      deleteMany: async ({ where }: AnyRecord = {}) => {
        let count = 0;
        for (const [id, slot] of facilitySlots.entries()) {
          if (matchesWhere(slot, where)) {
            facilitySlots.delete(id);
            count += 1;
          }
        }
        return { count };
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
      create: async ({ data }: AnyRecord) => {
        const record: AnyRecord = {
          id: data.id ?? crypto.randomUUID(),
          facility_id: data.facility_id,
          user_category: data.user_category,
          booking_type: data.booking_type,
          base_price: data.base_price,
          gst_percent: data.gst_percent ?? '18.00',
          is_active: data.is_active ?? true,
        };
        tariffs.set(record.id, record);
        return { ...record };
      },
      update: async ({ where, data }: AnyRecord) => {
        const existing = tariffs.get(where.id);
        if (!existing) throw new Error(`Tariff '${where.id}' not found`);
        const updated = { ...existing, ...data };
        tariffs.set(updated.id, updated);
        return { ...updated };
      },
      upsert: async ({ where, update, create }: AnyRecord) => {
        const key = where?.uq_tariff_facility_category_type;
        const existing = key
          ? Array.from(tariffs.values()).find(
              (t) =>
                t.facility_id === key.facility_id &&
                t.user_category === key.user_category &&
                t.booking_type === key.booking_type
            )
          : where?.id
            ? tariffs.get(where.id)
            : undefined;
        if (existing) {
          const updated = { ...existing, ...update };
          tariffs.set(updated.id, updated);
          return { ...updated };
        }
        const record: AnyRecord = {
          id: crypto.randomUUID(),
          facility_id: create.facility_id,
          user_category: create.user_category,
          booking_type: create.booking_type,
          base_price: create.base_price,
          gst_percent: create.gst_percent ?? '18.00',
          is_active: create.is_active ?? true,
        };
        tariffs.set(record.id, record);
        return { ...record };
      },
    },

    membership: {
      findUnique: async ({ where, select, include }: AnyRecord) => {
        let found: AnyRecord | null = null;
        if (where?.id) found = memberships.get(where.id) ?? null;
        else if (where?.pass_code) {
          found =
            Array.from(memberships.values()).find((m) => m.pass_code === where.pass_code) ?? null;
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
          track_purpose: data.track_purpose ?? null,
          is_registered_sportsperson: data.is_registered_sportsperson ?? false,
          sport_discipline: data.sport_discipline ?? null,
          association_details: data.association_details ?? null,
          declaration_accepted: data.declaration_accepted ?? false,
          status: data.status ?? MembershipStatus.PENDING_APPROVAL,
          reviewed_by_officer_id: data.reviewed_by_officer_id ?? null,
          officer_remarks: data.officer_remarks ?? null,
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
          block_type: data.block_type ?? null,
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

    auditLog: {
      findMany: async ({ where, select, include, orderBy }: AnyRecord = {}) => {
        const list = auditLogs.filter((a) => matchesWhere(a, where));
        return sortRecords(list, orderBy).map((a) => projectRecord(a, select, include));
      },
      create: async ({ data, select, include }: AnyRecord) => {
        const safeDetails =
          data.details && typeof data.details === 'object'
            ? Object.freeze({ ...data.details })
            : {};
        const record: AnyRecord = Object.freeze({
          id: crypto.randomUUID(),
          officer_id: data.officer_id,
          action_category: data.action_category,
          action_description: data.action_description,
          target_ref_id: data.target_ref_id ?? null,
          details: safeDetails,
          ip_address: data.ip_address,
          created_at: new Date(),
        });
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
