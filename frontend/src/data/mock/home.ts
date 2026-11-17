import type {
  AuthMockCredentials,
  AuthPageContent,
  HomeActiveMembership,
  HomeActivitySummary,
  HomeHourlyFacility,
  HomeTrackFacility,
  HomeUpcomingBooking,
} from '@/types/home';

/* ============================ AUTH MOCK DATA ============================ */

export const authPageContent: AuthPageContent = {
  title: 'Welcome',
  subtitle: 'Sign in to book facilities and manage your track membership.',
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
    'Password recovery instructions have been sent via portal notification. Please contact the Kannur City Police Sports Cell desk if you need further assistance.',
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
    'Facility bookings and synthetic track memberships are subject to Kannur City Police stadium regulations, scheduled slot timings, and valid QR pass verification at the entry gate.',
  privacySummaryText:
    'Your portal account stores only your username, booking history, and membership pass status for gate verification. No government ID numbers or phone numbers are collected.',
};

export const authMockCredentials: AuthMockCredentials = {
  validUsername: 'anilkumar',
  invalidDemoUsername: 'officer.kannur',
  invalidDemoPassword: 'wrongpassword',
  sampleCreateUsername: 'kcp.athlete',
  sampleCreatePassword: 'SafeP@ssword2026',
  sampleMismatchConfirmPassword: 'DifferentPass',
};

/* ============================ HOME MOCK DATA ============================ */

export const homeGreeting = 'Good morning';

export const homeTrackFacility: HomeTrackFacility = {
  id: 'synthetic-track',
  title: 'Synthetic Track',
  subtitle: 'Monthly membership',
  imageUrl:
    'https://lh3.googleusercontent.com/aida/ALJJyrDrCwEjrgcdsFVTBjEoiUWpOuDLAnk1vtGV6to2_hLSazCeBTokWMmMTZQTmBe9DKU6LNYynTdeSrGf8lw3LrIkqLQrmEXTKDg765a8hQEXgy7zIIi5WeHysS4Lf-eaovp3VLMYwvRD33U7hwV-P5hj0Qlp-HSY5kWaE5ynkrOuJvd1GLdopt9_BOK7elmgX_wxvbGK-3AtoWLYn0gmGFtT3pxkXnFXr5kY0sUfUYI1',
  activeMembershipImageUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAV_Hrgfy9vbDdz24vq7zvqtz5r6zP0uBxPuZFB7m22wLK5qfeF5XnkTeh_jBKSuDt9H6dz135vfXDSwbxadDOP1E0kgjx01WP8n3htywIDJg_JcqVv5Ep5BR-DCDMPgLJL81QaGw4d5ijm699RZunoJ135uRHe7QaM6S7WIliVsyYHr1UGnIcK7OablK5_Wv9aYU2X1jG7bO5rzhqEtM9dpuwFD7oE3pQ2m2fOhsw',
  iconName: 'track',
  defaultCtaLabel: 'Apply for membership',
  to: '/membership',
};

export const homeActiveMembershipPreset: HomeActiveMembership = {
  facilityName: 'Synthetic Track',
  membershipLabel: 'Track membership',
  validUntilText: 'Active until 31 Mar 2027',
  ctaLabel: 'View card',
  to: '/membership/pass',
  imageUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAV_Hrgfy9vbDdz24vq7zvqtz5r6zP0uBxPuZFB7m22wLK5qfeF5XnkTeh_jBKSuDt9H6dz135vfXDSwbxadDOP1E0kgjx01WP8n3htywIDJg_JcqVv5Ep5BR-DCDMPgLJL81QaGw4d5ijm699RZunoJ135uRHe7QaM6S7WIliVsyYHr1UGnIcK7OablK5_Wv9aYU2X1jG7bO5rzhqEtM9dpuwFD7oE3pQ2m2fOhsw',
};

export const homeUpcomingBookingPreset: HomeUpcomingBooking = {
  label: 'Next booking',
  facilityName: 'Football Ground',
  dateTimeText: 'Sat 14 Nov, 8:00 PM',
  ctaLabel: 'View QR',
  to: '/bookings/ticket',
};

/**
 * Set to `homeActiveMembershipPreset` (or pass via props / URL `?state=active-membership`)
 * to render the active membership strip on the Synthetic Track card.
 */
export const homeActiveMembership: HomeActiveMembership | null = null;

/**
 * Set to `homeUpcomingBookingPreset` (or pass via props / URL `?state=upcoming-booking`)
 * to render the upcoming booking QR banner above the Bento Grid.
 */
export const homeUpcomingBooking: HomeUpcomingBooking | null = null;

export const homeHourlyFacilities: HomeHourlyFacility[] = [
  {
    id: 'football-ground',
    title: 'Football Ground',
    subtitle: 'Book by the hour',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrDN8uRQ2Bc7rXPf_fS1zxIoJOZJJ4hZ6wZZaOhbBVuA0NJ9wf8rNiT3q5zWnLV_vqUjpfEMQ-ruvjO7RgXjUYxu1QGepkTvmFzhYgeIjkOQKFAAQWFwdA7z4KfCwYd33p0cvyc5o34pwKZ4ZueMtqH5lIDWoKvENpB4KhDpdE39EtHeJEDMca6Bym4VOqO0fkvZkKXaG4o3vnZ9HlgT_s0mKT2ynQiYWgf_Oz54ryNn',
    iconName: 'football',
    to: '/bookings',
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
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrAFBDnGdeb0rUmkkWXoQ1MUtNaT7gWhT9TVNy6lNIYsLs4zfRoBRjCNJhYpHyQmtQrzgH5zPVQAi_cjlRoL9VZTb4oZRtvCSqFd3FkGVtYcHjRzkJZkfmhUJGBdWNRPXgJM-JR_rqmyVnyrh8MChJgCHmyW0yI-aQ7YZ-rFhw-mgp_As1pxHEiNwythgLR0KdMFjVS5Li_2DwrSA7iDl8Gra57fb5oGNuEsg_NiGSak',
    iconName: 'turf',
    to: '/bookings',
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
    title: 'Badminton Court',
    subtitle: 'Book by court',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrC7KOf9xQIbPWG6nTXqt2xbZ--BYTjbf2lWHK5Z3F55dUanEAd8FU5CPibUK5aLx_BGsw97czT-eNg2nTJ4hhhEqMIT9k8itPJGh2QKouwPXQkl-5qydWR1Pl-A06mpTO2vdOH7bWh3SLZOq1Bu_3NRR0pByokaR5uLh1umQa03-mSwSSL3E-9Rga5BNuGgLffOMArvkw-6anIofNTrDlxkrbk0oLkbXgRPVA5MS3A',
    iconName: 'badminton',
    to: '/bookings',
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
    { id: 'bookings', value: 6, label: 'Bookings' },
    { id: 'hours-played', value: 9, label: 'Hours played' },
    { id: 'coming-up', value: 2, label: 'Coming up' },
  ],
};
