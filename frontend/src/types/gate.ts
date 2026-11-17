export type GateEntryFilterTab = 'all' | 'verified' | 'failed' | 'override';

export type GateEntryStatus = 'Granted' | 'Override' | 'Rejected';

export interface GateSummaryStat {
  id: string;
  icon: string;
  iconWrapClass: string;
  badgeText: string;
  badgeIcon?: string;
  badgeClass: string;
  label: string;
  value: string;
  valueClass: string;
  subtext: string;
  dotClass: string;
}

export interface GateEntryTabItem {
  id: GateEntryFilterTab;
  label: string;
  count?: number;
  badgeCount?: string;
  badgeClass?: string;
}

export interface GateEntryRecord {
  id: string;
  time: string;
  date: string;
  initials: string;
  avatarClass: string;
  memberName: string;
  memberSub: string;
  passId: string;
  category: string;
  categoryClass: string;
  facility: string;
  facilityFilterKey: string;
  facilityIcon: string;
  facilityIconClass: string;
  verificationStage: string;
  verificationIcon: string;
  verificationBadgeClass: string;
  remarks: string;
  remarksClass?: string;
  status: GateEntryStatus;
  filterType: Exclude<GateEntryFilterTab, 'all'>;
  rowHighlightClass?: string;
  authorizingOfficer?: string;
  signatureHash?: string;
}

export interface GateOverrideDefaults {
  referenceId: string;
  turnstile: string;
  failureClassification: string;
  justification: string;
  officerName: string;
  officerRole: string;
  signatureTimestamp: string;
  signatureHash: string;
}

export type AuditCategoryFilter = 'all' | 'bans' | 'slots' | 'payments' | 'gate';

export interface AuditCategoryTabItem {
  id: AuditCategoryFilter;
  label: string;
}

export interface AuditStatCardData {
  id: string;
  label: string;
  value: string;
  icon: string;
  iconBgClass: string;
  iconTextClass: string;
  trendText?: string;
  trendIcon?: string;
  metaItems: {
    text: string;
    className?: string;
  }[];
}

export interface AuditLogEntry {
  id: string;
  date: string;
  timeIst: string;
  officerInitials: string;
  officerAvatarClass: string;
  officerName: string;
  officerMeta: string;
  categoryLabel: string;
  categoryBadgeClass: string;
  categoryDotClass: string;
  filterCategory: Exclude<AuditCategoryFilter, 'all'>;
  entityType: string;
  actionTitle: string;
  actionTitleClass?: string;
  actionSubtitle: string;
  targetRefId: string;
  targetRefClass?: string;
  targetSubtitle: string;
  reason: string;
}

export type GateScanState = 'valid' | 'expired' | 'invalid';

export interface GateScannerMemberProfile {
  scanState: GateScanState;
  lookupCode: string;
  passIdDisplay: string;
  name: string;
  categoryBadge: string;
  photoUrl: string;
  venueAndPassType: string;
  permittedSlotWindow: string;
  validityPeriod: string;
  stage1StatusText: string;
  stage1DetectedLabel: string;
  stage2Title: string;
  stage2Subtitle: string;
  turnstileBadgeText: string;
  biometricHash: string;
  cycleStatusText: string;
}
