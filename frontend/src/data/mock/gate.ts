import type {
  AuditCategoryTabItem,
  AuditLogEntry,
  AuditStatCardData,
  GateEntryRecord,
  GateEntryTabItem,
  GateOverrideDefaults,
  GateScannerMemberProfile,
  GateScanState,
  GateSummaryStat,
} from '@/types/gate';

/* =====================================================================
 *  1. ADMIN GATE ENTRIES & MANUAL OVERRIDE LOGS (/admin/gate-entries)
 * ===================================================================== */

export const gateTelemetryHeader = {
  versionBadge: 'ACCESS CONTROL & TURNSTILE TELEMETRY v4.2',
  liveSyncBadge: 'Turnstile Network Live Sync (Gates 1–4)',
  title: 'Gate Entries & Manual Override Logs',
  subtitle:
    'Real-time turnstile biometric verification, automated QR gate telemetry, and Section 6.28 supervisory manual entry overrides.',
  totalRecordedCount: 542,
  totalPages: 109,
};

export const gateSummaryStats: GateSummaryStat[] = [
  {
    id: 'total-entries',
    icon: 'directions_walk',
    iconWrapClass: 'bg-primary/10 text-primary',
    badgeText: '+18.4% vs yday',
    badgeIcon: 'trending_up',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    label: 'Total Entries Today',
    value: '542',
    valueClass: 'text-on-surface',
    subtext: '489 Synthetic Track • 53 Pitches',
    dotClass: 'bg-primary',
  },
  {
    id: 'verified-scans',
    icon: 'qr_code_scanner',
    iconWrapClass: 'bg-emerald-50 text-emerald-600',
    badgeText: '95.6% First Pass',
    badgeIcon: 'verified',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    label: 'Verified Auto Scans',
    value: '518',
    valueClass: 'text-on-surface',
    subtext: 'Synthetic Track Gate 2 & 3 Turnstiles',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'failed-alerts',
    icon: 'gpp_maybe',
    iconWrapClass: 'bg-amber-50 text-amber-600',
    badgeText: 'Flagged & Logged',
    badgeClass: 'bg-amber-50 text-amber-700',
    label: 'Failed Scan Alerts',
    value: '09',
    valueClass: 'text-amber-600',
    subtext: '5 Expired QR • 4 Biometric mismatch',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'manual-overrides',
    icon: 'key',
    iconWrapClass: 'bg-secondary-container/50 text-primary',
    badgeText: 'Rule § 6.28',
    badgeClass: 'bg-primary/10 text-primary font-semibold',
    label: 'Manual Overrides',
    value: '15',
    valueClass: 'text-primary',
    subtext: 'All officer signed • 100% Audited',
    dotClass: 'bg-primary',
  },
];

export const gateEntryTabs: GateEntryTabItem[] = [
  { id: 'all', label: 'All Entries (542)' },
  { id: 'verified', label: 'Verified Scans (518)' },
  {
    id: 'failed',
    label: 'Failed Attempts',
    badgeCount: '9',
    badgeClass: 'bg-error-container text-on-error-container',
  },
  {
    id: 'override',
    label: 'Manual Overrides',
    badgeCount: '15',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
  },
];

export const gateDateOptions: string[] = [
  'Today (24 Nov 2024)',
  'Yesterday (23 Nov 2024)',
  'Last 7 Days (18–24 Nov 2024)',
  'Nov 2024 Full Ledger',
];

export const gateFacilityFilters: string[] = [
  'All Facilities',
  'Synthetic Track - Gate 2',
  'Synthetic Track - Gate 3',
  'Football Ground - Gate 1',
  'Police Turf - Cage A',
];

export const gateEntryLogs: GateEntryRecord[] = [
  {
    id: 'GE-001',
    time: '17:14:02',
    date: '24 Nov 2024',
    initials: 'AK',
    avatarClass: 'bg-primary/10 text-primary',
    memberName: 'Anil Kumar',
    memberSub: 'Sub-Inspector, PIN: 549210 • Traffic North',
    passId: 'KCP-MEM-2024-8842',
    category: 'Govt / Dept',
    categoryClass: 'bg-surface-container-high text-on-surface',
    facility: 'Synthetic Track — Gate 2',
    facilityFilterKey: 'Synthetic Track - Gate 2',
    facilityIcon: 'directions_run',
    facilityIconClass: 'text-primary',
    verificationStage: 'QR + Biometric Passed',
    verificationIcon: 'check_circle',
    verificationBadgeClass: 'bg-emerald-50 text-emerald-700',
    remarks: 'Automated scan validated; monthly pass #KCP-MEM-2024-8842 active',
    status: 'Granted',
    filterType: 'verified',
  },
  {
    id: 'GE-002',
    time: '17:02:45',
    date: '24 Nov 2024',
    initials: 'PM',
    avatarClass: 'bg-secondary/15 text-secondary',
    memberName: 'Priya Mohan',
    memberSub: 'General Public Member • ID: CIT-4819',
    passId: 'CIT-4819',
    category: 'General Public',
    categoryClass: 'bg-surface-container-high text-secondary',
    facility: 'Synthetic Track — Gate 2',
    facilityFilterKey: 'Synthetic Track - Gate 2',
    facilityIcon: 'directions_run',
    facilityIconClass: 'text-primary',
    verificationStage: 'Manual Override (§6.28)',
    verificationIcon: 'verified_user',
    verificationBadgeClass: 'bg-indigo-50 text-indigo-700',
    remarks: 'Moisture on optical sensor prevented biometric match; digital pass photo matched manually at desk',
    status: 'Override',
    filterType: 'override',
    rowHighlightClass: 'bg-secondary-container/10',
    authorizingOfficer: 'Insp. Rajeev K. (PIN: 51209)',
    signatureHash: '9f8a32b0c4de8e71',
  },
  {
    id: 'GE-003',
    time: '16:45:10',
    date: '24 Nov 2024',
    initials: 'MS',
    avatarClass: 'bg-secondary-container/50 text-on-secondary-container',
    memberName: 'Malabar Sports Academy',
    memberSub: 'Club Booking • Reg #KB-9028, Capt: Rahul M.',
    passId: 'KB-9028',
    category: 'Club / Team',
    categoryClass: 'bg-surface-container-high text-on-surface',
    facility: 'Football Ground — Main Gate 1',
    facilityFilterKey: 'Football Ground - Gate 1',
    facilityIcon: 'sports_soccer',
    facilityIconClass: 'text-emerald-600',
    verificationStage: 'QR Validated',
    verificationIcon: 'qr_code',
    verificationBadgeClass: 'bg-emerald-50 text-emerald-700',
    remarks: 'Group slot pass (22 players permitted); entry verified by Duty Constable',
    status: 'Granted',
    filterType: 'verified',
  },
  {
    id: 'GE-004',
    time: '16:30:19',
    date: '24 Nov 2024',
    initials: 'RV',
    avatarClass: 'bg-error-container text-on-error-container',
    memberName: 'Rajesh V. K.',
    memberSub: 'Citizen • Pass #CIT-7712',
    passId: 'CIT-7712',
    category: 'General Public',
    categoryClass: 'bg-surface-container-high text-secondary',
    facility: 'Synthetic Track — Gate 3',
    facilityFilterKey: 'Synthetic Track - Gate 3',
    facilityIcon: 'directions_run',
    facilityIconClass: 'text-primary',
    verificationStage: 'Biometric Mismatch',
    verificationIcon: 'error',
    verificationBadgeClass: 'bg-error-container text-on-error-container',
    remarks: 'Card scanned valid, but biometric fingerprint failed 3 attempts (threshold < 40%)',
    remarksClass: 'text-on-error-container',
    status: 'Rejected',
    filterType: 'failed',
    rowHighlightClass: 'bg-error-container/15',
  },
  {
    id: 'GE-005',
    time: '16:15:33',
    date: '24 Nov 2024',
    initials: 'GV',
    avatarClass: 'bg-primary/10 text-primary',
    memberName: 'SI George Varghese',
    memberSub: 'Armed Reserve Police • PIN: 489912',
    passId: 'KCP-DEPT-489912',
    category: 'Department Official',
    categoryClass: 'bg-surface-container-high text-on-surface',
    facility: 'Police Turf — Cage Gate 4',
    facilityFilterKey: 'Police Turf - Cage A',
    facilityIcon: 'sports_tennis',
    facilityIconClass: 'text-secondary',
    verificationStage: 'Manual Override (§6.28)',
    verificationIcon: 'verified_user',
    verificationBadgeClass: 'bg-indigo-50 text-indigo-700',
    remarks: 'Scanner offline during network maintenance; verified physical departmental service card',
    status: 'Override',
    filterType: 'override',
    rowHighlightClass: 'bg-secondary-container/10',
    authorizingOfficer: 'Insp. Rajeev K. (PIN: 51209)',
    signatureHash: '7a41d80e29bc104f',
  },
];

export const gateOverrideTurnstiles: string[] = [
  'Synthetic Track — Turnstile Gate 2 (West)',
  'Synthetic Track — Turnstile Gate 3 (East)',
  'Football Ground — Main Gate 1',
  'Police Turf — Cage Gate 4',
  'Badminton Arena — Court Entry A',
];

export const gateOverrideFailureClassifications: string[] = [
  'Biometric Sensor Issue (Moisture/Optical)',
  'QR Scanner Hardware Error / Unresponsive',
  'System Sync / Temporary Network Latency',
  'Damaged QR Screen / Mobile Device Issue',
  'Emergency Service Operational Dispatch',
];

export const gateOverrideDefaults: GateOverrideDefaults = {
  referenceId: 'KCP-MEM-2024-8842',
  turnstile: 'Synthetic Track — Turnstile Gate 2 (West)',
  failureClassification: 'Biometric Sensor Issue (Moisture/Optical)',
  justification:
    'Fingerprint scanner failed 3x due to moisture on sensor. Member verified via active digital pass photo and duty desk confirmation.',
  officerName: 'Insp. Rajeev K. (PIN: 51209)',
  officerRole: 'Duty Officer • Kannur City Main Gate Desk',
  signatureTimestamp: '24 Nov 2024, 05:15 PM IST',
  signatureHash: '9f8a32b0c4de8e71',
};

/* =====================================================================
 *  2. SYSTEM AUDIT LOG & IMMUTABLE ACTIVITY TRAIL (/admin/audit-log)
 * ===================================================================== */

export const auditLedgerHeader = {
  categoryPill: 'ADMINISTRATIVE COMPLIANCE & SECURITY LEDGER • Statutory Record Vault v4.2',
  title: 'System Audit Log & Immutable Activity Trail',
  subtitle:
    'Chronological administrative actions, privilege escalations, fee modifications, slot reservations, and gate overrides recorded under Kerala Police Act & Departmental IT Rules § 6.24 & § 10.7.',
  statutoryNoticeTitle: 'Statutory Immutable Storage Notice (Rules § 6.24 & § 10.7):',
  statutoryNoticeBody:
    'All administrative events, override justifications, and fee modifications are cryptographically timestamped and committed to the Kannur City Police on-premise security vault. Audit entries cannot be modified, deleted, or purged.',
  dateRangeLabel: 'Nov 01 - Nov 24, 2024',
  totalLogsCount: '1,842',
  sha256Digest: 'SHA-256: 7c9a4e8f192b00c3... verified',
  totalPages: 307,
};

export const auditOfficerFilterOptions: string[] = [
  'All Officers',
  'Insp. Rajeev K.',
  'DySP Ramesh M.',
  'SI George Varghese',
];

export const auditEntityFilterOptions: string[] = [
  'All Entities',
  'Gate Turnstiles',
  'Memberships',
  'Facility Slots',
  'Tariffs & Payments',
];

export const auditStatCards: AuditStatCardData[] = [
  {
    id: 'total-events',
    label: 'Total Logged Events (This Month)',
    value: '1,842',
    icon: 'verified_user',
    iconBgClass: 'bg-primary-fixed',
    iconTextClass: 'text-primary',
    trendText: '+14.2% activity',
    trendIcon: 'trending_up',
    metaItems: [{ text: '100% verified', className: 'text-outline' }],
  },
  {
    id: 'membership-bans',
    label: 'Membership & Ban Actions',
    value: '128',
    icon: 'admin_panel_settings',
    iconBgClass: 'bg-secondary-fixed',
    iconTextClass: 'text-secondary',
    metaItems: [
      { text: '114 Approved' },
      { text: '11 Revisions' },
      { text: '3 Blacklisted', className: 'text-error font-medium' },
    ],
  },
  {
    id: 'slot-blocks-fees',
    label: 'Slot Blocks & Fee Changes',
    value: '34',
    icon: 'event_busy',
    iconBgClass: 'bg-tertiary-fixed',
    iconTextClass: 'text-tertiary',
    metaItems: [{ text: '28 Dept Blocks' }, { text: '6 Rate revisions' }],
  },
  {
    id: 'manual-overrides',
    label: 'Manual Gate Overrides',
    value: '42',
    icon: 'key_vertical',
    iconBgClass: 'bg-primary-fixed',
    iconTextClass: 'text-primary',
    metaItems: [
      { text: 'Rule § 6.28', className: 'font-medium text-primary' },
      { text: 'All officer signed' },
    ],
  },
];

export const auditCategoryTabs: AuditCategoryTabItem[] = [
  { id: 'all', label: 'All Logs (1,842)' },
  { id: 'bans', label: 'Approvals & Bans (128)' },
  { id: 'slots', label: 'Slots & Fees (34)' },
  { id: 'payments', label: 'Payments & Refunds (62)' },
  { id: 'gate', label: 'Gate Overrides (42)' },
];

export const auditLogEntries: AuditLogEntry[] = [
  {
    id: 'AUD-001',
    date: '24 Nov 2024',
    timeIst: '17:15:02 IST',
    officerInitials: 'RK',
    officerAvatarClass: 'bg-primary/10 text-primary',
    officerName: 'Insp. Rajeev K.',
    officerMeta: 'PIN: 51209 (Duty Officer)',
    categoryLabel: 'Gate Override',
    categoryBadgeClass: 'bg-emerald-50 text-emerald-800',
    categoryDotClass: 'bg-emerald-500',
    filterCategory: 'gate',
    entityType: 'Gate Turnstiles',
    actionTitle: 'Manual Gate Access Granted (§ 6.28)',
    actionSubtitle: 'Physical biometric bypass procedure',
    targetRefId: '#GATE-TURN-02',
    targetRefClass: 'text-primary',
    targetSubtitle: 'Track Turnstile 2',
    reason:
      'Fingerprint scanner failed 3x due to moisture on sensor. Member verified via active digital pass photo.',
  },
  {
    id: 'AUD-002',
    date: '24 Nov 2024',
    timeIst: '15:40:18 IST',
    officerInitials: 'RM',
    officerAvatarClass: 'bg-secondary/15 text-secondary',
    officerName: 'DySP Ramesh M.',
    officerMeta: 'PIN: 31084 (Asst. Commissioner)',
    categoryLabel: 'Security Blacklist',
    categoryBadgeClass: 'bg-error-container text-on-error-container',
    categoryDotClass: 'bg-error',
    filterCategory: 'bans',
    entityType: 'Memberships',
    actionTitle: 'Banned User Account & Revoked Pass',
    actionTitleClass: 'text-error',
    actionSubtitle: 'Immediate physical revocation',
    targetRefId: '#KCP-PUB-1102',
    targetRefClass: 'text-error',
    targetSubtitle: 'P. S. Harikrishnan',
    reason:
      'Repeated disciplinary violation of track protocol § 4.12; abusive conduct towards duty guard.',
  },
  {
    id: 'AUD-003',
    date: '24 Nov 2024',
    timeIst: '12:10:45 IST',
    officerInitials: 'RK',
    officerAvatarClass: 'bg-primary/10 text-primary',
    officerName: 'Insp. Rajeev K.',
    officerMeta: 'PIN: 51209 (Duty Officer)',
    categoryLabel: 'Slot Block',
    categoryBadgeClass: 'bg-amber-100 text-amber-900',
    categoryDotClass: 'bg-amber-600',
    filterCategory: 'slots',
    entityType: 'Facility Slots',
    actionTitle: 'Reserved Ground for Police Dept Training',
    actionSubtitle: 'Official departmental commandeer',
    targetRefId: '#SLOT-TURF-1900',
    targetRefClass: 'text-primary',
    targetSubtitle: 'Police Turf 19:00 - 20:00',
    reason:
      'Official Armed Reserve battalion fitness drills ordered by SP Kannur City (Order #AR-552/24).',
  },
  {
    id: 'AUD-004',
    date: '23 Nov 2024',
    timeIst: '18:22:30 IST',
    officerInitials: 'GV',
    officerAvatarClass: 'bg-tertiary-fixed text-tertiary',
    officerName: 'SI George Varghese',
    officerMeta: 'PIN: 48991 (Station Admin)',
    categoryLabel: 'Membership Approval',
    categoryBadgeClass: 'bg-primary-fixed text-on-primary-fixed-variant',
    categoryDotClass: 'bg-primary',
    filterCategory: 'bans',
    entityType: 'Memberships',
    actionTitle: 'Approved Govt Personnel Membership',
    actionSubtitle: '3-Month Govt Personnel Membership',
    targetRefId: '#KCP-MEM-2024-8842',
    targetRefClass: 'text-primary',
    targetSubtitle: 'Sub-Insp. Anil Kumar',
    reason: 'Verified official police service certificate and concession eligibility.',
  },
  {
    id: 'AUD-005',
    date: '23 Nov 2024',
    timeIst: '14:05:12 IST',
    officerInitials: 'RM',
    officerAvatarClass: 'bg-secondary/15 text-secondary',
    officerName: 'DySP Ramesh M.',
    officerMeta: 'PIN: 31084 (Asst. Commissioner)',
    categoryLabel: 'Rate Revision',
    categoryBadgeClass: 'bg-purple-100 text-purple-900',
    categoryDotClass: 'bg-purple-600',
    filterCategory: 'slots',
    entityType: 'Tariffs & Payments',
    actionTitle: 'Updated Public Hourly Pitch Booking Tariff',
    actionSubtitle: 'Gazetted Sports Council tariff schedule',
    targetRefId: '#FEE-FTB-01',
    targetRefClass: 'text-primary',
    targetSubtitle: 'Football Ground Main',
    reason:
      'Annual statutory price revision approved by District Sports Welfare Council. Revised from ₹1,000 to ₹1,200/hr.',
  },
  {
    id: 'AUD-006',
    date: '22 Nov 2024',
    timeIst: '10:15:40 IST',
    officerInitials: 'RK',
    officerAvatarClass: 'bg-primary/10 text-primary',
    officerName: 'Insp. Rajeev K.',
    officerMeta: 'PIN: 51209 (Duty Officer)',
    categoryLabel: 'Refund Authorized',
    categoryBadgeClass: 'bg-surface-container text-on-surface-variant',
    categoryDotClass: 'bg-outline',
    filterCategory: 'payments',
    entityType: 'Tariffs & Payments',
    actionTitle: 'Emergency Weather Refund Approved',
    actionSubtitle: 'Force majeure clause invoked',
    targetRefId: '#TXN-REF-4091',
    targetRefClass: 'text-primary',
    targetSubtitle: 'Malabar Sports Club',
    reason:
      'Ground unplayable due to heavy monsoon rain warning issued by Disaster Management Authority.',
  },
];

/* =====================================================================
 *  3. GATE SCANNER FIELD DEVICE KIOSK (/gate/scanner)
 * ===================================================================== */

export const gateScannerQuickGates: string[] = [
  'All Gates',
  'Synthetic Track - Gate 2',
  'Football Ground',
  'Police Turf',
  'Badminton Court',
];

export const gateScannerTelemetry = {
  turnstileLatency: '64ms',
  firmwareVersion: 'v4.2.1-SEC',
  cameraBadge: 'Cam 01 • UltraHD 60FPS',
  autoFocusLabel: 'AUTO-FOCUS LOCK: ACTIVE',
  reticleHint: 'Align Digital Pass or Kerala Police mPass QR in brackets',
  lookupHelperText: 'Supports Membership ID, Booking Ref, and Challan Token',
  recentQueriesLabel: 'Recent Queries (12)',
  statutoryRuleNote:
    'Hourly Turf, Football Ground & Badminton bookings clear automatically at Stage 1 (QR only). Synthetic Track requires Stage 2 biometric match per Section 6.25.',
};

export const gateScannerProfiles: Record<GateScanState, GateScannerMemberProfile> = {
  valid: {
    scanState: 'valid',
    lookupCode: 'KCP-PUB-2024-3194',
    passIdDisplay: '#KCP-PUB-2024-3194',
    name: 'Priya Mohan',
    categoryBadge: 'General Public • Citizen',
    photoUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrB7tuXUPyXW9fYJM5AoTeNRY92R-I5DH-zeYatJ3rGweCNVHMbZf2B4f3M0lg0r_1iJjxM4vbXELaUR8KufQA5dPLotyKl535fQa7fZXvAgMB_1qSU5meTpF16apm4PBLfOcdv_zD5o-bdUqNrHVdmD5pcHB7l_-Vw7VxwbQkX7jLjdo17la0ZHT_yz7IR0mSw9wWvPruO9LymErxbcr9f1d40HKFDy-yRpddklBGc',
    venueAndPassType: 'Synthetic Track • 3-Month Pass',
    permittedSlotWindow: 'Morning & Evening (05:30 - 08:30 / 16:30 - 19:30)',
    validityPeriod: '01 Nov 2024 – 31 Jan 2025 (Active)',
    stage1StatusText: 'Stage 1: Optical QR Verified',
    stage1DetectedLabel: 'PASS DETECTED',
    stage2Title: 'Stage 2: Biometric Check Passed — Entry Granted',
    stage2Subtitle: 'Turnstile 2 Scanner Sensor #TN-02 • Match Confidence: 99.6%',
    turnstileBadgeText: 'Turnstile Unlocked',
    biometricHash: '8c19...4f7a (Encrypted)',
    cycleStatusText: 'Ready for gate cycle',
  },
  expired: {
    scanState: 'expired',
    lookupCode: 'KCP-PUB-2024-1048',
    passIdDisplay: '#KCP-PUB-2024-1048',
    name: 'Vineeth Nambiar',
    categoryBadge: 'General Public • Citizen',
    photoUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrB7tuXUPyXW9fYJM5AoTeNRY92R-I5DH-zeYatJ3rGweCNVHMbZf2B4f3M0lg0r_1iJjxM4vbXELaUR8KufQA5dPLotyKl535fQa7fZXvAgMB_1qSU5meTpF16apm4PBLfOcdv_zD5o-bdUqNrHVdmD5pcHB7l_-Vw7VxwbQkX7jLjdo17la0ZHT_yz7IR0mSw9wWvPruO9LymErxbcr9f1d40HKFDy-yRpddklBGc',
    venueAndPassType: 'Synthetic Track • 1-Month Pass',
    permittedSlotWindow: 'Morning Batch (05:30 - 08:30)',
    validityPeriod: '01 Oct 2024 – 31 Oct 2024 (Expired)',
    stage1StatusText: 'Stage 1: Pass Validity Expired',
    stage1DetectedLabel: 'EXPIRED PASS',
    stage2Title: 'Stage 2: Entry Hold — Membership Renewal Required',
    stage2Subtitle: 'Turnstile 2 Locked • Pass expired 24 days ago (Rule § 6.14)',
    turnstileBadgeText: 'Turnstile Locked',
    biometricHash: '4a02...9d1e (Hold)',
    cycleStatusText: 'Awaiting renewal or desk action',
  },
  invalid: {
    scanState: 'invalid',
    lookupCode: 'CIT-7712',
    passIdDisplay: '#CIT-7712',
    name: 'Rajesh V. K.',
    categoryBadge: 'General Public • Citizen',
    photoUrl:
      'https://lh3.googleusercontent.com/aida/ALJJyrB7tuXUPyXW9fYJM5AoTeNRY92R-I5DH-zeYatJ3rGweCNVHMbZf2B4f3M0lg0r_1iJjxM4vbXELaUR8KufQA5dPLotyKl535fQa7fZXvAgMB_1qSU5meTpF16apm4PBLfOcdv_zD5o-bdUqNrHVdmD5pcHB7l_-Vw7VxwbQkX7jLjdo17la0ZHT_yz7IR0mSw9wWvPruO9LymErxbcr9f1d40HKFDy-yRpddklBGc',
    venueAndPassType: 'Synthetic Track • 1-Month Pass',
    permittedSlotWindow: 'Evening Batch (16:30 - 19:30)',
    validityPeriod: '01 Nov 2024 – 30 Nov 2024 (Flagged)',
    stage1StatusText: 'Stage 1: QR Read — Security Alert',
    stage1DetectedLabel: 'BIOMETRIC ALERT',
    stage2Title: 'Stage 2: Biometric Mismatch — Entry Denied',
    stage2Subtitle: 'Turnstile 2 Sensor #TN-02 • Match Confidence: 31.4% (Threshold < 40%)',
    turnstileBadgeText: 'Access Denied',
    biometricHash: 'f31b...00c8 (Mismatch)',
    cycleStatusText: 'Incident flagged in security ledger',
  },
};

export const gateScannerRecentQueries: {
  code: string;
  name: string;
  type: string;
  scanState: GateScanState;
}[] = [
  { code: 'KCP-PUB-2024-3194', name: 'Priya Mohan', type: '3-Month Track Pass', scanState: 'valid' },
  { code: 'KCP-MEM-2024-8842', name: 'SI Anil Kumar', type: 'Dept Track Pass', scanState: 'valid' },
  { code: 'KCP-PUB-2024-1048', name: 'Vineeth Nambiar', type: 'Expired Track Pass', scanState: 'expired' },
  { code: 'CIT-7712', name: 'Rajesh V. K.', type: 'Biometric Alert', scanState: 'invalid' },
];
