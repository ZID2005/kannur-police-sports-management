import type {
  ApiAuditLog,
  ApiGateLog,
  ApiMembership,
  ApiPaymentRecord,
} from '@/api/client';
import {
  adminApplicantPortraitUrl,
  adminDocumentIdThumbUrl,
} from '@/data/mockData';
import type {
  AdminMembershipApplication,
  AdminMembershipStatus,
  AdminTurnstileEvent,
} from '@/types/adminMemberships';
import type { PaymentTransactionRow } from '@/types/adminOps';
import type { AuditLogEntry, GateEntryRecord } from '@/types/gate';

function getInitials(name?: string | null): string {
  const parts = (name ?? 'KC').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'KC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function mapBackendMembershipStatusToUi(
  m: ApiMembership
): AdminMembershipStatus {
  switch (m.status) {
    case 'APPROVED_UNPAID':
    case 'ACTIVE':
      return 'APPROVED';
    case 'REJECTED':
    case 'SUSPENDED':
    case 'EXPIRED':
      return 'REJECTED';
    case 'PENDING_APPROVAL':
    default:
      return m.officer_remarks ? 'REVISION_REQUESTED' : 'PENDING_APPROVAL';
  }
}

export function mapApiMembershipToApplication(
  m: ApiMembership,
  capacityStats?: {
    active_and_approved_count: number;
    monthly_member_cap: number;
    remaining_slots: number;
  }
): AdminMembershipApplication {
  const fullName = m.user?.full_name ?? m.user?.username ?? 'Applicant';
  const username = m.user?.username ?? 'member';
  const isGovt = m.user?.role === 'GOVT_PERSONNEL';
  const uiStatus = mapBackendMembershipStatusToUi(m);

  const capTotal = capacityStats?.monthly_member_cap ?? m.facility?.monthly_member_cap ?? 300;
  const activeCount = capacityStats?.active_and_approved_count ?? 0;
  const remaining = capacityStats?.remaining_slots ?? Math.max(0, capTotal - activeCount);
  const capPct = Math.min(100, Math.round((activeCount / Math.max(1, capTotal)) * 100));

  const monthlyRate = isGovt ? 250 : 500;
  const baseAmt = m.calculated_tariff
    ? Number(m.calculated_tariff.base_amount)
    : monthlyRate * m.duration_months;
  const gstAmt = m.calculated_tariff
    ? Number(m.calculated_tariff.gst_amount)
    : Math.round(baseAmt * 0.18 * 100) / 100;
  const totalAmt = m.calculated_tariff
    ? Number(m.calculated_tariff.total_amount)
    : Math.round((baseAmt + gstAmt) * 100) / 100;

  const feeFormatted = `₹${totalAmt.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const feeShort = `₹${Math.round(totalAmt).toLocaleString('en-IN')}`;

  const createdLabel = new Date(m.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusLabelMap: Record<ApiMembership['status'], string> = {
    PENDING_APPROVAL: m.officer_remarks
      ? 'Revision Requested (Pending Resubmission)'
      : 'Pending Officer Approval',
    APPROVED_UNPAID: `Approved — Payment Unlocked (${feeShort})`,
    ACTIVE: `Active Pass • Settled (${feeShort})`,
    REJECTED: 'Application Rejected',
    SUSPENDED: 'Membership Suspended',
    EXPIRED: 'Membership Expired',
  };

  const timeline = (m.status_timeline ?? []).map((step, idx) => ({
    id: `tl-${m.id}-${idx}`,
    title: step.description,
    subtitle: step.timestamp
      ? new Date(step.timestamp).toLocaleString('en-IN')
      : step.officer_remarks
        ? `Remarks: ${step.officer_remarks}`
        : `Stage: ${step.stage}`,
    state: (step.completed
      ? 'COMPLETED'
      : m.status === 'REJECTED' || m.status === 'SUSPENDED'
        ? 'REJECTED'
        : m.officer_remarks
          ? 'REVISION'
          : 'CURRENT') as 'COMPLETED' | 'CURRENT' | 'REJECTED' | 'REVISION',
  }));

  if (timeline.length === 0) {
    timeline.push({
      id: `tl-${m.id}-0`,
      title: 'Application Submitted to Synthetic Track Queue',
      subtitle: createdLabel,
      state: 'COMPLETED',
    });
  }

  return {
    id: m.id,
    dossierNumber: m.pass_code,
    applicantName: fullName,
    shortTitleName: fullName,
    initials: getInitials(fullName),
    avatarTone: isGovt ? 'primary' : 'secondary',
    tagLabel: isGovt ? 'Govt Personnel' : 'General Public',
    tagTone: isGovt ? 'primary' : 'neutral',
    designation: isGovt
      ? `Government Personnel • @${username}`
      : `Citizen Applicant • @${username}`,
    organizationLabel: isGovt ? 'Govt / Police Concession' : 'General Public',
    organizationHighlight: isGovt,
    category: isGovt ? 'POLICE_GOVT' : 'PUBLIC',
    facilityPlanLabel: `Synthetic Track (${m.duration_months} Mo • ${m.session_window})`,
    facilityFullTitle: m.facility?.name ?? 'Synthetic 400m Athletic Track',
    facilityLocation: 'Police Parade Grounds, Kannur Headquarters',
    slotAllocationBadge: `${m.session_window} WINDOW`,
    declaredPurpose: 'Synthetic 400m Track athletic conditioning and fitness training.',
    trackCapacityPercent: capPct,
    trackCapacityDash: `${capPct}, 100`,
    trackOpenSlotsLabel: `${remaining} Slots Open`,
    submittedAtLabel: createdLabel,
    submittedFullTimestamp: new Date(m.created_at).toLocaleString('en-IN'),
    status: uiStatus,
    statusLabel: statusLabelMap[m.status] ?? m.status,
    statusHeaderLabel: `Status: ${m.status}`,
    slaLabel: `Member Cap: ${activeCount} / ${capTotal}`,
    isOver24h:
      m.status === 'PENDING_APPROVAL' &&
      Date.now() - new Date(m.created_at).getTime() > 24 * 60 * 60 * 1000,
    primaryActionLabel:
      m.status === 'PENDING_APPROVAL' ? 'Approve' : 'View Dossier',
    secondaryActionLabel:
      m.status === 'PENDING_APPROVAL' ? 'Review Dossier' : undefined,
    photoUrl: m.user?.profile_photo_url || adminApplicantPortraitUrl,
    photoAlt: `${fullName} profile photo`,
    biometricMatchLabel: 'Gate 2 Dual-Factor Ready',
    concessionBannerText: isGovt
      ? 'Government Personnel Concession — '
      : 'Public Citizen Tariff — ',
    concessionHighlightText: isGovt
      ? '50% Subsidized Monthly Pass'
      : 'Standard Monthly Rate + 18% GST',
    dobAgeLabel: 'Verified Portal Profile',
    gender: 'Registered Member',
    fatherName: m.user?.email || 'Portal Account',
    deputedUnit: isGovt ? 'Government Service Unit' : 'Citizen Sports Quota',
    deputedLocation: 'Kannur District, Kerala',
    intranetStatusLabel: m.user?.account_status ?? 'ACTIVE',
    intranetSubtext: `User Role: ${m.user?.role ?? 'PUBLIC'}`,
    syncBadgeLabel: m.status,
    presentAddressWard: 'Kannur City Jurisdiction',
    presentAddressLines: ['Registered via KCP Intranet Portal', `Username: @${username}`],
    permanentAddressRelation: 'Identical',
    permanentAddressLines: ['Registered via KCP Intranet Portal', `Pass Code: ${m.pass_code}`],
    documentFileName: m.govt_service_proof_url
      ? m.govt_service_proof_url.split('/').pop() || 'Service_Proof_Document.pdf'
      : 'Public_Portal_Declaration.pdf',
    documentFileSize: m.govt_service_proof_url ? 'Verified Link' : 'Digital Record',
    documentSignBadge: m.govt_service_proof_url ? 'Proof Attached' : 'Standard Application',
    documentDeptTitle: 'Kannur City Police Sports Council',
    documentDeptSubtitle: m.govt_service_proof_url
      ? m.govt_service_proof_url
      : 'Synthetic Track Membership Dossier',
    documentThumbUrl: adminDocumentIdThumbUrl,
    documentThumbAlt: 'Dossier credential document preview',
    documentCardHolder: fullName.toUpperCase(),
    documentCardRole: isGovt ? 'Government Personnel' : 'Public Member',
    documentCardMeta: `PASS: ${m.pass_code} • ${m.duration_months} MO`,
    documentHash: m.qr_token_hash ? `HMAC: ${m.qr_token_hash.slice(0, 18)}...` : 'Pending Activation',
    documentVaultBadge: m.status === 'ACTIVE' ? 'QR Activated' : 'In Review Queue',
    clearanceChecks: [
      {
        id: 'cap',
        title: '300-Member Capacity Compliance',
        subtitle: `${activeCount} / ${capTotal} active or approved slots occupied`,
        icon: 'groups',
        badgeText: remaining > 0 ? 'AVAILABLE' : 'FULL',
        status: remaining > 0 ? 'CLEAR' : 'FLAGGED',
      },
      {
        id: 'proof',
        title: 'Eligibility & Service Proof',
        subtitle: isGovt
          ? m.govt_service_proof_url || 'Service proof URL attached'
          : 'Public membership application',
        icon: 'badge',
        badgeText: isGovt ? (m.govt_service_proof_url ? 'ATTACHED' : 'MISSING') : 'PUBLIC',
        status: isGovt && !m.govt_service_proof_url ? 'PENDING' : 'CLEAR',
      },
      {
        id: 'account',
        title: 'Portal Account Status',
        subtitle: `@${username} • ${m.user?.account_status ?? 'ACTIVE'}`,
        icon: 'verified_user',
        badgeText: m.user?.account_status ?? 'ACTIVE',
        status: m.user?.account_status === 'ACTIVE' ? 'CLEAR' : 'FLAGGED',
      },
    ],
    timeline,
    defaultOfficerRemarks:
      m.officer_remarks ||
      (isGovt
        ? 'Verified service proof credentials. Approved for subsidized Synthetic Track membership.'
        : 'Application verified against 300-member capacity cap. Approved for fee settlement.'),
    feeAmountFormatted: feeFormatted,
    feeShortFormatted: feeShort,
    feeTaxBadge: 'Incl. 18% GST',
    digitalSignatureTokenId: m.pass_code,
  };
}

export function mapApiGateLogToTurnstileEvent(log: ApiGateLog): AdminTurnstileEvent {
  const personName = log.user?.full_name || log.pass_or_booking_code;
  const timeLabel = new Date(log.scanned_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const facCode = log.facility?.code ?? 'SYNTHETIC_TRACK';
  const methodLabel =
    log.verification_type === 'MANUAL_OVERRIDE'
      ? 'Manual Override'
      : log.verification_type === 'QR_AND_BIOMETRIC'
        ? 'QR + Biometric'
        : 'QR Only';

  return {
    id: log.id,
    personName,
    timeLabel,
    locationMeta: `${log.gate_name} • ${log.pass_or_booking_code}`,
    granted: log.access_granted,
    statusBadge:
      log.verification_type === 'MANUAL_OVERRIDE'
        ? 'Override'
        : log.access_granted
          ? 'Granted'
          : 'Denied',
    methodLabel,
    icon:
      log.verification_type === 'MANUAL_OVERRIDE'
        ? 'admin_panel_settings'
        : log.access_granted
          ? 'qr_code_scanner'
          : 'gpp_maybe',
    gateCategory: facCode === 'SYNTHETIC_TRACK' ? 'GATE_2' : 'TURF',
    alertActionLabel: log.access_granted ? undefined : 'Inspect Log',
  };
}

export function mapApiGateLogToRecord(log: ApiGateLog): GateEntryRecord {
  const dt = new Date(log.scanned_at);
  const memberName = log.user?.full_name || log.pass_or_booking_code;
  const facName = log.facility?.name ?? 'Kannur Sports Facility';
  const facCode = log.facility?.code ?? 'SYNTHETIC_TRACK';
  const isOverride = log.verification_type === 'MANUAL_OVERRIDE';

  const status: GateEntryRecord['status'] = isOverride
    ? 'Override'
    : log.access_granted
      ? 'Granted'
      : 'Rejected';

  const filterType: GateEntryRecord['filterType'] = isOverride
    ? 'override'
    : log.access_granted
      ? 'verified'
      : 'failed';

  const verificationStage = isOverride
    ? 'Manual Override (§6.28)'
    : log.verification_type === 'QR_AND_BIOMETRIC'
      ? log.access_granted
        ? 'QR + Biometric Passed'
        : log.stage1_qr_passed
          ? 'Biometric Failed'
          : 'QR Failed'
      : log.access_granted
        ? 'QR Scan Passed'
        : 'QR Failed';

  return {
    id: log.id,
    time: dt.toTimeString().slice(0, 8),
    date: dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    initials: getInitials(memberName),
    avatarClass: isOverride
      ? 'bg-secondary-container/50 text-on-secondary-container'
      : log.access_granted
        ? 'bg-primary/10 text-primary'
        : 'bg-error-container text-on-error-container',
    memberName,
    memberSub: `${log.user?.role ?? 'PASS'} • Ref: ${log.pass_or_booking_code}`,
    passId: log.pass_or_booking_code,
    category: log.user?.role === 'GOVT_PERSONNEL' ? 'Govt / Dept' : 'General Public',
    categoryClass: 'bg-surface-container-high text-on-surface',
    facility: `${facName} — ${log.gate_name}`,
    facilityFilterKey: facCode,
    facilityIcon: facCode === 'SYNTHETIC_TRACK' ? 'directions_run' : 'sports_soccer',
    facilityIconClass: 'text-primary',
    verificationStage,
    verificationIcon: isOverride
      ? 'verified_user'
      : log.access_granted
        ? 'check_circle'
        : 'error',
    verificationBadgeClass: isOverride
      ? 'bg-indigo-50 text-indigo-700'
      : log.access_granted
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-error-container text-on-error-container',
    remarks:
      log.failure_or_override_reason ||
      (log.access_granted
        ? `Access granted at ${log.gate_name} (${log.verification_type})`
        : 'Gate entry denied'),
    status,
    filterType,
    rowHighlightClass: isOverride ? 'bg-secondary-container/10' : undefined,
    authorizingOfficer: log.verified_by_officer?.full_name,
    signatureHash: log.id.slice(0, 12),
  };
}

export function mapApiPaymentToRow(p: ApiPaymentRecord): PaymentTransactionRow {
  const memberName = p.user?.full_name ?? p.user?.username ?? 'Portal Member';
  const isGovt = p.user?.role === 'GOVT_PERSONNEL';
  const facCode = p.facility_code ?? 'SYNTHETIC_TRACK';
  const facGroupMap: Record<string, PaymentTransactionRow['facilityFilterGroup']> = {
    SYNTHETIC_TRACK: 'Synthetic Track',
    FOOTBALL_GROUND: 'Football Ground',
    POLICE_TURF: 'Police Turf',
    BADMINTON_COURT: 'Indoor Badminton',
  };
  const facilityGroup = facGroupMap[facCode] ?? 'Synthetic Track';

  const isOffice = p.payment_mode === 'OFFICE_RECEIPT';
  const isRefund = p.status === 'REFUNDED';

  return {
    id: p.id,
    receiptId: p.receipt_no,
    timestamp: new Date(p.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    isRefund,
    memberInitials: getInitials(memberName),
    avatarTone: isGovt ? 'primary' : 'secondary',
    memberName,
    memberMeta: `${p.pass_or_booking_code ?? p.reference_id} • @${p.user?.username ?? 'user'}`,
    categoryLabel: isGovt ? 'Govt (Concession)' : 'Public Standard',
    categoryTone: isGovt ? 'primary-fixed' : 'neutral',
    facilityName: p.facility_name ?? facilityGroup,
    facilityFilterGroup: facilityGroup,
    facilityPurpose:
      p.reference_type === 'MEMBERSHIP' ? 'Monthly Track Pass' : 'Hourly Slot Booking',
    paymentModeLabel: isOffice ? 'Office Receipt / Challan' : 'Online Gateway',
    paymentModeIcon: isOffice ? 'receipt' : 'qr_code_2',
    paymentModeIconTone: isOffice ? 'primary' : 'emerald',
    amountFormatted: `₹${Number(p.total_amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    status: isRefund ? 'refunded' : isOffice ? 'treasury' : 'settled',
    statusLabel: isRefund ? 'Refunded' : isOffice ? 'Office Receipt' : 'Settled',
    tabCategory: isRefund ? 'refunds' : isOffice ? 'office' : 'online',
    downloadTitle: `Receipt ${p.receipt_no}`,
  };
}

export function mapApiAuditLogToEntry(log: ApiAuditLog): AuditLogEntry {
  const dt = new Date(log.created_at);
  const officerName = log.officer?.full_name ?? log.officer?.username ?? 'System Officer';
  const cat = log.action_category.toUpperCase();

  let filterCategory: AuditLogEntry['filterCategory'] = 'slots';
  if (cat.includes('BAN') || cat.includes('USER_STATUS')) filterCategory = 'bans';
  else if (cat.includes('PAYMENT') || cat.includes('OFFICE_RECEIPT')) filterCategory = 'payments';
  else if (cat.includes('GATE')) filterCategory = 'gate';

  return {
    id: log.id,
    date: dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeIst: dt.toTimeString().slice(0, 8),
    officerInitials: getInitials(officerName),
    officerAvatarClass: 'bg-primary/10 text-primary',
    officerName,
    officerMeta: `@${log.officer?.username ?? 'officer'} • ${log.ip_address}`,
    categoryLabel: log.action_category,
    categoryBadgeClass:
      filterCategory === 'bans'
        ? 'bg-error-container text-on-error-container'
        : filterCategory === 'payments'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-primary-fixed text-on-primary-fixed',
    categoryDotClass:
      filterCategory === 'bans'
        ? 'bg-error'
        : filterCategory === 'payments'
          ? 'bg-emerald-600'
          : 'bg-primary',
    filterCategory,
    entityType: log.action_category,
    actionTitle: log.action_description,
    actionSubtitle: `Category: ${log.action_category}`,
    targetRefId: log.target_ref_id || log.id.slice(0, 12),
    targetSubtitle: `IP: ${log.ip_address}`,
    reason: log.details ? JSON.stringify(log.details) : log.action_description,
  };
}
