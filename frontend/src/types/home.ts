/**
 * Type definitions for the Auth (`/login`, `/register`) and Public Home (`/`) screens.
 */
import type { FacilityOperationalStatus } from '@/api/client';

export type AuthTabMode = 'signin' | 'create';

export interface AuthPageContent {
  title: string;
  subtitle: string;
  signInTabLabel: string;
  createAccountTabLabel: string;
  usernamePlaceholder: string;
  passwordPlaceholder: string;
  createUsernamePlaceholder: string;
  createPasswordPlaceholder: string;
  confirmPasswordPlaceholder: string;
  passwordRequirementHint: string;
  forgotPasswordLabel: string;
  forgotPasswordNotice: string;
  signInCtaLabel: string;
  createAccountCtaLabel: string;
  signInErrorMessage: string;
  passwordMismatchErrorMessage: string;
  passwordLengthErrorMessage: string;
  termsPrefixText: string;
  termsLinkLabel: string;
  termsConjunctionText: string;
  privacyLinkLabel: string;
  termsSummaryText: string;
  privacySummaryText: string;
}

export interface AuthMockCredentials {
  validUsername: string;
  invalidDemoUsername: string;
  invalidDemoPassword: string;
  sampleCreateUsername: string;
  sampleCreatePassword: string;
  sampleMismatchConfirmPassword: string;
}

export type HomeFacilityIconName = 'track' | 'football' | 'turf' | 'badminton';

export interface HomeBusyBar {
  heightClass: string;
  colorClass: string;
}

export interface HomeTrackFacility {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  activeMembershipImageUrl: string;
  iconName: HomeFacilityIconName;
  defaultCtaLabel: string;
  to: string;
  operationalStatus?: FacilityOperationalStatus;
}

export interface HomeActiveMembership {
  facilityName: string;
  membershipLabel: string;
  validUntilText: string;
  ctaLabel: string;
  to: string;
  imageUrl: string;
}

export interface HomeUpcomingBooking {
  label: string;
  facilityName: string;
  dateTimeText: string;
  ctaLabel: string;
  to: string;
}

export type HomeHourlyFacilityId = 'football-ground' | 'police-turf' | 'badminton-court';

export interface HomeHourlyFacility {
  id: HomeHourlyFacilityId;
  title: string;
  subtitle: string;
  imageUrl: string;
  iconName: HomeFacilityIconName;
  to: string;
  column: 2 | 3;
  mobileFullSpan?: boolean;
  operationalStatus?: FacilityOperationalStatus;
  desktopBusyBars: HomeBusyBar[];
  mobileBusyBars: HomeBusyBar[];
}

export interface HomeActivityStat {
  id: string;
  value: number;
  label: string;
}

export interface HomeActivitySummary {
  title: string;
  periodLabel: string;
  stats: HomeActivityStat[];
}
