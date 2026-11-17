import type {
  BookingDateOption,
  BookingPortalMeta,
  BookingRegistrant,
  BookingTicketData,
  BookingTimeSlot,
  BookingVenue,
  PassData,
} from '@/types/bookings';

export const bookingPortalMeta: BookingPortalMeta = {
  portalBadge: 'Official Departmental Booking Portal • Citizen Access Level 1',
  title: 'Facility & Hourly Slot Booking',
  statusPillText: 'Kannur Sports Complex • Online Gate Sync Active',
  calendarMonthLabel: 'November 2024',
  morningTitle: 'Morning Sessions',
  morningRange: '(06:00 AM – 10:00 AM)',
  morningBadge: '3 Slots Available',
  eveningTitle: 'Afternoon & Evening Sessions',
  eveningRange: '(04:00 PM – 10:00 PM • Floodlit)',
  eveningBadge: 'Floodlights Active',
  slotPolicyNotice:
    'Consecutive slots up to 2 hours allowed per citizen booking. Equipment rental (footballs & bibs) available at Gate #2 reception counter.',
  gstRate: 0.18,
  floodlightChargeLabel: 'Complimentary',
  cancellationNotice:
    'Instant digital entry QR token issued immediately upon payment. 100% refund on cancellations up to 4 hours prior (§ 6.18).',
  supportDeskTitle: 'Ground Incharge Desk',
  supportDeskSubtitle: 'Pavilion Reception Counter • On-Site Helpdesk',
  supportGateBadge: 'Gate #2',
};

export const bookingVenues: BookingVenue[] = [
  {
    id: 'police-turf',
    name: 'Police Turf',
    badge: 'Turf 1',
    subtitle: 'Full / Half Court • 5-a-side AstroTurf',
    priceLabel: '₹600 - ₹1,200 / hr',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrCcal09iMk-BFy2Cn_sXS6FHalOuHnTiMJwVHKGm8E4Hag-u0AHjZYaoWIvpSTs4PciKUWtTp5Lda0f3TVjhKyFFWFhvgWzlioFtKiXVDrUICGpd5QcZnP_5tYSmpLMVRUMLD5i6plC-2xiakoK3xnltSbwVP7JvXP68Lzonyu23t80UkBdyqJ5Cad27vz8eYUTwPHFIGOmyrvlnqGb9_t_WUqdNCp0NVZTtmdOxPM2',
    imageAlt:
      'Police Turf AstroTurf 5-a-side pitch with high enclosure netting and floodlight towers',
    rateBannerText: 'General Public Rate: ₹1,200/hr Full Court • ₹600/hr Half Court',
    complianceBadge: 'Rule § 6.25 Compliant',
    operatingHoursText:
      'Operating Hours: 06:00 AM – 10:00 PM • Floodlights included after 06:30 PM • Stage 1 QR Gate Scan only (Biometric exemption applies)',
    courtOptions: [
      {
        id: 'full',
        label: 'Full Court • ₹1,200/hr',
        shortName: 'Full Court 5-a-side',
        turfBadge: 'Full Turf',
        icon: 'sports_soccer',
        hourlyRate: 1200,
      },
      {
        id: 'half_a',
        label: 'Half Court A • ₹600/hr',
        shortName: 'Half Court A',
        turfBadge: 'Turf A',
        icon: 'crop_free',
        hourlyRate: 600,
      },
      {
        id: 'half_b',
        label: 'Half Court B • ₹600/hr',
        shortName: 'Half Court B',
        turfBadge: 'Turf B',
        icon: 'crop_free',
        hourlyRate: 600,
      },
    ],
  },
  {
    id: 'football-ground',
    name: 'Football Ground',
    badge: 'Stadium',
    subtitle: 'Police Parade Ground • Regulation',
    priceLabel: 'From ₹2,400 / hr',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrB9oF73_Sh-nyG7-DAwquPUOIYYUSUrlDVaNr47pxWEm53xJQMkTgPvhGKBMqV1WTwMbd1pwidOv78MmnhPdZ1WZYZHG60Lzt1DqMhv2kmiJXopahOGQRWDMooaw8NcJ0bShmftXkokqRRrYOINwFiWDExqkVGCIV0tZ8GiX3_v9yx5hlW_WUDIOFiM0rlyEEXZPdFGyRbFu7Ne4x8t6M95e8KjtiQIIsZOI0T8zbVJ',
    imageAlt:
      'Police Parade Football Ground featuring pristine grass surface and stadium floodlight pylons',
    rateBannerText: 'General Public Rate: ₹2,400/hr Full Pitch • ₹1,200/hr Half Pitch',
    complianceBadge: 'Rule § 6.25 Compliant',
    operatingHoursText:
      'Operating Hours: 06:00 AM – 09:00 PM • Floodlights included after 06:30 PM • Stage 1 QR Gate Scan only (Biometric exemption applies)',
    courtOptions: [
      {
        id: 'full',
        label: 'Full Pitch • ₹2,400/hr',
        shortName: 'Full Regulation Pitch',
        turfBadge: 'Main Pitch',
        icon: 'sports_soccer',
        hourlyRate: 2400,
      },
      {
        id: 'half_a',
        label: 'North Half • ₹1,200/hr',
        shortName: 'North Half Pitch',
        turfBadge: 'North Wing',
        icon: 'crop_free',
        hourlyRate: 1200,
      },
      {
        id: 'half_b',
        label: 'South Half • ₹1,200/hr',
        shortName: 'South Half Pitch',
        turfBadge: 'South Wing',
        icon: 'crop_free',
        hourlyRate: 1200,
      },
    ],
  },
  {
    id: 'indoor-badminton',
    name: 'Indoor Badminton',
    badge: 'Indoor',
    subtitle: 'Teak Floor Competition Courts',
    priceLabel: 'From ₹450 / hr',
    imageUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrByvPzEgGgXdkmbVDO8IpvmSNCApIML-YmAsCt7qtrYVMZ7QOrsz-QGZiFnE6EUgxIzXUqnWozf0g3ALVtxJy4qOgqV6kNbsNFzdGEFDT9VBKDmyEhkwXIyTXLnllHeBKLvhPDdO0X5FyVilU-wnVAA7UjeT5qCu98eIyJFUnPJGUSMIRHyLrzE0F1sgDRtvFVSjsKAU7yXV1ZdrJYk3iJJxbDq313ORWdclGkW390',
    imageAlt:
      'Kannur Police indoor badminton competition court with polished synthetic flooring and court markings',
    rateBannerText: 'General Public Rate: ₹900/hr Twin Courts • ₹450/hr Single Court',
    complianceBadge: 'Rule § 6.25 Compliant',
    operatingHoursText:
      'Operating Hours: 06:00 AM – 10:00 PM • Non-marking indoor court shoes mandatory • Stage 1 QR Gate Scan only',
    courtOptions: [
      {
        id: 'full',
        label: 'Twin Courts • ₹900/hr',
        shortName: 'Twin Courts (1 & 2)',
        turfBadge: 'Courts 1-2',
        icon: 'sports_tennis',
        hourlyRate: 900,
      },
      {
        id: 'half_a',
        label: 'Court 1 • ₹450/hr',
        shortName: 'Competition Court 1',
        turfBadge: 'Court 1',
        icon: 'crop_free',
        hourlyRate: 450,
      },
      {
        id: 'half_b',
        label: 'Court 2 • ₹450/hr',
        shortName: 'Competition Court 2',
        turfBadge: 'Court 2',
        icon: 'crop_free',
        hourlyRate: 450,
      },
    ],
  },
];

export const bookingDates: BookingDateOption[] = [
  {
    id: '2024-11-20',
    dayShort: 'Wed',
    dateNum: '20',
    fullDateLabel: 'Wednesday, 20 Nov 2024',
    ticketDateLabel: '20 Nov 2024',
    slotsCountLabel: 'Past',
    isPast: true,
  },
  {
    id: '2024-11-21',
    dayShort: 'Thu',
    dateNum: '21',
    fullDateLabel: 'Thursday, 21 Nov 2024',
    ticketDateLabel: '21 Nov 2024',
    slotsCountLabel: '2 slots',
  },
  {
    id: '2024-11-22',
    dayShort: 'Fri',
    dateNum: '22',
    fullDateLabel: 'Friday, 22 Nov 2024',
    ticketDateLabel: '22 Nov 2024',
    slotsCountLabel: '1 slot',
  },
  {
    id: '2024-11-23',
    dayShort: 'Sat',
    dateNum: '23',
    fullDateLabel: 'Saturday, 23 Nov 2024',
    ticketDateLabel: '23 Nov 2024',
    slotsCountLabel: '4 slots',
  },
  {
    id: '2024-11-24',
    dayShort: 'Sun',
    dateNum: '24',
    fullDateLabel: 'Sunday, 24 Nov 2024',
    ticketDateLabel: '24 Nov 2024',
    slotsCountLabel: '6 slots',
  },
  {
    id: '2024-11-25',
    dayShort: 'Mon',
    dateNum: '25',
    fullDateLabel: 'Monday, 25 Nov 2024',
    ticketDateLabel: '25 Nov 2024',
    slotsCountLabel: '8 slots',
  },
  {
    id: '2024-11-26',
    dayShort: 'Tue',
    dateNum: '26',
    fullDateLabel: 'Tuesday, 26 Nov 2024',
    ticketDateLabel: '26 Nov 2024',
    slotsCountLabel: '5 slots',
  },
];

export const bookingTimeSlots: BookingTimeSlot[] = [
  {
    id: 'slot-06-07',
    session: 'morning',
    timeLabel: '06:00 - 07:00 AM',
    summaryTimeLabel: '06:00 AM – 07:00 AM',
    status: 'booked',
    sessionTag: 'Morning Session',
    durationLabel: '1 Hour (Morning Session)',
  },
  {
    id: 'slot-07-08',
    session: 'morning',
    timeLabel: '07:00 - 08:00 AM',
    summaryTimeLabel: '07:00 AM – 08:00 AM',
    status: 'available',
    sessionTag: 'Morning Session',
    durationLabel: '1 Hour (Morning Session)',
  },
  {
    id: 'slot-08-09',
    session: 'morning',
    timeLabel: '08:00 - 09:00 AM',
    summaryTimeLabel: '08:00 AM – 09:00 AM',
    status: 'available',
    sessionTag: 'Morning Session',
    durationLabel: '1 Hour (Morning Session)',
  },
  {
    id: 'slot-09-10',
    session: 'morning',
    timeLabel: '09:00 - 10:00 AM',
    summaryTimeLabel: '09:00 AM – 10:00 AM',
    status: 'available',
    sessionTag: 'Morning Session',
    durationLabel: '1 Hour (Morning Session)',
  },
  {
    id: 'slot-16-17',
    session: 'evening',
    timeLabel: '04:00 - 05:00 PM',
    summaryTimeLabel: '04:00 PM – 05:00 PM',
    status: 'booked',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Afternoon Session)',
  },
  {
    id: 'slot-17-18',
    session: 'evening',
    timeLabel: '05:00 - 06:00 PM',
    summaryTimeLabel: '05:00 PM – 06:00 PM',
    status: 'available',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Evening Session)',
  },
  {
    id: 'slot-18-19',
    session: 'evening',
    timeLabel: '06:00 - 07:00 PM',
    summaryTimeLabel: '06:00 PM – 07:00 PM',
    status: 'booked',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Floodlit Evening Session)',
  },
  {
    id: 'slot-19-20',
    session: 'evening',
    timeLabel: '07:00 - 08:00 PM',
    summaryTimeLabel: '07:00 PM – 08:00 PM',
    status: 'available',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Floodlit Evening Session)',
  },
  {
    id: 'slot-20-21',
    session: 'evening',
    timeLabel: '08:00 - 09:00 PM',
    summaryTimeLabel: '08:00 PM – 09:00 PM',
    status: 'available',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Floodlit Evening Session)',
  },
  {
    id: 'slot-21-22',
    session: 'evening',
    timeLabel: '09:00 - 10:00 PM',
    summaryTimeLabel: '09:00 PM – 10:00 PM',
    status: 'maintenance',
    sessionTag: 'Floodlit Session',
    durationLabel: '1 Hour (Floodlit Evening Session)',
  },
];

export const bookingRegistrant: BookingRegistrant = {
  name: 'Priya Mohan',
  registrantId: '#KCP-PUB-2024-3194',
  email: 'priya.m@kerala.in',
  accountBadge: 'Verified Citizen Portal Account',
};

export const bookingDefaultSelection = {
  venueId: 'police-turf',
  courtId: 'full' as const,
  dateId: '2024-11-23',
  slotId: 'slot-19-20',
};

export const bookingTicketDefault: BookingTicketData = {
  departmentBadge: 'Official Departmental Booking Receipt',
  clearanceStage: 'Stage 1 Instant Clearance',
  headline: 'Slot Booking Confirmed!',
  syncStatusBadge: 'Booking Active & Gate-Synced',
  subheadline:
    'Your hourly slot reservation has been recorded in the Kerala Police Sports Department system. Present this optical QR code at Turnstile Gate 1 for automated contactless entry.',
  organizationName: 'Kannur City Police',
  passTitle: 'Sports Facility Pass',
  passTypeBadge: 'Single Hourly',
  bookingReference: '#KCP-SLT-2024-9041',
  approvalBadge: 'Pre-Approved',
  venueName: 'Police Turf • Half Court A',
  venueSubtitle: 'Synthetic Astroturf 40mm • Practice Turf',
  venueShortBadge: 'Turf A',
  venueIcon: 'sports_soccer',
  dateLabel: '25 Nov 2024',
  timeSlotLabel: '06:00 PM – 07:00 PM',
  sessionNote: 'Floodlit Evening Session',
  gateName: 'Turf Entrance Gate 1',
  gateLaneInfo: 'Turnstile Lane A & B (Ground Floor)',
  gateQuadrant: 'North Quadrant Pavilion',
  attendeeName: 'Priya Mohan',
  attendeeRole: 'General Public • Citizen',
  attendeeAvatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCHwKRLwMyfp585KHTZ9tMpoVBG0wrmYkAzKIgPpEM8ijzpWG16vz-VaLRQj--UkC3Qv-_3RJb7UrLLFVRNKHKJavOrV1MyCg0BNbZcI_gimkPKP2mulCsC5xXzOilWIqPeQ7r2Arsx494KCeoD2SqfrLdBBNurvsf716JhnjCvufL0LCVrrCm2L-vLFvfatcZs2NcCatrDNgV7q63hJaUSZ7tstOoKGkSoEhOwvFM',
  attendeeAvatarAlt:
    'Close up portrait photo of Indian female athlete Priya Mohan smiling at sports arena with athlete ID badge',
  amountPaid: '₹708.00',
  paymentStatusNote: 'Paid in Full (Incl. 18% GST)',
  upiReference: 'UPI Ref: AXIS-4918204918',
  qrSectionLabel: 'Optical Fast-Pass Entry Code',
  qrNotice:
    'Single-Stage Optical QR Pass • Valid 15 mins prior to slot start (No biometric scan required)',
  qrTokenHash: 'Token: SHA-256: 7f9b4c021ae8...e21a • Verified Gate 1 Turnstile Sync',
  qrSeed: 'KCP-SLT-2024-9041-GATE1',
  guidelinesTitle: 'Important Entry Guidelines',
  guidelines: [
    {
      id: 'turnstiles',
      icon: 'schedule',
      textPrefix: 'Turnstiles unlock at ',
      highlightText: '05:45 PM',
      textSuffix:
        ' (15 minutes prior to session start). Late entries beyond 06:15 PM require manual clearance.',
    },
    {
      id: 'footwear',
      icon: 'sports',
      textPrefix:
        'Turf boots or rubber-soled athletic sneakers are mandatory. Metal studs or dress shoes are strictly forbidden on synthetic pitch fibers.',
      textSuffix: '',
    },
    {
      id: 'equipment',
      icon: 'inventory_2',
      textPrefix:
        'Match footballs, training bibs, and referee whistles are available for pickup at ',
      highlightText: 'Gate #2 Equipment Desk',
      textSuffix: ' upon barcode verification.',
    },
  ],
  helplineTitle: 'Ground Incharge Desk',
  helplineSubtitle: 'Gate 1 & 2 Direct Intercom',
  helplineBadge: 'On-Site Desk • Gate 1 & 2',
};

export const passDefaultData: PassData = {
  passReference: 'Pass Reference: #KCP-ATH-2024-5492',
  vaultRecordText: 'Official GovVault Encrypted Record',
  syncBadgeText: 'Live Turnstile Node Synced',
  authTag: 'Instant Authorization',
  statusTag: 'Active Status',
  confirmationTitle: 'Payment Successful & Membership Active!',
  confirmationDescription:
    'Your 3-month pass for the Synthetic 400m Athletic Track is active. Present this digital pass or your biometric scan at Pavilion Gate 2 turnstiles.',
  councilName: 'Kannur City Police Sports Council',
  passTitle: 'Athletic Division Access Pass',
  verifiedBadgeText: 'Verified Member',
  memberName: 'Anil Kumar',
  departmentalCode: 'KCP-8842',
  designation: 'Sub-Inspector of Police • Kannur City',
  memberId: 'KCP-MEM-2024-8842',
  photoUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAxISNwwCCTTjy_BiX0-wQFBMTKFAMKNG2OCDXWkvG7Q6LsQBmlwUAfO5Cx9Pdx7Em434eHyTvPbbkoJ6vJTrLzuTu9zgu6tvV_j3i8HlcMMe_q4erOIqTvt69de07chYzZnndVDMCL_Smu2h0W629l64bAaY2OF4vb1K2ZKVR0gKoNQKa3g4e3WdGSpjqnY1gg7apr_m6ilk6jkS5pImCUKpAripMXHgIYlfL9PT8',
  photoAlt:
    'Dignified official studio portrait of Kerala Police Sub-Inspector Anil Kumar in crisp navy blue athletic blazer against a soft light-blue diffused backdrop.',
  liveStatusText: 'Live',
  details: [
    {
      id: 'category',
      label: 'Category',
      value: 'Government Personnel (Kerala Police)',
      subtext: '50% Departmental Subsidized',
      highlightSubtext: true,
    },
    {
      id: 'facility',
      label: 'Designated Facility',
      value: 'Synthetic 400m Athletic Track',
      subtext: 'Police Parade Grounds Complex',
    },
    {
      id: 'gate',
      label: 'Gate Authorization',
      value: 'Pavilion Gate 2',
      subtext: 'Biometric Turnstile Lanes A & B',
    },
    {
      id: 'validity',
      label: 'Active Validity',
      value: '01 Dec 2024 – 28 Feb 2025',
      subtext: '90 Days Active Validity',
      highlightSubtext: true,
    },
  ],
  qrTitle: 'Dynamic Gate QR',
  qrDescription: 'Optical pass updates dynamically with biometric cryptographic check.',
  nfcBadgeText: 'NFC Tap & Scan Enabled',
  barcodeCaption: 'SCAN AT TURNSTILE',
  qrSeed: 'KCP-MEM-2024-8842-NODE-KAN02',
  legalDisclaimer:
    'Tamper-proof digital pass issued under Kerala Police Sports Directives 2024. Strictly non-transferable.',
  nodeId: 'NODE #KAN-02',
  venuePhotoUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDUHy_hc8bpIMbn2g6fH2XXzgLtt9y5HbgCqxj6TX_ku4bwiDQnDqItUKL6sezjO0krN5sjNTu3HJU6U8Q7fPRzwBLpL8BMwj-2yt7o7EMqkXbz8iCZkiXmd1MM2bqmwrJDlzGQiQBAEzmA3Z_OX45mLmy_9y_zDQon4Mt3j4i4qyakuPwIbLt04dEjEZv9z5zgl2ylF5gGLBrRJP85zKKfve19c-3ZyiCGqPGcdRI',
  venuePhotoAlt:
    'Wide panoramic vista of the Kannur City Police Parade Grounds 400m international standard red synthetic running track under soft morning sunlight with pristine white lane markings and lush green outfield.',
  venueCardTitle: 'Pavilion Gate 2 • Synthetic Track',
  venueCardAddress: 'Calicut Road, Police Parade Ground, Kannur, Kerala 670002',
  receiptAmount: '₹885.00',
  accessGuideTitle: 'Gate 2 Biometric Access Guide',
  accessGuideSubtitle: 'Fast-track automated entry',
  biometricSteps: [
    {
      stepNumber: 1,
      title: 'Optical Pass Scanning',
      description:
        'Hold the digital pass QR code 6 inches above turnstile scanner at Pavilion Gate 2.',
    },
    {
      stepNumber: 2,
      title: 'Facial Recognition or Smart Card',
      description:
        'Look into the kiosk camera or tap your registered Police PEN card for gate release.',
    },
  ],
  dailyHoursText: 'Daily Hours: 05:30 AM – 09:00 PM',
  trackRulesText:
    'Track rules: Standard athletic sports attire mandatory. Only 6mm pyramid spikes permitted on the synthetic surface.',
  challanTotal: '₹885.00',
  challanRows: [
    {
      label: 'Payment Mode',
      value: 'UPI Ref: #UPI-994821038',
    },
    {
      label: 'Electronic Challan',
      value: '#KL-KAN-2024-7712',
      isMono: true,
    },
    {
      label: 'Statutory Compliance',
      value: 'Treasury Sec 43B Compliant',
    },
  ],
  dutyDeskLabel: 'Parade Ground Duty Desk',
  dutyDeskLocation: 'Pavilion Gate 2 Reception',
};
