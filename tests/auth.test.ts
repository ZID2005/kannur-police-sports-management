import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AccountStatus, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

// In-memory mock store for unit/integration verification without requiring live PostgreSQL
const mockUsers = new Map<string, any>();
const mockAuditLogs: any[] = [];

vi.mock('../src/config/database', () => {
  return {
    prisma: {
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
          if (!found) return null;
          if (!select) return { ...found };
          const projected: Record<string, any> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) projected[key] = found[key];
          }
          return projected;
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
          mockUsers.set(newUser.id, newUser);
          if (!select) return { ...newUser };
          const projected: Record<string, any> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) projected[key] = (newUser as any)[key];
          }
          return projected;
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
          if (!select) return { ...updated };
          const projected: Record<string, any> = {};
          for (const key of Object.keys(select)) {
            if (select[key]) projected[key] = (updated as any)[key];
          }
          return projected;
        }),
      },
      auditLog: {
        create: vi.fn(async ({ data }: any) => {
          const entry = {
            id: `audit-${mockAuditLogs.length + 1}`,
            ...data,
            created_at: new Date(),
          };
          mockAuditLogs.push(entry);
          return entry;
        }),
      },
    },
  };
});

import app from '../src/app';
import { authenticate, requireRole } from '../src/middleware/auth.middleware';
import { globalErrorHandler } from '../src/middleware/error.middleware';

// Mount a test route to verify `requireRole` middleware behavior
const testApp = express();
testApp.use(app);

describe('Step 1: Authentication, RBAC & Strict Proposal Constraints', () => {
  beforeEach(async () => {
    mockUsers.clear();
    mockAuditLogs.length = 0;

    const adminHash = await hashPassword('KcpAdmin@2026!');
    const suspendedHash = await hashPassword('SuspendedPass@123');
    const bannedHash = await hashPassword('BannedPass@123');

    mockUsers.set('11111111-1111-4111-8111-111111111111', {
      id: '11111111-1111-4111-8111-111111111111',
      username: 'insp_rajeev',
      password_hash: adminHash,
      full_name: 'Inspector Rajeev Kumar (Sports Admin)',
      email: 'insp.rajeev@kannurpolice.kerala.gov.in',
      role: UserRole.STAFF_ADMIN,
      account_status: AccountStatus.ACTIVE,
      ban_reason: null,
      profile_photo_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    mockUsers.set('22222222-2222-4222-8222-222222222222', {
      id: '22222222-2222-4222-8222-222222222222',
      username: 'suspended_member',
      password_hash: suspendedHash,
      full_name: 'Suspended User',
      email: 'suspended@example.org',
      role: UserRole.PUBLIC,
      account_status: AccountStatus.SUSPENDED,
      ban_reason: 'Repeated no-show on booked synthetic track sessions.',
      profile_photo_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    mockUsers.set('33333333-3333-4333-8333-333333333333', {
      id: '33333333-3333-4333-8333-333333333333',
      username: 'banned_member',
      password_hash: bannedHash,
      full_name: 'Banned User',
      email: 'banned@example.org',
      role: UserRole.PUBLIC,
      account_status: AccountStatus.BANNED,
      ban_reason: 'Misconduct and damage to Police Turf property.',
      profile_photo_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

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

  it('registers a PUBLIC account with username & password and sets an HTTP-only session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'priya_mohan',
      password: 'PriyaSports@2026!',
      full_name: 'Priya Mohan',
      email: 'priya.mohan@example.org',
      role: 'PUBLIC',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('priya_mohan');
    expect(res.body.data.user.role).toBe('PUBLIC');
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(Object.keys(res.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('kcp_session=');
    expect(cookies[0]).toContain('HttpOnly');

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(meRes.status).toBe(200);
    expect(Object.keys(meRes.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);
  });

  it('registers a GOVT_PERSONNEL account cleanly without government ID or mobile number fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'si_anand_kcp',
      password: 'GovtOfficer@2026!',
      full_name: 'SI Anandakrishnan M.',
      role: 'GOVT_PERSONNEL',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('GOVT_PERSONNEL');
    expect(Object.keys(res.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    const cookies = res.headers['set-cookie'];
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookies);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.role).toBe('GOVT_PERSONNEL');
    expect(Object.keys(meRes.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);
  });

  it('blocks self-registration for STAFF_ADMIN role', async () => {
    expect(Object.values(UserRole).sort()).toEqual([
      'GOVT_PERSONNEL',
      'PUBLIC',
      'STAFF_ADMIN',
    ]);

    const res = await request(app).post('/api/auth/register').send({
      username: 'rogue_admin',
      password: 'RoguePassword@2026!',
      full_name: 'Unauthorized Officer',
      role: 'STAFF_ADMIN',
    });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('rejects any request containing mobile phone, OTP, or government ID fields (Strict Proposal Constraint)', async () => {
    const mobileRes = await request(app).post('/api/auth/register').send({
      username: 'user_with_phone',
      password: 'ValidPassword@123',
      full_name: 'Test User',
      mobile_number: '9876543210',
    });
    expect(mobileRes.status).toBe(400);
    expect(mobileRes.body.errorCode).toBe('PROHIBITED_IDENTITY_OR_MOBILE_FIELD');

    const govtIdRes = await request(app).post('/api/auth/register').send({
      username: 'user_with_govt_id',
      password: 'ValidPassword@123',
      full_name: 'Test User',
      govt_id_number: 'GOV-ID-998877',
    });
    expect(govtIdRes.status).toBe(400);
    expect(govtIdRes.body.errorCode).toBe('PROHIBITED_IDENTITY_OR_MOBILE_FIELD');
  });

  it('blocks BANNED users on /api/auth/login with HTTP 403 and explicit ban reason', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'banned_member',
      password: 'BannedPass@123',
    });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('ACCOUNT_BANNED');
    expect(res.body.message).toContain('permanently BANNED');
    expect(res.body.message).toContain('Misconduct and damage to Police Turf property.');
  });

  it('blocks SUSPENDED users on /api/auth/login with HTTP 403 and explicit suspension reason', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'suspended_member',
      password: 'SuspendedPass@123',
    });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('ACCOUNT_SUSPENDED');
    expect(res.body.message).toContain('SUSPENDED');
    expect(res.body.message).toContain('Repeated no-show on booked synthetic track sessions.');
  });

  it('logs in STAFF_ADMIN (insp_rajeev), records an officer audit log, fetches /api/auth/me, and logs out', async () => {
    const agent = request.agent(app);

    const loginRes = await agent.post('/api/auth/login').send({
      username: 'insp_rajeev',
      password: 'KcpAdmin@2026!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('STAFF_ADMIN');
    expect(mockAuditLogs.length).toBe(1);
    expect(mockAuditLogs[0].action_category).toBe('OFFICER_AUTH');

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.username).toBe('insp_rajeev');
    expect(Object.keys(meRes.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);
  });

  it('enforces requireRole middleware accurately across roles', async () => {
    const rbacApp = express();
    rbacApp.use(express.json());
    const cookieParser = (await import('cookie-parser')).default;
    rbacApp.use(cookieParser());
    rbacApp.get(
      '/api/admin-only',
      authenticate,
      requireRole(UserRole.STAFF_ADMIN),
      (_req, res) => {
        res.status(200).json({ ok: true });
      }
    );
    rbacApp.use(globalErrorHandler);

    // Register a PUBLIC user on main app to obtain a valid PUBLIC session cookie
    const regRes = await request(app).post('/api/auth/register').send({
      username: 'public_citizen',
      password: 'CitizenPass@2026!',
      full_name: 'Public Citizen',
      role: 'PUBLIC',
    });
    const publicCookie = regRes.headers['set-cookie'];

    const forbiddenRes = await request(rbacApp)
      .get('/api/admin-only')
      .set('Cookie', publicCookie);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.errorCode).toBe('INSUFFICIENT_ROLE_PERMISSIONS');

    // Login as STAFF_ADMIN to obtain admin cookie
    const adminLoginRes = await request(app).post('/api/auth/login').send({
      username: 'insp_rajeev',
      password: 'KcpAdmin@2026!',
    });
    const adminCookie = adminLoginRes.headers['set-cookie'];

    const allowedRes = await request(rbacApp).get('/api/admin-only').set('Cookie', adminCookie);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.ok).toBe(true);
  });

  it('persists benign onboarding demographics (Gender including TRANSGENDER, DOB, Residential Address) via PATCH /api/auth/me while blocking prohibited fields', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      username: 'profile_runner',
      password: 'RunnerPass@2026!',
      full_name: 'Maya Krishnan',
      role: 'PUBLIC',
    });
    expect(regRes.status).toBe(201);
    const cookie = regRes.headers['set-cookie'];

    const patchRes = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', cookie)
      .send({
        gender: 'TRANSGENDER',
        date_of_birth: '1997-05-19',
        parent_name: 'Krishnan Kutty',
        present_address: 'Green Valley, House No. 14',
        city_locality: 'Thottada, Kannur',
        pin_code: '670007',
        permanent_address: 'Green Valley, House No. 14, Thottada, Kannur 670007',
        track_purpose: 'Morning endurance conditioning',
        is_registered_sportsperson: true,
        sport_discipline: 'Athletics',
        association_details: 'Kannur District Athletics Association',
      });

    expect(patchRes.status).toBe(200);
    expect(Object.keys(patchRes.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);
    expect(patchRes.body.data.user.gender).toBe('TRANSGENDER');
    expect(patchRes.body.data.user.date_of_birth).toBe('1997-05-19');
    expect(patchRes.body.data.user.city_locality).toBe('Thottada, Kannur');
    expect(patchRes.body.data.user.pin_code).toBe('670007');
    expect(patchRes.body.data.user.is_registered_sportsperson).toBe(true);

    // Confirm persistence on subsequent GET /api/auth/me
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.gender).toBe('TRANSGENDER');
    expect(meRes.body.data.user.present_address).toBe('Green Valley, House No. 14');

    // Confirm prohibited fields are still strictly rejected on profile updates
    const blockedRes = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', cookie)
      .send({ mobile_number: '9988776655' });
    expect(blockedRes.status).toBe(400);
    expect(blockedRes.body.errorCode).toBe('PROHIBITED_IDENTITY_OR_MOBILE_FIELD');
  });

  it('auto-derives a unique username from full_name when username is omitted and supports signing in by full name or derived username', async () => {
    const firstRes = await request(app).post('/api/auth/register').send({
      full_name: 'Anil Kumar',
      password: 'AnilPassword@2026!',
      role: 'PUBLIC',
    });

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.data.user.full_name).toBe('Anil Kumar');
    expect(firstRes.body.data.user.username).toBe('anil.kumar');
    expect(Object.keys(firstRes.body.data.user).sort()).toEqual(EXPECTED_USER_KEYS);

    // Second registration with the exact same name receives an automatic unique suffix
    const secondRes = await request(app).post('/api/auth/register').send({
      full_name: 'Anil Kumar',
      password: 'SecondPassword@2026!',
      role: 'PUBLIC',
    });

    expect(secondRes.status).toBe(201);
    expect(secondRes.body.data.user.username).toBe('anil.kumar2');

    // Signing in using the full name ("Anil Kumar") works seamlessly
    const loginByNameRes = await request(app).post('/api/auth/login').send({
      username: 'Anil Kumar',
      password: 'AnilPassword@2026!',
    });
    expect(loginByNameRes.status).toBe(200);
    expect(loginByNameRes.body.data.user.username).toBe('anil.kumar');

    // Signing in using the derived username ("anil.kumar") also works
    const loginByHandleRes = await request(app).post('/api/auth/login').send({
      username: 'anil.kumar',
      password: 'AnilPassword@2026!',
    });
    expect(loginByHandleRes.status).toBe(200);
    expect(loginByHandleRes.body.data.user.username).toBe('anil.kumar');
  });
});
