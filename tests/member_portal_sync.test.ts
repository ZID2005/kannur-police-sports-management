import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createInMemoryPrisma } from '../src/config/inMemoryDb';
import { formatDateOnly } from '../src/utils/time';

let activeDb = createInMemoryPrisma();

vi.mock('../src/config/database', () => ({
  prisma: new Proxy(
    {},
    {
      get(_target, prop) {
        return (activeDb as any)[prop];
      },
    }
  ),
}));

import app from '../src/app';

async function loginAs(username: string, password: string): Promise<string[]> {
  const res = await request(app).post('/api/auth/login').send({
    username,
    password,
  });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'];
}

function getFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return formatDateOnly(d);
}

describe('Member Portal Cleanup, Receipt Breakdown & Live Admin Sync', () => {
  const bookingDate = getFutureDate(3);

  beforeEach(() => {
    activeDb = createInMemoryPrisma();
  });

  it('activates self-registered PUBLIC and GOVT_PERSONNEL users immediately and lets them book slots + track pass without manual approval', async () => {
    const EXPECTED_USER_KEYS = [
      'account_status',
      'association_details',
      'city_locality',
      'created_at',
      'date_of_birth',
      'designation',
      'email',
      'full_name',
      'gender',
      'id',
      'is_registered_sportsperson',
      'office_address',
      'parent_name',
      'permanent_address',
      'pin_code',
      'present_address',
      'profile_photo_url',
      'role',
      'sport_discipline',
      'track_purpose',
      'updated_at',
      'username',
    ];

    // 1. Self-register a brand new General Public member
    const publicReg = await request(app).post('/api/auth/register').send({
      username: 'new_citizen_runner',
      password: 'RunnerPass@2026!',
      full_name: 'Deepak Menon',
      role: 'PUBLIC',
    });

    expect(publicReg.status).toBe(201);
    expect(publicReg.body.data.user.account_status).toBe('ACTIVE');
    expect(publicReg.body.data.user.role).toBe('PUBLIC');
    expect(Object.keys(publicReg.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);
    const publicCookie = publicReg.headers['set-cookie'];

    const publicMe = await request(app).get('/api/auth/me').set('Cookie', publicCookie);
    expect(publicMe.status).toBe(200);
    expect(Object.keys(publicMe.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    // Immediately book a Badminton Court slot (no approval wait)
    const pubReserve = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', publicCookie)
      .send({
        facility_code: 'BADMINTON_COURT',
        booking_date: bookingDate,
        start_time: '07:00',
        end_time: '08:00',
        court_partition: 'FULL',
      });

    expect(pubReserve.status).toBe(201);
    const pubBooking = pubReserve.body.data.booking;
    expect(pubBooking.booking_code).toMatch(/^KCP-SLT-/);
    expect(pubBooking.pricing_breakdown).toEqual({
      base_fee: '400.00',
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: '400.00',
      gst_rate: 18,
      gst_amount: '72.00',
      final_total_paid: '472.00',
    });

    // Settle payment and verify receipt breakdown
    const pubSettle = await request(app)
      .post('/api/payments/settle')
      .set('Cookie', publicCookie)
      .send({
        reference_type: 'SLOT_BOOKING',
        reference_id: pubBooking.id,
      });

    expect(pubSettle.status).toBe(201);
    expect(Object.keys(pubSettle.body.data).sort()).toEqual([
      'payment',
      'receipt',
      'slot_booking',
    ]);
    expect(pubSettle.body.data.receipt).toBeDefined();
    expect(pubSettle.body.data.receipt.booking_or_pass_code).toBe(pubBooking.booking_code);
    expect(pubSettle.body.data.receipt.pricing_breakdown).toEqual({
      base_fee: '400.00',
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: '400.00',
      gst_rate: 18,
      gst_amount: '72.00',
      final_total_paid: '472.00',
    });

    // GET /api/bookings/my returns structured receipt & pricing_breakdown
    const pubMyRes = await request(app)
      .get('/api/bookings/my')
      .set('Cookie', publicCookie);
    expect(pubMyRes.status).toBe(200);
    expect(pubMyRes.body.data.bookings).toHaveLength(1);
    const fetchedPubBooking = pubMyRes.body.data.bookings[0];
    expect(fetchedPubBooking.status).toBe('CONFIRMED');
    expect(fetchedPubBooking.pricing_breakdown.final_total_paid).toBe('472.00');
    expect(fetchedPubBooking.receipt.receipt_no).toBe(pubSettle.body.data.payment.receipt_no);

    // 2. Self-register a brand new GOVT_PERSONNEL user and verify concession breakdown
    const govtReg = await request(app).post('/api/auth/register').send({
      username: 'new_govt_officer',
      password: 'OfficerPass@2026!',
      full_name: 'SI Kiran Raj',
      role: 'GOVT_PERSONNEL',
    });

    expect(govtReg.status).toBe(201);
    expect(govtReg.body.data.user.account_status).toBe('ACTIVE');
    expect(govtReg.body.data.user.role).toBe('GOVT_PERSONNEL');
    expect(Object.keys(govtReg.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);
    const govtCookie = govtReg.headers['set-cookie'];

    const govtMe = await request(app).get('/api/auth/me').set('Cookie', govtCookie);
    expect(govtMe.status).toBe(200);
    expect(Object.keys(govtMe.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    // Book Police Turf Full Court -> Standard Base 1400, Govt Rate 900, Concession 500, GST 18% of 900 = 162, Total 1062
    const govtReserve = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', govtCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '08:00',
        end_time: '09:00',
        court_partition: 'FULL',
      });

    expect(govtReserve.status).toBe(201);
    const govtBooking = govtReserve.body.data.booking;
    expect(govtBooking.user_category).toBe('GOVT_PERSONNEL');
    expect(govtBooking.pricing_breakdown).toEqual({
      base_fee: '1400.00',
      concession_discount: '500.00',
      concession_percent: 35.7,
      taxable_subtotal: '900.00',
      gst_rate: 18,
      gst_amount: '162.00',
      final_total_paid: '1062.00',
    });

    // Instant checkout for Synthetic Track Monthly Membership (no approval wait or document upload)
    const instantTrackRes = await request(app)
      .post('/api/memberships/apply')
      .set('Cookie', govtCookie)
      .send({
        facility_code: 'SYNTHETIC_TRACK',
        duration_months: 1,
        session_window: 'MORNING',
        instant_checkout: true,
      });

    expect(instantTrackRes.status).toBe(201);
    expect(instantTrackRes.body.data.membership.status).toBe('APPROVED_UNPAID');
    expect(instantTrackRes.body.data.membership.payment_locked).toBe(false);
    expect(instantTrackRes.body.data.membership.pricing_breakdown).toEqual({
      base_fee: '500.00',
      concession_discount: '250.00',
      concession_percent: 50,
      taxable_subtotal: '250.00',
      gst_rate: 18,
      gst_amount: '45.00',
      final_total_paid: '295.00',
    });

    const settleTrackRes = await request(app)
      .post('/api/payments/settle')
      .set('Cookie', govtCookie)
      .send({
        reference_type: 'MEMBERSHIP',
        reference_id: instantTrackRes.body.data.membership.id,
      });
    expect(settleTrackRes.status).toBe(201);
    expect(Object.keys(settleTrackRes.body.data).sort()).toEqual([
      'membership',
      'payment',
      'receipt',
    ]);
    expect(settleTrackRes.body.data.membership.status).toBe('ACTIVE');
  });

  it('rejects member booking attempts on MAINTENANCE/CLOSED venues and Admin-blocked slots (BLOCKED_MAINTENANCE & RESERVED_DEPARTMENT)', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');
    const reg = await request(app).post('/api/auth/register').send({
      username: 'sync_member_01',
      password: 'SyncMember@2026!',
      full_name: 'Meera Nair',
      role: 'PUBLIC',
    });
    const memberCookie = reg.headers['set-cookie'];

    const adminList = await request(app)
      .get(`/api/admin/facilities?date=${bookingDate}`)
      .set('Cookie', adminCookie);
    const badminton = adminList.body.data.facilities.find(
      (f: any) => f.code === 'BADMINTON_COURT'
    );
    const turf = adminList.body.data.facilities.find((f: any) => f.code === 'POLICE_TURF');

    // 1. Toggle Badminton Court to MAINTENANCE -> member slots show FACILITY_MAINTENANCE & reserve returns 409 FACILITY_UNAVAILABLE
    await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/status`)
      .set('Cookie', adminCookie)
      .send({ operational_status: 'MAINTENANCE', reason: 'Court surface recoating' })
      .expect(200);

    const maintSlots = await request(app).get(
      `/api/facilities/BADMINTON_COURT/slots?date=${bookingDate}`
    );
    expect(maintSlots.status).toBe(200);
    expect(maintSlots.body.data.facility.operational_status).toBe('MAINTENANCE');
    expect(
      maintSlots.body.data.slots.every(
        (s: any) => s.status === 'ALREADY_BOOKED' && s.operational_status === 'FACILITY_MAINTENANCE'
      )
    ).toBe(true);

    const maintReserve = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'BADMINTON_COURT',
        booking_date: bookingDate,
        start_time: '09:00',
        end_time: '10:00',
      });
    expect(maintReserve.status).toBe(409);
    expect(maintReserve.body.errorCode).toBe('FACILITY_UNAVAILABLE');

    // 2. Toggle Badminton Court to CLOSED -> member reserve still rejected with 409 FACILITY_UNAVAILABLE
    await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/status`)
      .set('Cookie', adminCookie)
      .send({ operational_status: 'CLOSED', reason: 'Annual inventory audit' })
      .expect(200);

    const closedSlots = await request(app).get(
      `/api/facilities/BADMINTON_COURT/slots?date=${bookingDate}`
    );
    expect(closedSlots.body.data.facility.operational_status).toBe('CLOSED');
    expect(closedSlots.body.data.slots[0].operational_status).toBe('FACILITY_CLOSED');

    const closedReserve = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'BADMINTON_COURT',
        booking_date: bookingDate,
        start_time: '09:00',
        end_time: '10:00',
      });
    expect(closedReserve.status).toBe(409);
    expect(closedReserve.body.errorCode).toBe('FACILITY_UNAVAILABLE');

    // 3. Block a Police Turf slot as BLOCKED_MAINTENANCE and another as RESERVED_DEPARTMENT
    const turfSlot09 = turf.slots.find((s: any) => s.start_time === '09:00');
    const turfSlot10 = turf.slots.find((s: any) => s.start_time === '10:00');

    await request(app)
      .patch(`/api/admin/facilities/${turf.id}/slots/${turfSlot09.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: true,
        date: bookingDate,
        block_status: 'BLOCKED_MAINTENANCE',
        reason: 'Floodlight tower calibration',
      })
      .expect(200);

    await request(app)
      .patch(`/api/admin/facilities/${turf.id}/slots/${turfSlot10.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: true,
        date: bookingDate,
        block_status: 'RESERVED_DEPARTMENT',
        reason: 'District Police Squad Drill',
      })
      .expect(200);

    // Public slots API exposes operational labels/reasons for both managed block types
    const turfPublicSlots = await request(app).get(
      `/api/facilities/POLICE_TURF/slots?date=${bookingDate}`
    );
    expect(turfPublicSlots.status).toBe(200);

    const pubSlot09 = turfPublicSlots.body.data.slots.find((s: any) => s.start_time === '09:00');
    expect(pubSlot09.status).toBe('ALREADY_BOOKED');
    expect(pubSlot09.operational_status).toBe('BLOCKED_MAINTENANCE');
    expect(pubSlot09.operational_label).toBe('Blocked for Maintenance');
    expect(pubSlot09.operational_reason).toContain('Floodlight tower calibration');

    const pubSlot10 = turfPublicSlots.body.data.slots.find((s: any) => s.start_time === '10:00');
    expect(pubSlot10.status).toBe('ALREADY_BOOKED');
    expect(pubSlot10.operational_status).toBe('RESERVED_DEPARTMENT');
    expect(pubSlot10.operational_label).toBe('Reserved for Department');
    expect(pubSlot10.operational_reason).toContain('District Police Squad Drill');

    // Member reservation attempts on both blocked slots must return 409 SLOT_BLOCKED
    const blockMaintAttempt = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '09:00',
        end_time: '10:00',
        court_partition: 'FULL',
      });
    expect(blockMaintAttempt.status).toBe(409);
    expect(blockMaintAttempt.body.errorCode).toBe('SLOT_BLOCKED');

    const deptReservedAttempt = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '10:00',
        end_time: '11:00',
        court_partition: 'HALF_A',
      });
    expect(deptReservedAttempt.status).toBe(409);
    expect(deptReservedAttempt.body.errorCode).toBe('SLOT_BLOCKED');
  });

  it('syncs custom Admin-created venues to members and preserves partitionable turf & daily hour cap rules', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');
    const reg = await request(app).post('/api/auth/register').send({
      username: 'custom_venue_player',
      password: 'PlayerPass@2026!',
      full_name: 'Nikhil Varma',
      role: 'PUBLIC',
    });
    const memberCookie = reg.headers['set-cookie'];

    // Admin creates a new custom venue ("Floodlit Basketball Arena")
    const createRes = await request(app)
      .post('/api/admin/facilities')
      .set('Cookie', adminCookie)
      .send({
        name: 'Floodlit Basketball Arena',
        code: 'BASKETBALL_ARENA',
        category: 'Outdoor Court',
        court_count: 2,
        court_unit_label: 'Courts',
        max_capacity_per_slot: 1,
        operating_start: '06:00',
        operating_end: '21:00',
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        booking_mode: 'HOURLY_SLOTS',
        public_rate: 600,
        govt_rate: 300,
        description: 'Synthetic acrylic basketball court with LED floodlights.',
      });
    expect(createRes.status).toBe(201);

    // Custom venue immediately appears in member GET /api/facilities
    const facListRes = await request(app)
      .get('/api/facilities')
      .set('Cookie', memberCookie);
    expect(facListRes.status).toBe(200);
    const customFac = facListRes.body.data.facilities.find(
      (f: any) => f.code === 'BASKETBALL_ARENA'
    );
    expect(customFac).toBeDefined();
    expect(customFac.name).toBe('Floodlit Basketball Arena');
    expect(customFac.operational_status).toBe('ACTIVE');

    // Member can view slots and book the custom venue cleanly
    const customSlots = await request(app).get(
      `/api/facilities/BASKETBALL_ARENA/slots?date=${bookingDate}`
    );
    expect(customSlots.status).toBe(200);
    expect(customSlots.body.data.slots.length).toBe(15); // 06:00-21:00

    const customBook = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'BASKETBALL_ARENA',
        booking_date: bookingDate,
        start_time: '06:00',
        end_time: '07:00',
      });
    expect(customBook.status).toBe(201);
    expect(customBook.body.data.booking.pricing_breakdown).toEqual({
      base_fee: '600.00',
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: '600.00',
      gst_rate: 18,
      gst_amount: '108.00',
      final_total_paid: '708.00',
    });

    // Partitionable Police Turf rules + 2-hour daily cap enforcement
    const halfA = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '15:00',
        end_time: '16:00',
        court_partition: 'HALF_A',
      });
    expect(halfA.status).toBe(201);

    // FULL on same slot must be rejected because HALF_A is already booked
    const fullConflict = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '15:00',
        end_time: '16:00',
        court_partition: 'FULL',
      });
    expect(fullConflict.status).toBe(409);
    expect(fullConflict.body.errorCode).toBe('SLOT_ALREADY_BOOKED');

    // HALF_B on same slot is allowed (second hour hits the 2-hour daily cap)
    const halfB = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '15:00',
        end_time: '16:00',
        court_partition: 'HALF_B',
      });
    expect(halfB.status).toBe(201);

    // Third hour on Police Turf same day must reject with DAILY_HOUR_CAP_EXCEEDED
    const thirdHour = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'POLICE_TURF',
        booking_date: bookingDate,
        start_time: '16:00',
        end_time: '17:00',
        court_partition: 'FULL',
      });
    expect(thirdHour.status).toBe(409);
    expect(thirdHour.body.errorCode).toBe('DAILY_HOUR_CAP_EXCEEDED');
  });

  it('persists full multi-step membership onboarding (Gender incl. TRANSGENDER & Address), syncs to Account Profile & Admin Member Directory, and activates immediately with GST receipt', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

    // 1. Self-register a new PUBLIC athlete
    const regRes = await request(app).post('/api/auth/register').send({
      username: 'neethu_track_athlete',
      password: 'AthletePass@2026!',
      full_name: 'Neethu Krishnan',
      email: 'neethu.k@example.org',
      role: 'PUBLIC',
    });
    expect(regRes.status).toBe(201);
    const memberCookie = regRes.headers['set-cookie'];

    // 2. Submit multi-step Membership Onboarding with TRANSGENDER gender, full address, and instant checkout
    const applyRes = await request(app)
      .post('/api/memberships/apply')
      .set('Cookie', memberCookie)
      .send({
        facility_code: 'SYNTHETIC_TRACK',
        duration_months: 3,
        session_window: 'EVENING',
        instant_checkout: true,
        declaration_accepted: true,
        gender: 'TRANSGENDER',
        date_of_birth: '1996-03-11',
        parent_name: 'Krishnan Nair',
        present_address: 'Surya Apartments, Flat 4B, Fort Road',
        city_locality: 'Talap, Kannur',
        pin_code: '670002',
        permanent_address: 'Surya Apartments, Flat 4B, Fort Road, Talap, Kannur 670002',
        track_purpose: 'State athletics trials and 800m endurance conditioning',
        is_registered_sportsperson: true,
        sport_discipline: '800m Athletics',
        association_details: 'Kerala State Athletics Association',
      });

    expect(applyRes.status).toBe(201);
    const membership = applyRes.body.data.membership;
    expect(membership.status).toBe('APPROVED_UNPAID');
    expect(membership.payment_locked).toBe(false);
    expect(membership.declaration_accepted).toBe(true);
    expect(membership.track_purpose).toBe(
      'State athletics trials and 800m endurance conditioning'
    );
    expect(membership.is_registered_sportsperson).toBe(true);
    expect(membership.sport_discipline).toBe('800m Athletics');
    expect(membership.pricing_breakdown).toEqual({
      base_fee: '1500.00',
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: '1500.00',
      gst_rate: 18,
      gst_amount: '270.00',
      final_total_paid: '1770.00',
    });

    // 3. Complete instant online checkout -> ACTIVE pass + official GST receipt
    const settleRes = await request(app)
      .post('/api/payments/settle')
      .set('Cookie', memberCookie)
      .send({
        reference_type: 'MEMBERSHIP',
        reference_id: membership.id,
      });

    expect(settleRes.status).toBe(201);
    expect(Object.keys(settleRes.body.data).sort()).toEqual([
      'membership',
      'payment',
      'receipt',
    ]);
    expect(settleRes.body.data.membership.status).toBe('ACTIVE');
    expect(settleRes.body.data.receipt.receipt_no).toMatch(/^RCP-KCP-2026-/);
    expect(settleRes.body.data.receipt.pricing_breakdown).toEqual({
      base_fee: '1500.00',
      concession_discount: '0.00',
      concession_percent: 0,
      taxable_subtotal: '1500.00',
      gst_rate: 18,
      gst_amount: '270.00',
      final_total_paid: '1770.00',
    });

    // 4. Verify saved onboarding fields persisted onto GET /api/auth/me
    const meRes = await request(app).get('/api/auth/me').set('Cookie', memberCookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user).toMatchObject({
      username: 'neethu_track_athlete',
      gender: 'TRANSGENDER',
      date_of_birth: '1996-03-11',
      parent_name: 'Krishnan Nair',
      present_address: 'Surya Apartments, Flat 4B, Fort Road',
      city_locality: 'Talap, Kannur',
      pin_code: '670002',
      track_purpose: 'State athletics trials and 800m endurance conditioning',
      is_registered_sportsperson: true,
      sport_discipline: '800m Athletics',
      association_details: 'Kerala State Athletics Association',
    });

    // 5. Update address from Account Profile via PATCH /api/auth/me and confirm persistence
    const updateProfileRes = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', memberCookie)
      .send({
        present_address: 'Lotus Villa, House No. 18, Beach Road',
        city_locality: 'Payyambalam, Kannur',
        pin_code: '670001',
      });
    expect(updateProfileRes.status).toBe(200);
    expect(updateProfileRes.body.data.user.city_locality).toBe('Payyambalam, Kannur');
    expect(updateProfileRes.body.data.user.pin_code).toBe('670001');

    // 6. Verify visibility in Admin Member Directory (including ?gender=TRANSGENDER filter)
    const adminDirRes = await request(app)
      .get('/api/admin/members?gender=TRANSGENDER')
      .set('Cookie', adminCookie);
    expect(adminDirRes.status).toBe(200);
    expect(adminDirRes.body.data.members).toHaveLength(1);
    const dirRecord = adminDirRes.body.data.members[0];
    expect(dirRecord).toMatchObject({
      username: 'neethu_track_athlete',
      full_name: 'Neethu Krishnan',
      gender: 'TRANSGENDER',
      date_of_birth: '1996-03-11',
      present_address: 'Lotus Villa, House No. 18, Beach Road',
      city_locality: 'Payyambalam, Kannur',
      pin_code: '670001',
      track_purpose: 'State athletics trials and 800m endurance conditioning',
      is_registered_sportsperson: true,
      sport_discipline: '800m Athletics',
      association_details: 'Kerala State Athletics Association',
      active_pass_code: membership.pass_code,
    });

    // Confirm strict response key allowlists across profile & Admin Member Directory
    expect(Object.keys(meRes.body.data.user).sort()).toEqual([
      'account_status',
      'association_details',
      'city_locality',
      'created_at',
      'date_of_birth',
      'designation',
      'email',
      'full_name',
      'gender',
      'id',
      'is_registered_sportsperson',
      'office_address',
      'parent_name',
      'permanent_address',
      'pin_code',
      'present_address',
      'profile_photo_url',
      'role',
      'sport_discipline',
      'track_purpose',
      'updated_at',
      'username',
    ]);
    expect(Object.keys(dirRecord).sort()).toEqual([
      'account_status',
      'active_pass_code',
      'active_pass_plan',
      'association_details',
      'city_locality',
      'confirmed_bookings_count',
      'created_at',
      'date_of_birth',
      'designation',
      'email',
      'full_name',
      'gender',
      'id',
      'is_registered_sportsperson',
      'office_address',
      'parent_name',
      'permanent_address',
      'pin_code',
      'present_address',
      'role',
      'sport_discipline',
      'track_purpose',
      'username',
    ]);
  });
});
