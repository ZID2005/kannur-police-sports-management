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

describe('Admin Immutable Audit Log (/api/admin/audit-logs) & Financial Ledger (/api/admin/payments)', () => {
  const todayStr = formatDateOnly(new Date());

  beforeEach(() => {
    activeDb = createInMemoryPrisma();
  });

  // ==========================================================================
  // 1. LIVE IMMUTABLE AUDIT LOG
  // ==========================================================================
  describe('1. Live Immutable Audit Log', () => {
    it('automatically appends immutable audit entries for facility creation, edit, status toggle, slot creation, edit, block/unblock (with reason), and slot deletion', async () => {
      const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

      // 1a. Verify seeded entries strictly use allowed operational action categories
      const initialRes = await request(app)
        .get('/api/admin/audit-logs?limit=100')
        .set('Cookie', adminCookie);

      expect(initialRes.status).toBe(200);
      expect(initialRes.body.success).toBe(true);
      expect(initialRes.body.data.audit_logs.length).toBeGreaterThan(0);

      const allowedSeedCategories = new Set([
        'SYSTEM_SEED',
        'FACILITY_UPDATED',
        'FACILITY_SLOT_BLOCKED',
        'OFFICE_RECEIPT_PAYMENT',
        'OFFICER_AUTH',
      ]);
      for (const entry of initialRes.body.data.audit_logs) {
        expect(allowedSeedCategories.has(entry.action_category)).toBe(true);
      }

      // 1b. Facility created (POST /api/admin/facilities)
      const createFacRes = await request(app)
        .post('/api/admin/facilities')
        .set('Cookie', adminCookie)
        .send({
          name: 'Kannur Police Volleyball Arena',
          category: 'Outdoor Court',
          court_count: 2,
          court_unit_label: 'Courts',
          operational_status: 'ACTIVE',
          max_capacity_per_slot: 2,
          operating_start: '06:00',
          operating_end: '10:00',
          slot_duration_mins: 60,
          daily_user_hour_cap: 2,
          public_rate: 500,
          govt_rate: 300,
          description: 'Floodlit regulation volleyball courts.',
        });
      expect(createFacRes.status).toBe(201);
      const createdFacility = createFacRes.body.data.facility;

      // 1c. Facility details & pricing updated (PATCH /api/admin/facilities/:id)
      const updateFacRes = await request(app)
        .patch(`/api/admin/facilities/${createdFacility.id}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Kannur Police Floodlit Volleyball Arena',
          public_rate: 550,
          govt_rate: 325,
        });
      expect(updateFacRes.status).toBe(200);

      // 1d. Facility operational status toggled (PATCH /api/admin/facilities/:id/status)
      const statusRes = await request(app)
        .patch(`/api/admin/facilities/${createdFacility.id}/status`)
        .set('Cookie', adminCookie)
        .send({
          operational_status: 'MAINTENANCE',
          reason: 'Net pole anchoring inspection',
        });
      expect(statusRes.status).toBe(200);

      // 1e. Slot created (POST /api/admin/facilities/:facilityId/slots)
      const createSlotRes = await request(app)
        .post(`/api/admin/facilities/${createdFacility.id}/slots`)
        .set('Cookie', adminCookie)
        .send({
          start_time: '18:00',
          end_time: '19:00',
          max_capacity: 2,
        });
      expect(createSlotRes.status).toBe(201);
      const createdSlot = createSlotRes.body.data.slot;

      // 1f. Slot edited (PATCH /api/admin/facilities/:facilityId/slots/:slotId)
      const editSlotRes = await request(app)
        .patch(`/api/admin/facilities/${createdFacility.id}/slots/${createdSlot.id}`)
        .set('Cookie', adminCookie)
        .send({
          end_time: '19:30',
          max_capacity: 4,
        });
      expect(editSlotRes.status).toBe(200);

      // 1g. Slot blocked with type & reason (PATCH /api/admin/facilities/:facilityId/slots/:slotId/block)
      const blockSlotRes = await request(app)
        .patch(`/api/admin/facilities/${createdFacility.id}/slots/${createdSlot.id}/block`)
        .set('Cookie', adminCookie)
        .send({
          blocked: true,
          date: todayStr,
          block_status: 'BLOCKED_MAINTENANCE',
          reason: 'LED floodlight fixture servicing',
        });
      expect(blockSlotRes.status).toBe(200);

      // 1h. Slot unblocked
      const unblockSlotRes = await request(app)
        .patch(`/api/admin/facilities/${createdFacility.id}/slots/${createdSlot.id}/block`)
        .set('Cookie', adminCookie)
        .send({
          blocked: false,
          date: todayStr,
          reason: 'Servicing completed ahead of schedule',
        });
      expect(unblockSlotRes.status).toBe(200);

      // 1i. Slot deleted (DELETE /api/admin/facilities/:facilityId/slots/:slotId)
      const deleteSlotRes = await request(app)
        .delete(
          `/api/admin/facilities/${createdFacility.id}/slots/${createdSlot.id}?date=${todayStr}`
        )
        .set('Cookie', adminCookie);
      expect(deleteSlotRes.status).toBe(200);

      // Verify all 8 operational mutations appear in GET /api/admin/audit-logs with full metadata
      const logsRes = await request(app)
        .get(`/api/admin/audit-logs?from_date=${todayStr}&to_date=${todayStr}&limit=100`)
        .set('Cookie', adminCookie);

      expect(logsRes.status).toBe(200);
      const logs: any[] = logsRes.body.data.audit_logs;

      const findLog = (category: string, refId?: string) =>
        logs.find(
          (l) =>
            l.action_category === category && (!refId || l.target_ref_id === refId)
        );

      const facCreatedLog = findLog('FACILITY_CREATED', createdFacility.code);
      expect(facCreatedLog).toBeDefined();
      expect(facCreatedLog.officer_username).toBe('insp_rajeev');
      expect(facCreatedLog.officer_role).toBe('STAFF_ADMIN');
      expect(facCreatedLog.target_entity).toBe('FACILITY');
      expect(new Date(facCreatedLog.timestamp).toISOString()).toBe(facCreatedLog.timestamp);
      expect(facCreatedLog.details.public_rate).toBe(500);

      const facUpdatedLog = findLog('FACILITY_UPDATED', createdFacility.code);
      expect(facUpdatedLog).toBeDefined();
      expect(facUpdatedLog.target_entity).toBe('FACILITY');
      expect(facUpdatedLog.details.public_rate).toBe(550);
      expect(facUpdatedLog.details.govt_rate).toBe(325);

      const facStatusLog = findLog('FACILITY_STATUS_UPDATED', createdFacility.code);
      expect(facStatusLog).toBeDefined();
      expect(facStatusLog.details.previous_status).toBe('ACTIVE');
      expect(facStatusLog.details.new_status).toBe('MAINTENANCE');
      expect(facStatusLog.reason).toContain('Net pole anchoring inspection');

      const slotCreatedLog = findLog('FACILITY_SLOT_CREATED', createdSlot.id);
      expect(slotCreatedLog).toBeDefined();
      expect(slotCreatedLog.target_entity).toBe('SLOT');

      const slotUpdatedLog = findLog('FACILITY_SLOT_UPDATED', createdSlot.id);
      expect(slotUpdatedLog).toBeDefined();
      expect(slotUpdatedLog.details.max_capacity).toBe(4);
      expect(slotUpdatedLog.details.end_time).toBe('19:30');

      const slotBlockedLog = findLog('FACILITY_SLOT_BLOCKED', createdSlot.id);
      expect(slotBlockedLog).toBeDefined();
      expect(slotBlockedLog.details.block_type).toBe('BLOCKED_MAINTENANCE');
      expect(slotBlockedLog.reason).toBe('LED floodlight fixture servicing');

      const slotUnblockedLog = findLog('FACILITY_SLOT_UNBLOCKED', createdSlot.id);
      expect(slotUnblockedLog).toBeDefined();
      expect(slotUnblockedLog.details.previous_block_type).toBe('BLOCKED_MAINTENANCE');
      expect(slotUnblockedLog.reason).toBe('Servicing completed ahead of schedule');

      const slotDeletedLog = findLog('FACILITY_SLOT_DELETED', createdSlot.id);
      expect(slotDeletedLog).toBeDefined();
      expect(slotDeletedLog.target_entity).toBe('SLOT');
      expect(slotDeletedLog.details.deleted_slot_id).toBe(createdSlot.id);

      // Verify category group filters, search query, and pagination
      const facilityGroupRes = await request(app)
        .get('/api/admin/audit-logs?action_category=FACILITIES')
        .set('Cookie', adminCookie);
      expect(facilityGroupRes.status).toBe(200);
      expect(
        facilityGroupRes.body.data.audit_logs.every(
          (l: any) => l.target_entity === 'FACILITY'
        )
      ).toBe(true);

      const searchRes = await request(app)
        .get('/api/admin/audit-logs?search=floodlight%20fixture')
        .set('Cookie', adminCookie);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.audit_logs).toHaveLength(1);
      expect(searchRes.body.data.audit_logs[0].action_category).toBe('FACILITY_SLOT_BLOCKED');

      const pagedRes = await request(app)
        .get('/api/admin/audit-logs?page=2&limit=3')
        .set('Cookie', adminCookie);
      expect(pagedRes.status).toBe(200);
      expect(pagedRes.body.data.pagination.page).toBe(2);
      expect(pagedRes.body.data.pagination.limit).toBe(3);
      expect(pagedRes.body.data.audit_logs).toHaveLength(3);
    });

    it('enforces strict immutability (no edit/delete API endpoints & DB rejects mutations) and STAFF_ADMIN RBAC', async () => {
      const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');
      const publicCookie = await loginAs('priya_mohan', 'PriyaSports@2026!');
      const govtCookie = await loginAs('si_anand', 'AnandPolice@2026!');

      const logsRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', adminCookie);
      const firstId = logsRes.body.data.audit_logs[0].id;

      // No PATCH / PUT / DELETE endpoints exist for audit logs
      const patchRes = await request(app)
        .patch(`/api/admin/audit-logs/${firstId}`)
        .set('Cookie', adminCookie)
        .send({ action_description: 'tampered' });
      expect(patchRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete(`/api/admin/audit-logs/${firstId}`)
        .set('Cookie', adminCookie);
      expect(deleteRes.status).toBe(404);

      // Direct DB-level update/delete attempts must throw AUDIT_LOG_IMMUTABLE
      await expect(
        activeDb.auditLog.update({ where: { id: firstId }, data: { action_description: 'x' } })
      ).rejects.toMatchObject({ errorCode: 'AUDIT_LOG_IMMUTABLE', statusCode: 403 });

      await expect(
        activeDb.auditLog.delete({ where: { id: firstId } })
      ).rejects.toMatchObject({ errorCode: 'AUDIT_LOG_IMMUTABLE', statusCode: 403 });

      // RBAC checks
      const unauthRes = await request(app).get('/api/admin/audit-logs');
      expect(unauthRes.status).toBe(401);

      const pubRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', publicCookie);
      expect(pubRes.status).toBe(403);
      expect(pubRes.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');

      const govtRes = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', govtCookie);
      expect(govtRes.status).toBe(403);
      expect(govtRes.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
    });
  });

  // ==========================================================================
  // 2. ADMIN PAYMENTS & FINANCIAL LEDGER + DASHBOARD REVENUE SYNC
  // ==========================================================================
  describe('2. Admin Payments & Financial Ledger (/api/admin/payments)', () => {
    it('accurately computes Base Fee, Govt/Police Concession, Taxable Subtotal, GST, Final Total Paid, and KPI totals across filters', async () => {
      const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

      // 2a. Unfiltered full ledger verification
      const allRes = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', adminCookie);

      expect(allRes.status).toBe(200);
      expect(allRes.body.success).toBe(true);

      const { summary, payments, facilities } = allRes.body.data;
      expect(facilities.length).toBe(4);
      expect(payments).toHaveLength(8);

      // Seeded 6 SETTLED payments:
      // 4001: Public Track (1500 base, 0 conc, 1500 taxable, 270 GST, 1770 total)
      // 4002: Public Turf Half (800 base, 0 conc, 800 taxable, 144 GST, 944 total)
      // 4003: Govt Football (2000 base, 800 conc, 1200 taxable, 216 GST, 1416 total)
      // 4004: Public Badminton (400 base, 0 conc, 400 taxable, 72 GST, 472 total)
      // 4005: Public Turf Full (1400 base, 0 conc, 1400 taxable, 252 GST, 1652 total)
      // 4006: Public Badminton (400 base, 0 conc, 400 taxable, 72 GST, 472 total)
      // Total settled: Gross Base 6500, Concession 800, Taxable 5700, GST 1026, Total 6726
      // Seeded 2 PENDING_RECONCILIATION payments: 4007 (1416) + 4008 (295) = 1711.00
      expect(summary.total_records).toBe(8);
      expect(summary.completed_transactions_count).toBe(6);
      expect(summary.pending_transactions_count).toBe(2);
      expect(summary.total_gross_base_fee).toBe('6500.00');
      expect(summary.total_concessions_applied).toBe('800.00');
      expect(summary.concession_transactions_count).toBe(1);
      expect(summary.total_taxable_subtotal).toBe('5700.00');
      expect(summary.gst_collected).toBe('1026.00');
      expect(summary.total_revenue).toBe('6726.00');
      expect(summary.pending_amount).toBe('1711.00');

      // Inspect individual pricing breakdowns
      const govtFootball = payments.find((p: any) => p.receipt_no === 'RCP-KCP-2026-4003');
      expect(govtFootball.user_category).toBe('GOVT_PERSONNEL');
      expect(govtFootball.pricing_breakdown).toEqual({
        base_fee: '2000.00',
        concession_discount: '800.00',
        concession_percent: 40,
        taxable_subtotal: '1200.00',
        gst_rate: 18,
        gst_amount: '216.00',
        final_total_paid: '1416.00',
      });

      const govtBadmintonPending = payments.find(
        (p: any) => p.receipt_no === 'RCP-KCP-2026-4008'
      );
      expect(govtBadmintonPending.status).toBe('PENDING_RECONCILIATION');
      expect(govtBadmintonPending.pricing_breakdown).toEqual({
        base_fee: '400.00',
        concession_discount: '150.00',
        concession_percent: 37.5,
        taxable_subtotal: '250.00',
        gst_rate: 18,
        gst_amount: '45.00',
        final_total_paid: '295.00',
      });

      const publicTrack = payments.find((p: any) => p.receipt_no === 'RCP-KCP-2026-4001');
      expect(publicTrack.user_category).toBe('PUBLIC');
      expect(publicTrack.pricing_breakdown).toEqual({
        base_fee: '1500.00',
        concession_discount: '0.00',
        concession_percent: 0,
        taxable_subtotal: '1500.00',
        gst_rate: 18,
        gst_amount: '270.00',
        final_total_paid: '1770.00',
      });

      // 2b. Filter by user_category=GOVT_PERSONNEL
      const govtOnlyRes = await request(app)
        .get('/api/admin/payments?user_category=GOVT_PERSONNEL')
        .set('Cookie', adminCookie);
      expect(govtOnlyRes.status).toBe(200);
      expect(govtOnlyRes.body.data.payments).toHaveLength(3);
      expect(govtOnlyRes.body.data.summary.completed_transactions_count).toBe(1);
      expect(govtOnlyRes.body.data.summary.pending_transactions_count).toBe(2);
      expect(govtOnlyRes.body.data.summary.total_revenue).toBe('1416.00');
      expect(govtOnlyRes.body.data.summary.gst_collected).toBe('216.00');
      expect(govtOnlyRes.body.data.summary.total_concessions_applied).toBe('800.00');

      // 2c. Filter by user_category=PUBLIC
      const publicOnlyRes = await request(app)
        .get('/api/admin/payments?user_category=PUBLIC')
        .set('Cookie', adminCookie);
      expect(publicOnlyRes.status).toBe(200);
      expect(publicOnlyRes.body.data.payments).toHaveLength(5);
      expect(publicOnlyRes.body.data.summary.total_revenue).toBe('5310.00');
      expect(publicOnlyRes.body.data.summary.gst_collected).toBe('810.00');
      expect(publicOnlyRes.body.data.summary.total_concessions_applied).toBe('0.00');

      // 2d. Filter by facility_code=POLICE_TURF
      const turfRes = await request(app)
        .get('/api/admin/payments?facility_code=POLICE_TURF')
        .set('Cookie', adminCookie);
      expect(turfRes.status).toBe(200);
      expect(turfRes.body.data.payments).toHaveLength(2);
      expect(turfRes.body.data.summary.total_revenue).toBe('2596.00');
      expect(turfRes.body.data.summary.gst_collected).toBe('396.00');

      // 2e. Filter by status=PENDING_RECONCILIATION (and PENDING alias)
      const pendingRes = await request(app)
        .get('/api/admin/payments?status=PENDING')
        .set('Cookie', adminCookie);
      expect(pendingRes.status).toBe(200);
      expect(pendingRes.body.data.payments).toHaveLength(2);
      expect(pendingRes.body.data.summary.completed_transactions_count).toBe(0);
      expect(pendingRes.body.data.summary.pending_transactions_count).toBe(2);
      expect(pendingRes.body.data.summary.pending_amount).toBe('1711.00');
      expect(pendingRes.body.data.summary.total_revenue).toBe('0.00');

      // 2f. Filter by search + date range + CSV export
      const searchRes = await request(app)
        .get(`/api/admin/payments?search=anandakrishnan&to_date=${todayStr}`)
        .set('Cookie', adminCookie);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.payments).toHaveLength(2);

      const csvRes = await request(app)
        .get('/api/admin/payments?user_category=GOVT_PERSONNEL&format=csv')
        .set('Cookie', adminCookie);
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.text).toContain(
        'base_fee,concession_discount,taxable_subtotal,gst_rate_percent,gst_amount,final_total_paid'
      );
      expect(csvRes.text).toContain('RCP-KCP-2026-4003');
      expect(csvRes.text).toContain('2000.00,800.00,1200.00,18,216.00,1416.00');
    });

    it('keeps Admin Dashboard monthly_revenue synced with live payments aggregation before and after a new office receipt settlement', async () => {
      const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

      const dashBefore = await request(app)
        .get('/api/admin/dashboard-overview')
        .set('Cookie', adminCookie);
      const paymentsBefore = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', adminCookie);

      expect(dashBefore.status).toBe(200);
      expect(paymentsBefore.status).toBe(200);
      expect(dashBefore.body.data.kpis.monthly_revenue).toBe('6726.00');
      expect(paymentsBefore.body.data.summary.monthly_revenue).toBe('6726.00');
      expect(dashBefore.body.data.kpis.monthly_revenue).toBe(
        paymentsBefore.body.data.summary.total_revenue
      );

      // Record an offline office receipt for SI Anand's PENDING_PAYMENT Badminton booking (KCP-SLT-2026-3002: ₹295.00)
      const receiptRes = await request(app)
        .post('/api/admin/payments/office-receipt')
        .set('Cookie', adminCookie)
        .send({
          reference_type: 'SLOT_BOOKING',
          pass_or_booking_code: 'KCP-SLT-2026-3002',
          treasury_challan_no: 'TR-KCP-2026-7788',
          remarks: 'Counter receipt verified at Police Welfare Desk',
        });
      expect(receiptRes.status).toBe(201);
      expect(Object.keys(receiptRes.body.data).sort()).toEqual([
        'payment',
        'receipt',
        'slot_booking',
      ]);
      expect(receiptRes.body.data.receipt).toMatchObject({
        receipt_no: receiptRes.body.data.payment.receipt_no,
        booking_or_pass_code: 'KCP-SLT-2026-3002',
        facility_code: 'BADMINTON_COURT',
        user_category: 'GOVT_PERSONNEL',
        payment_mode: 'OFFICE_RECEIPT',
        pricing_breakdown: {
          base_fee: '400.00',
          concession_discount: '150.00',
          concession_percent: 37.5,
          taxable_subtotal: '250.00',
          gst_rate: 18,
          gst_amount: '45.00',
          final_total_paid: '295.00',
        },
      });

      const dashAfter = await request(app)
        .get('/api/admin/dashboard-overview')
        .set('Cookie', adminCookie);
      const paymentsAfter = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', adminCookie);

      for (const paymentItem of paymentsAfter.body.data.payments) {
        expect(paymentItem.receipt_no).toBeTruthy();
        expect(paymentItem.pricing_breakdown).toBeDefined();
      }

      // 6726.00 + 295.00 = 7021.00 on BOTH Dashboard and Payments Ledger
      expect(dashAfter.body.data.kpis.monthly_revenue).toBe('7021.00');
      expect(paymentsAfter.body.data.summary.monthly_revenue).toBe('7021.00');
      expect(paymentsAfter.body.data.summary.total_revenue).toBe('7021.00');
      // Govt concessions increase from 800.00 -> 950.00 (+150.00 Badminton concession)
      expect(paymentsAfter.body.data.summary.total_concessions_applied).toBe('950.00');
      // GST collected increases from 1026.00 -> 1071.00 (+45.00)
      expect(paymentsAfter.body.data.summary.gst_collected).toBe('1071.00');

      // Audit log also recorded the office receipt automatically
      const auditRes = await request(app)
        .get('/api/admin/audit-logs?action_category=OFFICE_RECEIPT_PAYMENT')
        .set('Cookie', adminCookie);
      expect(auditRes.status).toBe(200);
      expect(
        auditRes.body.data.audit_logs.some(
          (l: any) => l.target_ref_id === receiptRes.body.data.payment.receipt_no
        )
      ).toBe(true);
    });

    it('strictly enforces STAFF_ADMIN RBAC on GET /api/admin/payments', async () => {
      const publicCookie = await loginAs('priya_mohan', 'PriyaSports@2026!');
      const govtCookie = await loginAs('si_anand', 'AnandPolice@2026!');

      const unauthRes = await request(app).get('/api/admin/payments');
      expect(unauthRes.status).toBe(401);

      const pubRes = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', publicCookie);
      expect(pubRes.status).toBe(403);
      expect(pubRes.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');

      const govtRes = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', govtCookie);
      expect(govtRes.status).toBe(403);
      expect(govtRes.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');
    });

    it('returns clean Admin Member Directory records with category badges and strict allowed fields', async () => {
      const adminCookie = await loginAs('insp_rajeev', 'KcpAdmin@2026!');

      const membersRes = await request(app)
        .get('/api/admin/members')
        .set('Cookie', adminCookie);

      expect(membersRes.status).toBe(200);
      expect(membersRes.body.success).toBe(true);
      expect(membersRes.body.data.members.length).toBeGreaterThan(0);

      const roles = new Set(membersRes.body.data.members.map((m: any) => m.role));
      expect(roles.has('PUBLIC')).toBe(true);
      expect(roles.has('GOVT_PERSONNEL')).toBe(true);

      const EXPECTED_DIRECTORY_KEYS = [
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
      ];
      for (const member of membersRes.body.data.members) {
        expect(Object.keys(member).sort()).toEqual(EXPECTED_DIRECTORY_KEYS);
      }
    });
  });
});
