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

describe('Admin Facilities & Slot Manager (/api/admin/facilities) + Live Dashboard KPI Sync', () => {
  const todayStr = formatDateOnly(new Date());

  beforeEach(() => {
    activeDb = createInMemoryPrisma();
  });

  it('lists all seeded facilities with pricing, live booking counts, slots, and clean operational descriptions', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

    const res = await request(app)
      .get(`/api/admin/facilities?date=${todayStr}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.date).toBe(todayStr);
    expect(res.body.data.facilities).toHaveLength(4);
    expect(res.body.data.summary.active_facilities).toBe(4);
    expect(res.body.data.summary.total_facilities).toBe(4);

    // Ensure every facility has a clean operational description, valid pricing, and 17 hourly slots
    for (const fac of res.body.data.facilities) {
      const desc = String(fac.description ?? '').trim();
      expect(desc.length).toBeGreaterThan(20);
      expect(fac.pricing.public_rate).toBeGreaterThan(0);
      expect(fac.pricing.govt_rate).toBeGreaterThan(0);
      expect(fac.slots.length).toBe(17); // 05:00 - 22:00 hourly
    }

    // Verify Police Turf live occupancy for seeded today's bookings & blocks
    const turf = res.body.data.facilities.find((f: any) => f.code === 'POLICE_TURF');
    expect(turf).toBeDefined();
    expect(turf.pricing.public_rate).toBe(1400);
    expect(turf.pricing.govt_rate).toBe(900);
    expect(turf.pricing.half_court_public_rate).toBe(800);
    expect(turf.pricing.half_court_govt_rate).toBe(500);

    // 17:00-18:00 FULL booking -> booked_count = 2 / 2, status = FULL
    const slot17 = turf.slots.find((s: any) => s.start_time === '17:00');
    expect(slot17.booked_count).toBe(2);
    expect(slot17.max_capacity).toBe(2);
    expect(slot17.status).toBe('FULL');
    expect(slot17.active_bookings_count).toBe(1);

    // 18:00-19:00 HALF_A booking -> booked_count = 1 / 2, status = OPEN
    const slot18 = turf.slots.find((s: any) => s.start_time === '18:00');
    expect(slot18.booked_count).toBe(1);
    expect(slot18.max_capacity).toBe(2);
    expect(slot18.status).toBe('OPEN');

    // 10:00-11:00 seeded maintenance block -> BLOCKED_MAINTENANCE
    const slot10 = turf.slots.find((s: any) => s.start_time === '10:00');
    expect(slot10.status).toBe('BLOCKED_MAINTENANCE');
    expect(slot10.block_reason).toContain('turf brushing');
  });

  it('updates facility operational status (ACTIVE -> MAINTENANCE -> CLOSED -> ACTIVE), reflects immediately in Dashboard KPIs, and pauses public reservations', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');
    const citizenCookie = await loginAs('priya_mohan', 'PriyaSports@2026!');

    const listRes = await request(app)
      .get(`/api/admin/facilities?date=${todayStr}`)
      .set('Cookie', adminCookie);
    const badminton = listRes.body.data.facilities.find(
      (f: any) => f.code === 'BADMINTON_COURT'
    );

    const dashBefore = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashBefore.status).toBe(200);
    expect(dashBefore.body.data.kpis.active_facilities_count).toBe(4);
    expect(dashBefore.body.data.kpis.maintenance_facilities_count).toBe(0);
    const totalSlotsBefore = dashBefore.body.data.kpis.todays_total_slots_count;

    // 1. Toggle Badminton Court to MAINTENANCE
    const maintRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/status`)
      .set('Cookie', adminCookie)
      .send({
        operational_status: 'MAINTENANCE',
        reason: 'Wooden floor varnishing',
      });

    expect(maintRes.status).toBe(200);
    expect(maintRes.body.data.facility.operational_status).toBe('MAINTENANCE');

    // Dashboard KPIs must immediately reflect 3 active facilities, 1 maintenance, and reduced active daily slots
    const dashMaint = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashMaint.body.data.kpis.active_facilities_count).toBe(3);
    expect(dashMaint.body.data.kpis.maintenance_facilities_count).toBe(1);
    expect(dashMaint.body.data.kpis.todays_total_slots_count).toBe(totalSlotsBefore - 17);

    // Citizen booking attempt on a MAINTENANCE facility must be rejected with 409 FACILITY_UNAVAILABLE
    const blockedBookingRes = await request(app)
      .post('/api/bookings/reserve')
      .set('Cookie', citizenCookie)
      .send({
        facility_code: 'BADMINTON_COURT',
        booking_date: todayStr,
        start_time: '11:00',
        end_time: '12:00',
      });
    expect(blockedBookingRes.status).toBe(409);
    expect(blockedBookingRes.body.errorCode).toBe('FACILITY_UNAVAILABLE');

    // Public slots endpoint masks slots as ALREADY_BOOKED while under maintenance
    const publicSlotsRes = await request(app).get(
      `/api/facilities/BADMINTON_COURT/slots?date=${todayStr}`
    );
    expect(publicSlotsRes.status).toBe(200);
    expect(
      publicSlotsRes.body.data.slots.every((s: any) => s.status === 'ALREADY_BOOKED')
    ).toBe(true);

    // 2. Toggle to CLOSED, then back to ACTIVE
    const closedRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/status`)
      .set('Cookie', adminCookie)
      .send({ operational_status: 'CLOSED' });
    expect(closedRes.status).toBe(200);
    expect(closedRes.body.data.facility.operational_status).toBe('CLOSED');

    const reactivateRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/status`)
      .set('Cookie', adminCookie)
      .send({ operational_status: 'ACTIVE' });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.data.facility.operational_status).toBe('ACTIVE');

    const dashRestored = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashRestored.body.data.kpis.active_facilities_count).toBe(4);
    expect(dashRestored.body.data.kpis.todays_total_slots_count).toBe(totalSlotsBefore);
  });

  it('creates a new facility and edits existing facility details/rates, reflecting immediately in Dashboard & Today bookings', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

    // 1. Create a new facility (Basketball Court, 06:00 - 20:00 -> 14 hourly slots)
    const createRes = await request(app)
      .post('/api/admin/facilities')
      .set('Cookie', adminCookie)
      .send({
        name: 'Kannur Police Outdoor Basketball Arena',
        category: 'Outdoor Court',
        court_count: 2,
        court_unit_label: 'Courts',
        operational_status: 'ACTIVE',
        max_capacity_per_slot: 2,
        operating_start: '06:00',
        operating_end: '20:00',
        slot_duration_mins: 60,
        daily_user_hour_cap: 2,
        public_rate: 600,
        govt_rate: 350,
        description: 'Floodlit synthetic basketball courts with regulation hoops.',
      });

    expect(createRes.status).toBe(201);
    const createdFac = createRes.body.data.facility;
    expect(createdFac.name).toBe('Kannur Police Outdoor Basketball Arena');
    expect(createdFac.slots).toHaveLength(14);
    expect(createdFac.pricing.public_rate).toBe(600);
    expect(createdFac.pricing.govt_rate).toBe(350);

    // Dashboard immediately shows 5 active facilities
    const dashAfterCreate = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashAfterCreate.body.data.kpis.active_facilities_count).toBe(5);
    expect(dashAfterCreate.body.data.kpis.total_facilities_count).toBe(5);

    // 2. Edit Police Turf name, capacity, and Public/Govt rates
    const listRes = await request(app)
      .get(`/api/admin/facilities?date=${todayStr}`)
      .set('Cookie', adminCookie);
    const turf = listRes.body.data.facilities.find((f: any) => f.code === 'POLICE_TURF');

    const updateRes = await request(app)
      .patch(`/api/admin/facilities/${turf.id}`)
      .set('Cookie', adminCookie)
      .send({
        name: 'Kannur Police Premier Floodlit Turf',
        max_capacity_per_slot: 3,
        public_rate: 1500,
        govt_rate: 950,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.facility.name).toBe('Kannur Police Premier Floodlit Turf');
    expect(updateRes.body.data.facility.max_capacity_per_slot).toBe(3);
    expect(updateRes.body.data.facility.pricing.public_rate).toBe(1500);
    expect(updateRes.body.data.facility.pricing.govt_rate).toBe(950);

    // Verify Today's Bookings view immediately reflects the updated facility name
    const dashAfterEdit = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    const turfBooking = dashAfterEdit.body.data.todays_bookings.find(
      (b: any) => b.facility_code === 'POLICE_TURF'
    );
    expect(turfBooking).toBeDefined();
    expect(turfBooking.facility_name).toBe('Kannur Police Premier Floodlit Turf');
  });

  it('creates, edits, blocks (maintenance/department), and unblocks time slots with conflict protection and live utilization sync', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

    const listRes = await request(app)
      .get(`/api/admin/facilities?date=${todayStr}`)
      .set('Cookie', adminCookie);
    const badminton = listRes.body.data.facilities.find(
      (f: any) => f.code === 'BADMINTON_COURT'
    );

    const dashBefore = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    const slotsBefore = dashBefore.body.data.kpis.todays_total_slots_count;
    const occupiedBefore = dashBefore.body.data.kpis.todays_booked_slots_count;

    // 1. Add a new late-evening time slot (22:00 - 23:00)
    const addSlotRes = await request(app)
      .post(`/api/admin/facilities/${badminton.id}/slots`)
      .set('Cookie', adminCookie)
      .send({
        start_time: '22:00',
        end_time: '23:00',
        max_capacity: 4,
      });

    expect(addSlotRes.status).toBe(201);
    const newSlot = addSlotRes.body.data.slot;
    expect(newSlot.start_time).toBe('22:00');
    expect(newSlot.end_time).toBe('23:00');
    expect(newSlot.max_capacity).toBe(4);
    expect(newSlot.status).toBe('OPEN');

    // Duplicate overlapping slot creation must be rejected with 409 DUPLICATE_SLOT_WINDOW
    const dupSlotRes = await request(app)
      .post(`/api/admin/facilities/${badminton.id}/slots`)
      .set('Cookie', adminCookie)
      .send({
        start_time: '22:30',
        end_time: '23:30',
        max_capacity: 4,
      });
    expect(dupSlotRes.status).toBe(409);
    expect(dupSlotRes.body.errorCode).toBe('DUPLICATE_SLOT_WINDOW');

    // 2. Edit capacity & timing of the newly created slot
    const editSlotRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/slots/${newSlot.id}`)
      .set('Cookie', adminCookie)
      .send({
        start_time: '22:00',
        end_time: '23:30',
        max_capacity: 6,
      });
    expect(editSlotRes.status).toBe(200);
    expect(editSlotRes.body.data.slot.end_time).toBe('23:30');
    expect(editSlotRes.body.data.slot.max_capacity).toBe(6);

    // 3. Block the slot for maintenance with a short reason
    const blockRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/slots/${newSlot.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: true,
        date: todayStr,
        block_status: 'BLOCKED_MAINTENANCE',
        reason: 'Court resurfacing',
      });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.slot.status).toBe('BLOCKED_MAINTENANCE');
    expect(blockRes.body.data.slot.block_reason).toBe('Court resurfacing');

    // Dashboard totals must reflect +1 total slot and +1 occupied/blocked slot
    const dashAfterBlock = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashAfterBlock.body.data.kpis.todays_total_slots_count).toBe(slotsBefore + 1);
    expect(dashAfterBlock.body.data.kpis.todays_booked_slots_count).toBe(occupiedBefore + 1);

    // 4. Unblock the slot
    const unblockRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/slots/${newSlot.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: false,
        date: todayStr,
      });
    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.data.slot.status).toBe('OPEN');
    expect(unblockRes.body.data.slot.block_reason).toBeNull();

    // Dashboard occupied count returns to baseline
    const dashAfterUnblock = await request(app)
      .get('/api/admin/dashboard-overview')
      .set('Cookie', adminCookie);
    expect(dashAfterUnblock.body.data.kpis.todays_booked_slots_count).toBe(occupiedBefore);

    // 5. Blocking a slot with an existing CONFIRMED booking without force_override must fail with 409 CONFIRMED_BOOKING_CONFLICT
    const bookedBadmintonSlot = badminton.slots.find((s: any) => s.start_time === '08:00');
    expect(bookedBadmintonSlot.active_bookings_count).toBe(1);

    const conflictBlockRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/slots/${bookedBadmintonSlot.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: true,
        date: todayStr,
        block_status: 'RESERVED_DEPARTMENT',
        reason: 'Police event',
      });
    expect(conflictBlockRes.status).toBe(409);
    expect(conflictBlockRes.body.errorCode).toBe('CONFIRMED_BOOKING_CONFLICT');

    // Blocking an unbooked slot as RESERVED_DEPARTMENT succeeds with reason
    const openSlot = badminton.slots.find((s: any) => s.start_time === '12:00');
    const deptReserveRes = await request(app)
      .patch(`/api/admin/facilities/${badminton.id}/slots/${openSlot.id}/block`)
      .set('Cookie', adminCookie)
      .send({
        blocked: true,
        date: todayStr,
        block_status: 'RESERVED_DEPARTMENT',
        reason: 'Police event',
      });
    expect(deptReserveRes.status).toBe(200);
    expect(deptReserveRes.body.data.slot.status).toBe('RESERVED_DEPARTMENT');
    expect(deptReserveRes.body.data.slot.block_reason).toBe('Police event');
  });

  it('strictly prevents deleting a time slot that has active bookings (409 SLOT_HAS_ACTIVE_BOOKINGS) while permitting deletion of unbooked slots', async () => {
    const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

    const listRes = await request(app)
      .get(`/api/admin/facilities?date=${todayStr}`)
      .set('Cookie', adminCookie);
    const football = listRes.body.data.facilities.find(
      (f: any) => f.code === 'FOOTBALL_GROUND'
    );

    // 06:00-07:00 on Football Ground has a seeded CONFIRMED booking (KCP-SLT-2026-3003)
    const bookedSlot = football.slots.find((s: any) => s.start_time === '06:00');
    expect(bookedSlot.active_bookings_count).toBeGreaterThan(0);

    const deleteBookedRes = await request(app)
      .delete(`/api/admin/facilities/${football.id}/slots/${bookedSlot.id}?date=${todayStr}`)
      .set('Cookie', adminCookie);

    expect(deleteBookedRes.status).toBe(409);
    expect(deleteBookedRes.body.errorCode).toBe('SLOT_HAS_ACTIVE_BOOKINGS');
    expect(deleteBookedRes.body.message).toContain('KCP-SLT-2026-3003');

    // Verify booked slot still exists
    const scheduleCheck = await request(app)
      .get(`/api/admin/facilities/${football.id}/schedule?date=${todayStr}`)
      .set('Cookie', adminCookie);
    expect(
      scheduleCheck.body.data.facility.slots.some((s: any) => s.id === bookedSlot.id)
    ).toBe(true);

    // 14:00-15:00 on Football Ground has 0 active bookings -> deletion succeeds
    const openSlot = football.slots.find((s: any) => s.start_time === '14:00');
    expect(openSlot.active_bookings_count).toBe(0);

    const deleteOpenRes = await request(app)
      .delete(`/api/admin/facilities/${football.id}/slots/${openSlot.id}?date=${todayStr}`)
      .set('Cookie', adminCookie);

    expect(deleteOpenRes.status).toBe(200);
    expect(deleteOpenRes.body.data.deleted_slot_id).toBe(openSlot.id);

    const scheduleAfterDelete = await request(app)
      .get(`/api/admin/facilities/${football.id}/schedule?date=${todayStr}`)
      .set('Cookie', adminCookie);
    expect(
      scheduleAfterDelete.body.data.facility.slots.some((s: any) => s.id === openSlot.id)
    ).toBe(false);
  });

  it('rejects non-admin users attempting to access Facilities & Slot Manager endpoints (403)', async () => {
    const publicCookie = await loginAs('priya_mohan', 'PriyaSports@2026!');

    const res = await request(app)
      .get('/api/admin/facilities')
      .set('Cookie', publicCookie);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
  });
});
