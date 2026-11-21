/**
 * ─────────────────────────────────────────────────────────────────────
 *  SAMPLE DATA — single source of mock data for the whole frontend.
 *  Replace each export with a call to the matching backend endpoint
 *  (served under `/api`, proxied to http://localhost:5000 in dev).
 *
 *  NOTE: By design, no government ID numbers, mobile phone
 *  numbers or SMS / OTP data are stored or displayed anywhere.
 * ─────────────────────────────────────────────────────────────────────
 */
import type { NavItem, PublicUserSession, StaffSession } from '@/types';

/* ============================== SESSIONS ============================== */

export const currentUser: PublicUserSession = {
  username: 'anilkumar',
  displayName: 'Anil Kumar',
  accountType: 'Citizen Account',
};

export const currentStaff: StaffSession = {
  name: 'Insp. Rajeev K.',
  designation: 'Duty Officer - Kannur City',
  pin: '51209',
  initials: 'RK',
};

/* ============================= NAVIGATION ============================= */

export const publicNav: NavItem[] = [
  { label: 'Home', to: '/', end: true },
  { label: 'Bookings', to: '/bookings' },
  { label: 'My Bookings', to: '/my-bookings' },
  { label: 'Membership', to: '/membership' },
];

export const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Facilities & Slots', to: '/admin/facilities', icon: 'stadium' },
  { label: 'Bookings', to: '/admin/bookings', icon: 'calendar_month' },
  { label: 'Members', to: '/admin/members', icon: 'group' },
  { label: 'Payments', to: '/admin/payments', icon: 'payments' },
  { label: 'Audit Log', to: '/admin/audit-log', icon: 'history' },
];

/* ========================== AREA SAMPLE DATA ========================== */
export * from './mock/home';
export * from './mock/membership';
export * from './mock/bookings';
export * from './mock/adminMemberships';
export * from './mock/adminOps';
export * from './mock/adminAudit';
