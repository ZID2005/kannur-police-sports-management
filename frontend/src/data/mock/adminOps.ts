import type {
  OfficePaymentFormValues,
  OfficeSelectOption,
  PaymentSummaryCardData,
} from '@/types/adminOps';

/* ============================================================================
 * PAYMENTS & FINANCIAL LEDGER DEFAULT METADATA (Populated from Live Backend)
 * ========================================================================== */

export const paymentSummaryCards: PaymentSummaryCardData[] = [
  {
    id: 'total-revenue',
    title: 'Total Revenue',
    amount: '₹0.00',
    amountTone: 'primary',
    icon: 'account_balance_wallet',
    iconBoxTone: 'primary',
    badgeText: '0 Settled',
    badgeIcon: 'verified',
    badgeTone: 'emerald',
    footerLeft: 'Taxable: ₹0.00',
    footerRightText: 'Online: ₹0.00',
    footerRightTone: 'pill-emerald-dot',
  },
  {
    id: 'gst-collected',
    title: 'GST Collected',
    amount: '₹0.00',
    amountTone: 'default',
    icon: 'account_balance',
    iconBoxTone: 'secondary',
    badgeText: '18% GST',
    badgeTone: 'secondary',
    footerLeft: 'CGST 9% + SGST 9%',
    footerRightText: 'Tax Compliant',
    footerRightIcon: 'verified',
    footerRightTone: 'primary-verified',
  },
  {
    id: 'govt-concessions',
    title: 'Govt/Police Concessions',
    amount: '₹0.00',
    amountTone: 'default',
    icon: 'local_police',
    iconBoxTone: 'neutral',
    badgeText: '0 Subsidized',
    badgeTone: 'neutral',
    footerLeft: 'Gross Base: ₹0.00',
    footerRightText: 'Department Rate',
    footerRightTone: 'tertiary',
  },
  {
    id: 'completed-pending',
    title: 'Completed / Pending',
    amount: '0 / 0',
    amountTone: 'amber',
    icon: 'receipt_long',
    iconBoxTone: 'amber',
    badgeText: '0 Total',
    badgeIcon: 'schedule',
    badgeTone: 'amber',
    footerLeft: 'Pending: ₹0.00',
    footerRightText: 'Office: ₹0.00',
    footerRightTone: 'amber',
  },
];

export const paymentOfficeDefaultFormValues: OfficePaymentFormValues = {
  applicantRef: '',
  challanNumber: 'TR-KCP-2026-',
  amount: '',
  facilityCode: 'POLICE_TURF',
  paymentMode: 'challan',
  entryTimestamp: '',
};

export const paymentOfficeFacilityOptions: OfficeSelectOption[] = [
  { value: 'SYNTHETIC_TRACK', label: 'Synthetic Athletic Track (Monthly Pass)' },
  { value: 'FOOTBALL_GROUND', label: 'Natural Turf Football Ground' },
  { value: 'POLICE_TURF', label: 'Floodlit Artificial Football Turf' },
  { value: 'BADMINTON_COURT', label: 'Indoor Wooden Badminton Court' },
];

export const paymentOfficeModeOptions: OfficeSelectOption[] = [
  { value: 'challan', label: 'Treasury Challan (Bank Form TR-5)' },
  { value: 'cash', label: 'Cash at Police Welfare Desk' },
  { value: 'pos', label: 'POS Machine Slip (Department Counter)' },
];
