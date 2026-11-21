import type { BackendGender, BackendSessionWindow } from '@/api/client';

export type MembershipOnboardingStep = 1 | 2 | 3;

export type MembershipDurationMonths = 1 | 2 | 3 | 6;

export interface MembershipStepDefinition {
  step: MembershipOnboardingStep;
  label: string;
  labelMl: string;
  subtitle: string;
  subtitleMl: string;
}

export interface MembershipGenderOption {
  value: BackendGender;
  label: string;
  labelMl: string;
}

export interface MembershipDurationOption {
  months: MembershipDurationMonths;
  label: string;
  labelMl: string;
  daysLabel: string;
  recommended?: boolean;
}

export interface MembershipSessionOption {
  id: BackendSessionWindow;
  label: string;
  labelMl: string;
  hoursLabel: string;
}

export interface MembershipOnboardingFormData {
  gender: BackendGender | '';
  dateOfBirth: string;
  parentName: string;
  presentAddress: string;
  cityLocality: string;
  pinCode: string;
  sameAsPresent: boolean;
  permanentAddress: string;
  designation: string;
  officeAddress: string;
  trackPurpose: string;
  isRegisteredSportsperson: boolean;
  sportDiscipline: string;
  associationDetails: string;
  selectedMonths: MembershipDurationMonths;
  sessionWindow: BackendSessionWindow;
  declarationAccepted: boolean;
}

export interface MembershipOnboardingErrors {
  gender?: string;
  dateOfBirth?: string;
  presentAddress?: string;
  cityLocality?: string;
  pinCode?: string;
  permanentAddress?: string;
  designation?: string;
  officeAddress?: string;
  trackPurpose?: string;
  sportDiscipline?: string;
  declarationAccepted?: string;
}

export interface MembershipPricingSummary {
  monthlyNet: number;
  baseFee: number;
  concessionDiscount: number;
  concessionPercent: number;
  taxableSubtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalPayable: number;
}
