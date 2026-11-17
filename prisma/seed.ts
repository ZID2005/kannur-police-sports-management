import {
  AccountStatus,
  BookingType,
  FacilityCode,
  PrismaClient,
  UserCategory,
  UserRole,
} from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { parseTimeToDate } from '../src/utils/time';

const prisma = new PrismaClient();

export async function runSeed(client: PrismaClient = prisma) {
  console.log('==================================================================');
  console.log('Seeding Kannur City Police Sports Facilities Management Database...');
  console.log('==================================================================');

  // --------------------------------------------------------------------------
  // 1. SEED THE 4 FACILITIES
  // --------------------------------------------------------------------------
  const facilitiesData = [
    {
      code: FacilityCode.SYNTHETIC_TRACK,
      name: 'Kannur City Police 8-Lane Synthetic Athletic Track',
      operating_start: parseTimeToDate('05:00'),
      operating_end: parseTimeToDate('22:00'),
      slot_duration_mins: 60,
      daily_user_hour_cap: 2,
      monthly_member_cap: 300, // Strictly capped at 300 active monthly members
      is_partitionable: false,
    },
    {
      code: FacilityCode.FOOTBALL_GROUND,
      name: 'Kannur Police Parade & Natural Turf Football Ground',
      operating_start: parseTimeToDate('05:00'),
      operating_end: parseTimeToDate('22:00'),
      slot_duration_mins: 60,
      daily_user_hour_cap: 4, // Up to 4 hours/day per user
      monthly_member_cap: null,
      is_partitionable: false,
    },
    {
      code: FacilityCode.POLICE_TURF,
      name: 'Kannur Police Floodlit Artificial Football Turf (7s / Dual 5s)',
      operating_start: parseTimeToDate('05:00'),
      operating_end: parseTimeToDate('22:00'),
      slot_duration_mins: 60,
      daily_user_hour_cap: 2, // Up to 2 hours/day per user
      monthly_member_cap: null,
      is_partitionable: true, // Partitionable into FULL, HALF_A, and HALF_B
    },
    {
      code: FacilityCode.BADMINTON_COURT,
      name: 'Kannur Police Indoor Wooden Badminton Court Complex',
      operating_start: parseTimeToDate('05:00'),
      operating_end: parseTimeToDate('22:00'),
      slot_duration_mins: 60,
      daily_user_hour_cap: 2, // Up to 2 hours/day per user
      monthly_member_cap: null,
      is_partitionable: false,
    },
  ];

  const facilityMap = new Map<FacilityCode, string>();

  for (const fac of facilitiesData) {
    const record = await client.facility.upsert({
      where: { code: fac.code },
      update: {
        name: fac.name,
        operating_start: fac.operating_start,
        operating_end: fac.operating_end,
        slot_duration_mins: fac.slot_duration_mins,
        daily_user_hour_cap: fac.daily_user_hour_cap,
        monthly_member_cap: fac.monthly_member_cap,
        is_partitionable: fac.is_partitionable,
      },
      create: fac,
    });
    facilityMap.set(fac.code, record.id);
    console.log(`[Facility Seeded] ${record.code} -> ${record.name} (ID: ${record.id})`);
  }

  // --------------------------------------------------------------------------
  // 2. SEED DEFAULT PUBLIC & GOVT_PERSONNEL TARIFFS (GST 18.00%)
  // --------------------------------------------------------------------------
  const tariffsData = [
    // 2.1 SYNTHETIC_TRACK — Monthly Pass (Public & Govt Personnel Concession)
    {
      facilityCode: FacilityCode.SYNTHETIC_TRACK,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '500.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.SYNTHETIC_TRACK,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '250.00',
      gst_percent: '18.00',
      is_active: true,
    },

    // 2.2 FOOTBALL_GROUND — Full Court Hourly Slot (Public & Govt Personnel)
    {
      facilityCode: FacilityCode.FOOTBALL_GROUND,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '2000.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.FOOTBALL_GROUND,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '1200.00',
      gst_percent: '18.00',
      is_active: true,
    },

    // 2.3 POLICE_TURF — Full Court & Half Court Hourly Slots (Public & Govt Personnel)
    {
      facilityCode: FacilityCode.POLICE_TURF,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '1400.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.POLICE_TURF,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '900.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.POLICE_TURF,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.HALF_COURT,
      base_price: '800.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.POLICE_TURF,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.HALF_COURT,
      base_price: '500.00',
      gst_percent: '18.00',
      is_active: true,
    },

    // 2.4 BADMINTON_COURT — Full Court Hourly Slot & Monthly Pass (Public & Govt Personnel)
    {
      facilityCode: FacilityCode.BADMINTON_COURT,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.FULL_COURT,
      base_price: '400.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.BADMINTON_COURT,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.FULL_COURT,
      base_price: '250.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.BADMINTON_COURT,
      user_category: UserCategory.PUBLIC,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '1000.00',
      gst_percent: '18.00',
      is_active: true,
    },
    {
      facilityCode: FacilityCode.BADMINTON_COURT,
      user_category: UserCategory.GOVT_PERSONNEL,
      booking_type: BookingType.MONTHLY_PASS,
      base_price: '600.00',
      gst_percent: '18.00',
      is_active: true,
    },
  ];

  for (const t of tariffsData) {
    const facilityId = facilityMap.get(t.facilityCode)!;
    const tariff = await client.tariff.upsert({
      where: {
        uq_tariff_facility_category_type: {
          facility_id: facilityId,
          user_category: t.user_category,
          booking_type: t.booking_type,
        },
      },
      update: {
        base_price: t.base_price,
        gst_percent: t.gst_percent,
        is_active: t.is_active,
      },
      create: {
        facility_id: facilityId,
        user_category: t.user_category,
        booking_type: t.booking_type,
        base_price: t.base_price,
        gst_percent: t.gst_percent,
        is_active: t.is_active,
      },
    });
    console.log(
      `[Tariff Seeded] ${t.facilityCode} | ${t.user_category} | ${t.booking_type} -> Base INR ${tariff.base_price} (+${tariff.gst_percent}% GST)`
    );
  }

  // --------------------------------------------------------------------------
  // 3. SEED INITIAL ACCOUNTS (NO PHONE/MOBILE OR AADHAAR FIELDS)
  // --------------------------------------------------------------------------
  const adminPasswordHash = await hashPassword('KcpAdmin@2026!');
  const gateOfficerPasswordHash = await hashPassword('KcpGate@2026!');
  const publicUserPasswordHash = await hashPassword('PriyaSports@2026!');

  // 3.1 STAFF_ADMIN: insp_rajeev
  const inspRajeev = await client.user.upsert({
    where: { username: 'insp_rajeev' },
    update: {
      full_name: 'Inspector Rajeev Kumar (Sports Admin)',
      email: 'insp.rajeev@kannurpolice.kerala.gov.in',
      role: UserRole.STAFF_ADMIN,
      account_status: AccountStatus.ACTIVE,
      ban_reason: null,
    },
    create: {
      username: 'insp_rajeev',
      password_hash: adminPasswordHash,
      full_name: 'Inspector Rajeev Kumar (Sports Admin)',
      email: 'insp.rajeev@kannurpolice.kerala.gov.in',
      role: UserRole.STAFF_ADMIN,
      account_status: AccountStatus.ACTIVE,
    },
  });
  console.log(`[User Seeded] STAFF_ADMIN -> username: '${inspRajeev.username}'`);

  // 3.2 GATE_OFFICER: hc_pradeep
  const hcPradeep = await client.user.upsert({
    where: { username: 'hc_pradeep' },
    update: {
      full_name: 'HC Pradeep V. (Gate Verification Officer)',
      email: 'hc.pradeep@kannurpolice.kerala.gov.in',
      role: UserRole.GATE_OFFICER,
      account_status: AccountStatus.ACTIVE,
      ban_reason: null,
    },
    create: {
      username: 'hc_pradeep',
      password_hash: gateOfficerPasswordHash,
      full_name: 'HC Pradeep V. (Gate Verification Officer)',
      email: 'hc.pradeep@kannurpolice.kerala.gov.in',
      role: UserRole.GATE_OFFICER,
      account_status: AccountStatus.ACTIVE,
    },
  });
  console.log(`[User Seeded] GATE_OFFICER -> username: '${hcPradeep.username}'`);

  // 3.3 PUBLIC: priya_mohan
  const priyaMohan = await client.user.upsert({
    where: { username: 'priya_mohan' },
    update: {
      full_name: 'Priya Mohan',
      email: 'priya.mohan@example.org',
      role: UserRole.PUBLIC,
      account_status: AccountStatus.ACTIVE,
      ban_reason: null,
    },
    create: {
      username: 'priya_mohan',
      password_hash: publicUserPasswordHash,
      full_name: 'Priya Mohan',
      email: 'priya.mohan@example.org',
      role: UserRole.PUBLIC,
      account_status: AccountStatus.ACTIVE,
    },
  });
  console.log(`[User Seeded] PUBLIC -> username: '${priyaMohan.username}'`);

  // --------------------------------------------------------------------------
  // 4. INITIAL IMMUTABLE AUDIT LOG ENTRY
  // --------------------------------------------------------------------------
  await client.auditLog.create({
    data: {
      officer_id: inspRajeev.id,
      action_category: 'SYSTEM_SEED',
      action_description:
        'Initialized Kannur City Police Sports Facilities database with 4 facilities, default tariffs, and initial accounts.',
      target_ref_id: inspRajeev.id,
      details: {
        facilitiesSeeded: facilitiesData.map((f) => f.code),
        tariffsSeededCount: tariffsData.length,
        accountsSeeded: ['insp_rajeev', 'hc_pradeep', 'priya_mohan'],
      },
      ip_address: '127.0.0.1',
    },
  });

  console.log('==================================================================');
  console.log('Seed completed successfully.');
  console.log('==================================================================');
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error('Database seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
