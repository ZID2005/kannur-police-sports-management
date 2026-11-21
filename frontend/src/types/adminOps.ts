/* ============================================================================
 * Payments & Financial Ledger Types
 * ========================================================================== */

import type { BackendPaymentMode, BackendPaymentStatus } from '@/api/client';

export type PaymentStatusFilterId = 'ALL' | BackendPaymentStatus;
export type PaymentUserCategoryFilterId = 'ALL' | 'PUBLIC' | 'GOVT_PERSONNEL';

export interface PaymentSummaryCardData {
  id: string;
  title: string;
  amount: string;
  amountTone?: 'default' | 'amber' | 'primary';
  icon: string;
  iconBoxTone: 'primary' | 'secondary' | 'amber' | 'neutral';
  badgeText: string;
  badgeIcon?: string;
  badgeTone: 'emerald' | 'secondary' | 'amber' | 'neutral';
  footerLeft: string;
  footerRightText: string;
  footerRightIcon?: string;
  footerRightTone: 'pill-emerald-dot' | 'primary-verified' | 'amber' | 'tertiary';
}

export interface PaymentTransactionRow {
  id: string;
  receiptId: string;
  bookingOrPassRef: string;
  isoTimestamp: string;
  dateLabel: string;
  timeLabel: string;
  memberInitials: string;
  avatarTone: 'primary' | 'secondary';
  memberName: string;
  memberUsername: string;
  userCategory: 'PUBLIC' | 'GOVT_PERSONNEL';
  categoryLabel: string;
  facilityCode: string;
  facilityName: string;
  facilityPurpose: string;
  paymentMode: BackendPaymentMode;
  paymentModeLabel: string;
  baseFee: number;
  concessionDiscount: number;
  concessionPercent: number;
  taxableSubtotal: number;
  gstRate: number;
  gstAmount: number;
  finalTotalPaid: number;
  baseFeeFormatted: string;
  concessionDiscountFormatted: string;
  taxableSubtotalFormatted: string;
  gstAmountFormatted: string;
  totalPaidFormatted: string;
  status: BackendPaymentStatus;
  statusLabel: string;
  recordedByOfficerName: string | null;
}

export interface OfficePaymentFormValues {
  applicantRef: string;
  challanNumber: string;
  amount: string;
  facilityCode: string;
  paymentMode: 'challan' | 'cash' | 'pos';
  entryTimestamp: string;
}

export interface OfficeSelectOption {
  value: string;
  label: string;
}
