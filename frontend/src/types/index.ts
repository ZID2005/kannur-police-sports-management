/**
 * Shared domain types used across the frontend.
 * Page-specific types live in `src/types/<area>.ts` and are re-exported here.
 */

export type Language = 'EN' | 'ML';

export type UserRole = 'PUBLIC_USER' | 'STAFF' | 'OFFICER_ADMIN' | 'GATE_SCANNER';

export interface PublicUserSession {
  username: string;
  displayName: string;
  accountType: string;
  avatarUrl?: string;
}

export interface StaffSession {
  name: string;
  designation: string;
  pin: string;
  initials: string;
}

export interface GateOfficerSession {
  name: string;
  deskId: string;
  initials: string;
}

export interface NavItem {
  label: string;
  to: string;
  /** Material Symbols ligature name (admin) */
  icon?: string;
  end?: boolean;
}
