/**
 * Types for the Admin Dashboard & Membership Administration area
 * (/admin/dashboard, /admin/memberships, /admin/memberships/:id).
 */

export type AdminMembershipStatus =
  | 'PENDING_APPROVAL'
  | 'IDENTITY_CLEARED'
  | 'DOCUMENTS_PENDING'
  | 'APPROVED'
  | 'REVISION_REQUESTED'
  | 'REJECTED';

export type AdminMembershipCategory = 'POLICE_GOVT' | 'PUBLIC' | 'MEDALIST';

export type AdminMembershipQueueFilterId = 'ALL' | 'POLICE_GOVT' | 'PUBLIC' | 'MEDALIST';

export interface AdminMembershipQueueFilter {
  id: AdminMembershipQueueFilterId;
  label: string;
  count: number;
}

export type AdminMembershipStatusFilterId = 'ALL' | AdminMembershipStatus;

export interface AdminMembershipStatusFilter {
  id: AdminMembershipStatusFilterId;
  label: string;
}

export interface AdminClearanceCheck {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badgeText: string;
  status: 'CLEAR' | 'PENDING' | 'FLAGGED';
}

export interface AdminWorkflowTimelineEvent {
  id: string;
  title: string;
  subtitle: string;
  state: 'COMPLETED' | 'CURRENT' | 'REJECTED' | 'REVISION';
}

export interface AdminMembershipApplication {
  id: string;
  dossierNumber: string;
  applicantName: string;
  shortTitleName: string;
  initials: string;
  avatarTone: 'primary' | 'secondary' | 'neutral' | 'tertiary';
  tagLabel: string;
  tagTone: 'neutral' | 'primary' | 'outline';
  pen?: string;
  badgeNumber?: string;
  designation: string;
  organizationLabel: string;
  organizationHighlight?: boolean;
  category: AdminMembershipCategory;
  facilityPlanLabel: string;
  facilityFullTitle: string;
  facilityLocation: string;
  slotAllocationBadge: string;
  declaredPurpose: string;
  trackCapacityPercent: number;
  trackCapacityDash: string;
  trackOpenSlotsLabel: string;
  submittedAtLabel: string;
  submittedFullTimestamp: string;
  status: AdminMembershipStatus;
  statusLabel: string;
  statusHeaderLabel: string;
  slaLabel: string;
  isOver24h?: boolean;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  photoUrl: string;
  photoAlt: string;
  biometricMatchLabel: string;
  concessionBannerText: string;
  concessionHighlightText: string;
  dobAgeLabel: string;
  gender: string;
  fatherName: string;
  deputedUnit: string;
  deputedLocation: string;
  intranetStatusLabel: string;
  intranetSubtext: string;
  syncBadgeLabel: string;
  presentAddressWard: string;
  presentAddressLines: string[];
  permanentAddressRelation: string;
  permanentAddressLines: string[];
  documentFileName: string;
  documentFileSize: string;
  documentSignBadge: string;
  documentDeptTitle: string;
  documentDeptSubtitle: string;
  documentThumbUrl: string;
  documentThumbAlt: string;
  documentCardHolder: string;
  documentCardRole: string;
  documentCardMeta: string;
  documentHash: string;
  documentVaultBadge: string;
  clearanceChecks: AdminClearanceCheck[];
  timeline: AdminWorkflowTimelineEvent[];
  defaultOfficerRemarks: string;
  feeAmountFormatted: string;
  feeShortFormatted: string;
  feeTaxBadge: string;
  digitalSignatureTokenId: string;
  flaggedForIntelligence?: boolean;
}

export interface AdminShiftMeta {
  shiftBadge: string;
  officerLabel: string;
  portalTitle: string;
  groundsBadge: string;
  subtitle: string;
}

export type AdminTurnstileGateFilter = 'ALL' | 'GATE_2' | 'TURF';

export interface AdminTurnstileGateOption {
  id: AdminTurnstileGateFilter;
  label: string;
}

export interface AdminTurnstileEvent {
  id: string;
  personName: string;
  timeLabel: string;
  locationMeta: string;
  granted: boolean;
  statusBadge: string;
  methodLabel: string;
  icon: string;
  gateCategory: 'GATE_2' | 'TURF';
  alertActionLabel?: string;
}

export interface AdminFacilityZoneMetric {
  label: string;
  value: string;
  highlight?: 'primary' | 'secondary' | 'default';
}

export interface AdminFacilityZoneCard {
  id: string;
  name: string;
  subtitle: string;
  dotTone: 'primary' | 'secondary' | 'primary-container';
  statusBadge: string;
  statusTone: 'primary' | 'secondary' | 'neutral';
  metrics: AdminFacilityZoneMetric[];
  footerLeft: string;
  footerRight: string;
  footerRightTone: 'primary' | 'secondary';
}

export interface AdminDashboardMetricSummary {
  activeTrackMembers: number;
  trackMemberCap: number;
  capUtilizedPercent: number;
  openSlotsCount: number;
  weeklyTrendLabel: string;
  pendingApprovalTotal: number;
  pendingOver24hCount: number;
  pendingGovtCount: number;
  pendingPublicCount: number;
  todaysBookingsTotal: number;
  todaysBookingsBreakdown: string[];
  nextBookingLabel: string;
  todaysCollectionsFormatted: string;
  trackPassesCollectionLabel: string;
  turfSlotsCollectionLabel: string;
  treasuryLabel: string;
  vaultStatusLabel: string;
}
