export type MembershipWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type MembershipApplicantCategoryId = 'public' | 'government';

export type MembershipGender = 'Male' | 'Female' | 'Transgender';

export type MembershipPaymentMethodTab = 'upi' | 'debit' | 'credit' | 'netbanking';

export interface MembershipCategoryOption {
  id: MembershipApplicantCategoryId;
  title: string;
  description: string;
  iconName: 'person' | 'badge';
  stepSubtitle: string;
  detailsSubtitle: string;
  reviewLabel: string;
}

export interface MembershipStepDefinition {
  step: 1 | 2 | 3 | 4;
  label: string;
  completedSublabel: string;
  activeSublabel: string;
  upcomingSublabel: string;
}

export interface MembershipStatusTimelineItem {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  verifiedTag?: string;
  status: 'completed' | 'done_all' | 'current';
}

export interface MembershipPeriodOption {
  months: 1 | 2 | 3 | 6;
  label: string;
  tierBadge: string;
  validity: string;
  enrolled: number;
  capacity: number;
  capacityPercent: number;
  baseFee: number;
  discount: number;
  gst: number;
  total: number;
  recommended?: boolean;
  quarterTag: string;
  daysLabel: string;
}

export interface MembershipAttachedDocument {
  fileName: string;
  fileSize: string;
  statusLabel: string;
  verifiedLabel: string;
}

export interface MembershipFormData {
  category: MembershipApplicantCategoryId | null;
  fullName: string;
  dob: string;
  gender: MembershipGender;
  parentName: string;
  presentAddress: string;
  sameAsPresent: boolean;
  permanentAddress: string;
  designation: string;
  officeAddress: string;
  purpose: string;
  isSportsperson: boolean;
  sportField: string;
  associationDetails: string;
  photoCaptured: boolean;
  primaryDocument: MembershipAttachedDocument | null;
  auxiliaryDocument: MembershipAttachedDocument | null;
  declarationAccepted: boolean;
  selectedMonths: 1 | 2 | 3 | 6;
}

export interface MembershipValidationErrors {
  fullName?: string;
  dob?: string;
  presentAddress?: string;
  permanentAddress?: string;
  designation?: string;
  officeAddress?: string;
  purpose?: string;
  sportField?: string;
}

export interface MembershipFacilitySummary {
  facilityName: string;
  facilitySubtitle: string;
  stadiumBadge: string;
  trackCode: string;
  environment: string;
  location: string;
  applicationId: string;
  serviceId: string;
  stationBadge: string;
  penNumber: string;
  sportsId: string;
  sessionId: string;
  trackSurface: string;
  operatingHours: string;
  subsidyLabel: string;
  ageNote: string;
}

export interface MembershipMediaAssets {
  cameraViewfinderBackdropUrl: string;
  cameraViewfinderAlt: string;
  capturedPortraitStep3Url: string;
  capturedPortraitStep3Alt: string;
  reviewPortraitStep4Url: string;
  reviewPortraitStep4Alt: string;
  statusPortraitStep5Url: string;
  statusPortraitStep5Alt: string;
  facilityAerialTrackUrl: string;
  facilityAerialTrackAlt: string;
}

export interface MembershipNetBankingBank {
  id: string;
  name: string;
}
