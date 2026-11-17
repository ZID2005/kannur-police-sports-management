import type {
  MembershipAttachedDocument,
  MembershipCategoryOption,
  MembershipFacilitySummary,
  MembershipFormData,
  MembershipGender,
  MembershipMediaAssets,
  MembershipNetBankingBank,
  MembershipPeriodOption,
  MembershipStatusTimelineItem,
  MembershipStepDefinition,
} from '@/types/membership';

export const membershipSteps: MembershipStepDefinition[] = [
  {
    step: 1,
    label: 'Category',
    completedSublabel: 'Completed',
    activeSublabel: 'In progress',
    upcomingSublabel: 'Select category',
  },
  {
    step: 2,
    label: 'Your details',
    completedSublabel: 'Completed',
    activeSublabel: 'In progress',
    upcomingSublabel: 'Personal & address',
  },
  {
    step: 3,
    label: 'Photo and documents',
    completedSublabel: 'Completed',
    activeSublabel: 'In progress',
    upcomingSublabel: 'Verification upload',
  },
  {
    step: 4,
    label: 'Review and submit',
    completedSublabel: 'Completed',
    activeSublabel: 'In progress',
    upcomingSublabel: 'Final authorization',
  },
];

export const membershipCategories: MembershipCategoryOption[] = [
  {
    id: 'public',
    title: 'General public',
    description: 'Fill in your details and pay online to receive your membership card.',
    iconName: 'person',
    stepSubtitle: 'General Public Applicant',
    detailsSubtitle: 'Address & Track Purpose Verified',
    reviewLabel: 'General Public',
  },
  {
    id: 'government',
    title: 'Government personnel',
    description: 'Upload proof of employment. Payment opens after the department approves your application.',
    iconName: 'badge',
    stepSubtitle: 'Kerala Police Personnel',
    detailsSubtitle: 'PEN & Station Verified',
    reviewLabel: 'Government Personnel (Kerala Police)',
  },
];

export const membershipGenders: MembershipGender[] = ['Male', 'Female', 'Transgender'];

export const membershipPrimaryDocumentSample: MembershipAttachedDocument = {
  fileName: 'KCP_Service_ID_AnilKumar.pdf',
  fileSize: '1.4 MB',
  statusLabel: 'Uploaded & verified',
  verifiedLabel: 'Kerala Police Verified',
};

export const membershipAuxiliaryDocumentSample: MembershipAttachedDocument = {
  fileName: 'KCP_Sports_Council_NOC_2024.pdf',
  fileSize: '840 KB',
  statusLabel: 'Uploaded & verified',
  verifiedLabel: 'Departmental NOC Verified',
};

export const membershipDefaultFormData: MembershipFormData = {
  category: null,
  fullName: 'Anil Kumar',
  dob: '28 August 1994',
  gender: 'Male',
  parentName: 'Sreedharan Nair',
  presentAddress: 'Haritha Nagar, House No. 24, Thottada, Kannur 670007',
  sameAsPresent: true,
  permanentAddress: 'Haritha Nagar, House No. 24, Thottada, Kannur 670007',
  designation: 'Sub-Inspector of Police',
  officeAddress: 'District Police Office, South Bazaar, Kannur 670002',
  purpose: 'Fitness training and marathon preparation',
  isSportsperson: false,
  sportField: 'Athletics',
  associationDetails: 'Kerala State Athletics Association',
  photoCaptured: true,
  primaryDocument: membershipPrimaryDocumentSample,
  auxiliaryDocument: null,
  declarationAccepted: true,
  selectedMonths: 3,
};

export const membershipStatusTimeline: MembershipStatusTimelineItem[] = [
  {
    id: 'submitted',
    title: 'Application submitted',
    subtitle: '24 Nov 2024, 10:14 AM',
    status: 'completed',
  },
  {
    id: 'verified',
    title: 'Verification & Clearance',
    subtitle: 'Kerala Police Personnel verified',
    verifiedTag: 'Service ID #KP-55104',
    status: 'completed',
  },
  {
    id: 'approved',
    title: 'Application approved',
    subtitle: '',
    badgeText: 'Approved by District Sports Officer',
    status: 'done_all',
  },
  {
    id: 'payment',
    title: 'Period & Payment',
    subtitle: 'Select plan duration & complete checkout',
    badgeText: 'Current',
    status: 'current',
  },
];

export const membershipPeriodOptions: MembershipPeriodOption[] = [
  {
    months: 1,
    label: '1 Month',
    tierBadge: '1 Month Tier',
    validity: '1 Dec 2024 - 31 Dec 2024',
    enrolled: 180,
    capacity: 300,
    capacityPercent: 60,
    baseFee: 500,
    discount: 250,
    gst: 45,
    total: 295,
    quarterTag: 'Dec Active',
    daysLabel: '30 Days',
  },
  {
    months: 2,
    label: '2 Months',
    tierBadge: '2 Months Tier',
    validity: '1 Dec 2024 - 31 Jan 2025',
    enrolled: 210,
    capacity: 300,
    capacityPercent: 70,
    baseFee: 1000,
    discount: 500,
    gst: 90,
    total: 590,
    quarterTag: 'Bi-Monthly',
    daysLabel: '60 Days',
  },
  {
    months: 3,
    label: '3 Months',
    tierBadge: '3 Months Tier',
    validity: '1 Dec 2024 - 28 Feb 2025',
    enrolled: 242,
    capacity: 300,
    capacityPercent: 80.6,
    baseFee: 1500,
    discount: 750,
    gst: 135,
    total: 885,
    recommended: true,
    quarterTag: 'Q4 Active',
    daysLabel: '90 Days',
  },
  {
    months: 6,
    label: '6 Months',
    tierBadge: '6 Months Tier',
    validity: '1 Dec 2024 - 31 May 2025',
    enrolled: 278,
    capacity: 300,
    capacityPercent: 92.6,
    baseFee: 3000,
    discount: 1500,
    gst: 270,
    total: 1770,
    quarterTag: 'Half-Year',
    daysLabel: '180 Days',
  },
];

export const membershipFacilitySummary: MembershipFacilitySummary = {
  facilityName: 'Synthetic 400m Athletic Track',
  facilitySubtitle: 'Synthetic Track',
  stadiumBadge: 'Synthetic Athletic Stadium',
  trackCode: 'Official Track #1',
  environment: 'Outdoor',
  location: 'Police Parade Grounds, Kannur',
  applicationId: 'KCP-MEM-2024-8842',
  serviceId: 'Service ID #KP-55104',
  stationBadge: 'Kannur Town Station • Badge #KCP-8842',
  penNumber: '549210',
  sportsId: '#KCP-ATH-2024-5492',
  sessionId: 'KCP-PAY-98421',
  trackSurface: '8-Lane IAAF',
  operatingHours: '05:30 - 21:00',
  subsidyLabel: '50% Departmental Subsidy active',
  ageNote: '29 yrs',
};

export const membershipMediaAssets: MembershipMediaAssets = {
  cameraViewfinderBackdropUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDa2zTaKlCIMXsXmtg1t_nkvcuvJfCZ6YETLjIKdtISCONQv6RXGGyd0gEmiFTm7-_VJuEnCBzu80GmJhu8bNvYFlqRup2Hw1R_zs37nfycymHfkzAwqSRfV_Mn2whL5_9gccWwWE7hFyYESEI4iAmyUz7F5FlNRPC8Cyx-JLbyOR30RKwmoNyTYr49v3jPb2Wcif8WvAp9juvqLSTDrFsOoqiU8iJiH0lVZypN02w',
  cameraViewfinderAlt:
    'Subtle ambient modern police fitness centre indoor backdrop bathed in soft light, blurred depth of field, high-tech security camera interface perspective with faint architectural grid.',
  capturedPortraitStep3Url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD3BRGeegqfXYybYvwQ4AIuo_a09v_Jiu1iEO2y0iGFyD5z1OciDCxnX1OWJW1GJaPeWOlaEsVc8MRAZVY7XrS8miHNKc4xfRtLDc347K0MLRiOz8acoi5eg4sVBQcIMg9jRVm0ArbdwUZqeQWnBLHy01xm-UqJq_7Ikdm492oZiusJ-FZD-p16MMy-tCl2XUfPl8deCpGOJOKy2t7og25ijSCXGon2DWW0wyAKLYo',
  capturedPortraitStep3Alt:
    'Official professional high-resolution passport-style live portrait of an Indian police officer in clean uniform, neutral lighting, looking directly at camera.',
  reviewPortraitStep4Url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCOi6DG2hKEJwQP9Kssayz5OTOtSRztL3s2AiQURqaxrEhUirWYl0fnjZfiXVnh6Ib-yGCkv39sxUfLJMbmIXbS5xG2NYYt6PPDx08ki0vyjCAjJhpUjgGF_ZEWZuaB5eBABO5JWKZ9vCaRNj7sN3d-p5yuUG4p1P9xTf6JNf6CQCEQoE2WTS4OKXi3NA-diUn8xXlKYSLmGY1NNsgjjKbsZS9wmsWB0LQe2sREgX4',
  reviewPortraitStep4Alt:
    'Official portrait photograph of police sub-inspector Anil Kumar in clean formal uniform against a subtle cool grey backdrop.',
  statusPortraitStep5Url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAoEP19c5V7KkPR17oXkeWMFIMXFNpX9qXuNudzz93IAqpFzn7-YTqHD5zQpClAiH7zGSdEu2dgh3Xbj5q3t_DkzbPNJXDVPTmsFD2-uIC7qgVcZ-8hSW8oHjzzQf3UUEeY5ZrODXmhJiFLARfIi5NEXpzSXXO2z_TPzHBra96gnYI7-iw_qxWTptHO1Ppq96HNpNrvC5YysR3pEmNH-AluG18apyCybU8VVsVADu4',
  statusPortraitStep5Alt:
    'Official portrait photograph of a smart male Indian police sub-inspector in formal uniform, warm subtle lighting.',
  facilityAerialTrackUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDJr2CXAbF716s8poqTsLjmrHPXvpvfMRp2cWTgxF2zcVvBcrKyAn5z1Vwp2hOzlgS5ChYJicn7qW5tq8VWqr9uDwQgNOHGvhD8GbwS1w-3_Dmx3zPTXviSbWactECsUVjaIcb5SPTpfFf1a7wszC7LPkMA2qpQzJ8jsssoDBQuSkrKqJEhqd2QdkJ4IIE6RCBrYmxhe2Le_RJrWxbvSrWOLvNpiPb9iTTnPYwzFuU',
  facilityAerialTrackAlt:
    'High-angle aerial shot of an immaculate, professional 400-meter synthetic rubber running track in bright morning sun with crisp white lane lines.',
};

export const membershipSupportedUpiApps: string[] = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'];

export const membershipNetBankingBanks: MembershipNetBankingBank[] = [
  { id: 'sbi', name: 'State Bank of India' },
  { id: 'canara', name: 'Canara Bank' },
  { id: 'federal', name: 'Federal Bank' },
  { id: 'kgb', name: 'Kerala Gramin Bank' },
];
