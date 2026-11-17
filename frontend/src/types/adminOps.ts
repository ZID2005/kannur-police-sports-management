export type FacilityAdminId = 'track' | 'football' | 'turf' | 'badminton';

export type CourtScopeFilterId = 'all' | 'full' | 'half-a' | 'half-b';

export type OverrideReasonId = 'tournament' | 'drill' | 'maintenance' | 'security';

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'split';

export interface FacilityRuleParameter {
  id: string;
  label: string;
  icon: string;
  value: string;
  subtext: string;
}

export interface FacilitySubStripMeta {
  icon: string;
  label: string;
}

export interface FacilityAdminItem {
  id: FacilityAdminId;
  name: string;
  subtitle: string;
  icon: string;
  badge?: string;
  location: string;
  operationalStatus: string;
  occupancyPercent: number;
  bookedSlotsCount: number;
  totalSlotsCount: number;
  subStripMeta: FacilitySubStripMeta[];
  rulesTitle: string;
  rulesDescription: string;
  parameters: FacilityRuleParameter[];
}

export interface SplitHalfSlotData {
  id: 'half-a' | 'half-b';
  label: string;
  status: 'booked' | 'available' | 'blocked';
  detailsText: string;
  rightLabel?: string;
  actionLabel?: string;
}

export interface FacilitySlotOverrideConfig {
  reasonId: OverrideReasonId;
  noteTitle: string;
  noteDescription: string;
  auditRecordId: string;
  officerLabel: string;
  courtLabel: string;
  maskTitle: string;
  maskDescription: string;
}

export type FacilitySlotActionId =
  | 'details'
  | 'release'
  | 'challan'
  | 'manage'
  | 'quick-block'
  | 'manual-booking'
  | 'maintenance-log'
  | 'gate-pass'
  | 'actions'
  | 'roster'
  | 'assign'
  | 'summary';

export interface FacilitySlotAction {
  id: FacilitySlotActionId;
  label: string;
  icon?: string;
  variant: 'neutral' | 'subtle' | 'amber' | 'primary' | 'muted';
}

export interface FacilityTimeSlot {
  id: string;
  facilityId: FacilityAdminId;
  timeRange: string;
  timeSubtitle: string;
  timeSubtitleIcon?: string;
  timeSubtitleTone?: 'default' | 'emerald' | 'tertiary' | 'secondary' | 'primary';
  status: SlotStatus;
  statusBadgeLabel: string;
  statusBadgeIcon?: string;
  courtScope: 'full' | 'split';
  bannerTone?: 'amber' | 'amber-soft' | 'secondary' | 'secondary-soft' | 'neutral';
  bannerIcon?: string;
  bannerAvatarText?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerRightTag?: string;
  bannerRightTagTone?:
    | 'amber'
    | 'amber-soft'
    | 'primary-text'
    | 'emerald-tag'
    | 'emerald-pill'
    | 'neutral-text'
    | 'bold-text';
  splitSubtitle?: string;
  splitStatusBadge?: string;
  splitHalves?: [SplitHalfSlotData, SplitHalfSlotData];
  actions: FacilitySlotAction[];
  overrideConfig: FacilitySlotOverrideConfig;
}

export interface FacilityDateOption {
  id: string;
  label: string;
  dayName: string;
}

export interface CourtScopeFilterOption {
  id: CourtScopeFilterId;
  label: string;
}

export interface OverrideReasonOption {
  id: OverrideReasonId;
  label: string;
  icon: string;
}

/* ============================================================================
 * Payments & Financial Reports Types
 * ========================================================================== */

export type PaymentLedgerTabId = 'all' | 'online' | 'office' | 'refunds';

export type PaymentFacilityFilterId =
  | 'All Facilities'
  | 'Synthetic Track'
  | 'Football Ground'
  | 'Police Turf'
  | 'Indoor Badminton';

export type PaymentTransactionStatus = 'settled' | 'treasury' | 'pending' | 'refunded';

export interface PaymentSummaryCardData {
  id: string;
  title: string;
  amount: string;
  amountTone?: 'default' | 'amber';
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

export interface PaymentLedgerTab {
  id: PaymentLedgerTabId;
  label: string;
  count: number;
}

export interface PaymentTransactionRow {
  id: string;
  receiptId: string;
  timestamp: string;
  isRefund?: boolean;
  memberInitials: string;
  avatarTone: 'primary' | 'secondary' | 'amber' | 'primary-fixed' | 'neutral';
  memberName: string;
  memberMeta: string;
  categoryLabel: string;
  categoryTone: 'primary-fixed' | 'neutral';
  facilityName: string;
  facilityFilterGroup: Exclude<PaymentFacilityFilterId, 'All Facilities'>;
  facilityPurpose: string;
  paymentModeLabel: string;
  paymentModeIcon: string;
  paymentModeIconTone: 'emerald' | 'primary' | 'blue' | 'tertiary';
  amountFormatted: string;
  status: PaymentTransactionStatus;
  statusLabel: string;
  tabCategory: Exclude<PaymentLedgerTabId, 'all'>;
  downloadTitle: string;
}

export interface OfficePaymentFormValues {
  applicantRef: string;
  challanNumber: string;
  amount: string;
  facilityValue: 'track' | 'football' | 'turf' | 'badminton';
  paymentMode: 'challan' | 'cash' | 'pos';
  entryTimestamp: string;
}

export interface OfficeSelectOption {
  value: string;
  label: string;
}
