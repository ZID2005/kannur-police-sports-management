import type {
  AuthMockCredentials,
  AuthPageContent,
  HomeActiveMembership,
  HomeActivitySummary,
  HomeHourlyFacility,
  HomeTrackFacility,
  HomeUpcomingBooking,
} from '@/types/home';

/* ============================ AUTH CONTENT ============================ */

export const authPageContent: AuthPageContent = {
  title: 'Welcome',
  subtitle: 'Sign in to book facilities and manage your reservations.',
  signInTabLabel: 'Sign in',
  createAccountTabLabel: 'Create account',
  usernamePlaceholder: 'Username',
  passwordPlaceholder: 'Password',
  createUsernamePlaceholder: 'Username *',
  createPasswordPlaceholder: 'Password *',
  confirmPasswordPlaceholder: 'Confirm password *',
  passwordRequirementHint: 'Use at least 8 characters.',
  forgotPasswordLabel: 'Forgot password?',
  forgotPasswordNotice:
    'Please contact the Kannur City Police Sports Cell office desk with your registered username for password reset assistance.',
  signInCtaLabel: 'Sign in',
  createAccountCtaLabel: 'Create account',
  signInErrorMessage: 'Username or password is incorrect.',
  passwordMismatchErrorMessage: 'Passwords do not match.',
  passwordLengthErrorMessage: 'Use at least 8 characters.',
  termsPrefixText: 'I accept the',
  termsLinkLabel: 'Terms and Conditions',
  termsConjunctionText: 'and the',
  privacyLinkLabel: 'Privacy Notice',
  termsSummaryText:
    'Facility bookings and synthetic track memberships are subject to Kannur City Police sports complex regulations, scheduled slot timings, and confirmed fee receipts.',
  privacySummaryText:
    'Your portal account uses username and password sign-in only and stores just your username, display name, user category, and official booking receipt records.',
};

export const authMockCredentials: AuthMockCredentials = {
  validUsername: 'priya_mohan',
  invalidDemoUsername: 'officer.kannur',
  invalidDemoPassword: 'wrongpassword',
  sampleCreateUsername: 'kcp.athlete',
  sampleCreatePassword: 'SafeP@ssword2026',
  sampleMismatchConfirmPassword: 'DifferentPass',
};

/* ============================ HOME DATA ============================ */

export const homeGreeting = 'Good morning';

export const homeTrackFacility: HomeTrackFacility = {
  id: 'synthetic-track',
  title: 'Synthetic Track',
  subtitle: 'Monthly membership',
  imageUrl: '/images/facilities/synthetic-track.jpg',
  activeMembershipImageUrl: '/images/facilities/synthetic-track.jpg',
  iconName: 'track',
  defaultCtaLabel: 'Get Track Membership',
  to: '/membership',
};

export const homeActiveMembershipPreset: HomeActiveMembership = {
  facilityName: 'Synthetic Track',
  membershipLabel: 'Track membership',
  validUntilText: 'Active until 31 Mar 2027',
  ctaLabel: 'View Receipt',
  to: '/membership/pass',
  imageUrl: '/images/facilities/synthetic-track.jpg',
};

export const homeUpcomingBookingPreset: HomeUpcomingBooking = {
  label: 'Next booking',
  facilityName: 'Football Ground',
  dateTimeText: 'Sat 14 Nov, 8:00 PM',
  ctaLabel: 'View Receipt',
  to: '/bookings/ticket',
};

export const homeActiveMembership: HomeActiveMembership | null = null;
export const homeUpcomingBooking: HomeUpcomingBooking | null = null;

export const homeHourlyFacilities: HomeHourlyFacility[] = [
  {
    id: 'football-ground',
    title: 'Police Parade Ground',
    subtitle: 'Book by the hour',
    imageUrl: '/images/facilities/football-ground.jpg',
    iconName: 'football',
    to: '/bookings?venue=FOOTBALL_GROUND',
    column: 2,
    desktopBusyBars: [
      { heightClass: 'h-2', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-2.5', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-3.5', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-[18px]', colorClass: 'bg-[#1F6FFF]/50' },
      { heightClass: 'h-[22px]', colorClass: 'bg-[#1F6FFF]/80' },
      { heightClass: 'h-7', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-[26px]', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-4', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-2', colorClass: 'bg-[#DCEBFF]' },
    ],
    mobileBusyBars: [
      { heightClass: 'h-1.5', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-2.5', colorClass: 'bg-[#1F6FFF]/60' },
      { heightClass: 'h-[18px]', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#1F6FFF]/80' },
      { heightClass: 'h-1.5', colorClass: 'bg-[#DCEBFF]' },
    ],
  },
  {
    id: 'police-turf',
    title: 'Police Turf',
    subtitle: 'Full or half court',
    imageUrl: '/images/facilities/police-turf.jpg',
    iconName: 'turf',
    to: '/bookings?venue=POLICE_TURF',
    column: 2,
    desktopBusyBars: [
      { heightClass: 'h-2', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-2.5', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-[18px]', colorClass: 'bg-[#1F6FFF]/60' },
      { heightClass: 'h-6', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-7', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-[22px]', colorClass: 'bg-[#1F6FFF]/80' },
      { heightClass: 'h-3.5', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-2', colorClass: 'bg-[#DCEBFF]' },
    ],
    mobileBusyBars: [
      { heightClass: 'h-1.5', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-2', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-4', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-5', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-2.5', colorClass: 'bg-[#BFD9FF]' },
    ],
  },
  {
    id: 'badminton-court',
    title: 'Indoor Badminton Court',
    subtitle: 'Book by court',
    imageUrl: '/images/facilities/badminton-court.jpg',
    iconName: 'badminton',
    to: '/bookings?venue=BADMINTON_COURT',
    column: 3,
    mobileFullSpan: true,
    desktopBusyBars: [
      { heightClass: 'h-2', colorClass: 'bg-[#DCEBFF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-[18px]', colorClass: 'bg-[#1F6FFF]/60' },
      { heightClass: 'h-[22px]', colorClass: 'bg-[#1F6FFF]/80' },
      { heightClass: 'h-7', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-[26px]', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-4', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-2.5', colorClass: 'bg-[#DCEBFF]' },
    ],
    mobileBusyBars: [
      { heightClass: 'h-1.5', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#1F6FFF]/60' },
      { heightClass: 'h-[18px]', colorClass: 'bg-[#1F6FFF]' },
      { heightClass: 'h-3', colorClass: 'bg-[#BFD9FF]' },
      { heightClass: 'h-1.5', colorClass: 'bg-[#DCEBFF]' },
    ],
  },
];

export const homeActivitySummary: HomeActivitySummary = {
  title: 'Your activity',
  periodLabel: 'This month',
  stats: [
    { id: 'bookings', value: 0, label: 'Bookings' },
    { id: 'hours-played', value: 0, label: 'Hours booked' },
    { id: 'coming-up', value: 0, label: 'Coming up' },
  ],
};
