import type {
  ApiAuditLog,
  ApiMembership,
  ApiPaymentRecord,
  BackendAuditEntityType,
  BackendPaymentStatus,
} from '@/api/client';
import {
  adminApplicantPortraitUrl,
  adminDocumentIdThumbUrl,
} from '@/data/mockData';
import type {
  AdminMembershipApplication,
  AdminMembershipStatus,
} from '@/types/adminMemberships';
import type { PaymentTransactionRow } from '@/types/adminOps';
import type { AuditLogEntry, AuditMetadataBadge } from '@/types/adminAudit';

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
    profileVerificationLabel: 'Verified Portal Profile',
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
    documentHash: m.status === 'ACTIVE' ? `PASS: ${m.pass_code}` : 'Pending Activation',
    documentVaultBadge: m.status === 'ACTIVE' ? 'Active Pass' : 'In Review Queue',
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

function formatInr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPaymentStatusLabel(status: BackendPaymentStatus): string {
  switch (status) {
    case 'SETTLED':
      return 'Completed';
    case 'PENDING_RECONCILIATION':
      return 'Pending';
    case 'FAILED':
      return 'Failed';
    case 'REFUNDED':
      return 'Refunded';
  }
}

export function mapApiPaymentToRow(p: ApiPaymentRecord): PaymentTransactionRow {
  const memberName = p.user?.full_name ?? p.user?.username ?? 'Portal Member';
  const memberUsername = p.user?.username ?? 'member';
  const userCategory: 'PUBLIC' | 'GOVT_PERSONNEL' =
    p.user_category ??
    (p.user?.role === 'GOVT_PERSONNEL' ? 'GOVT_PERSONNEL' : 'PUBLIC');
  const isGovt = userCategory === 'GOVT_PERSONNEL';

  const breakdown = p.pricing_breakdown;
  const taxableSubtotal = Number(breakdown?.taxable_subtotal ?? p.base_amount ?? 0);
  const baseFee = Number(breakdown?.base_fee ?? taxableSubtotal);
  const concessionDiscount = Number(breakdown?.concession_discount ?? 0);
  const concessionPercent = Number(breakdown?.concession_percent ?? 0);
  const gstRate = Number(breakdown?.gst_rate ?? 18);
  const gstAmount = Number(breakdown?.gst_amount ?? p.gst_amount ?? 0);
  const finalTotalPaid = Number(breakdown?.final_total_paid ?? p.total_amount ?? 0);

  const createdDt = new Date(p.created_at);
  const dateLabel = Number.isNaN(createdDt.getTime())
    ? p.created_at
    : createdDt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  const timeLabel = Number.isNaN(createdDt.getTime())
    ? ''
    : createdDt.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

  const refDetails = (p.reference_details ?? {}) as Record<string, unknown>;
  let facilityPurpose =
    p.reference_type === 'MEMBERSHIP' ? 'Monthly Pass' : 'Hourly Slot Booking';
  if (p.reference_type === 'MEMBERSHIP' && refDetails.duration_months) {
    facilityPurpose = `Monthly Pass (${String(refDetails.duration_months)} Mo)`;
  } else if (p.reference_type === 'SLOT_BOOKING' && refDetails.court_partition) {
    const part = String(refDetails.court_partition);
    const partLabel =
      part === 'HALF_A' ? 'Half Court A' : part === 'HALF_B' ? 'Half Court B' : 'Full Court';
    facilityPurpose = `Hourly Slot • ${partLabel}`;
  }

  return {
    id: p.id,
    receiptId: p.receipt_no,
    bookingOrPassRef: p.pass_or_booking_code ?? p.reference_id,
    isoTimestamp: createdDt.toISOString(),
    dateLabel,
    timeLabel,
    memberInitials: getInitials(memberName),
    avatarTone: isGovt ? 'primary' : 'secondary',
    memberName,
    memberUsername,
    userCategory,
    categoryLabel: isGovt ? 'Govt / Police' : 'Public',
    facilityCode: p.facility_code ?? 'SPORTS_FACILITY',
    facilityName: p.facility_name ?? p.facility_code ?? 'Sports Facility',
    facilityPurpose,
    paymentMode: p.payment_mode,
    paymentModeLabel: p.payment_mode === 'OFFICE_RECEIPT' ? 'Office Receipt' : 'Online Gateway',
    baseFee,
    concessionDiscount,
    concessionPercent,
    taxableSubtotal,
    gstRate,
    gstAmount,
    finalTotalPaid,
    baseFeeFormatted: formatInr(baseFee),
    concessionDiscountFormatted: formatInr(concessionDiscount),
    taxableSubtotalFormatted: formatInr(taxableSubtotal),
    gstAmountFormatted: formatInr(gstAmount),
    totalPaidFormatted: formatInr(finalTotalPaid),
    status: p.status,
    statusLabel: getPaymentStatusLabel(p.status),
    recordedByOfficerName:
      p.recorded_by_officer?.full_name ?? p.recorded_by_officer?.username ?? null,
  };
}

const AUDIT_ACTION_META: Record<
  string,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  FACILITY_CREATED: {
    label: 'Facility Created',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  FACILITY_UPDATED: {
    label: 'Facility Updated',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed border border-primary/20',
    dotClass: 'bg-primary',
  },
  FACILITY_STATUS_UPDATED: {
    label: 'Facility Status Toggled',
    badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    dotClass: 'bg-amber-600',
  },
  FACILITY_SLOT_CREATED: {
    label: 'Slot Created',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  FACILITY_SLOT_UPDATED: {
    label: 'Slot Edited',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed border border-primary/20',
    dotClass: 'bg-primary',
  },
  FACILITY_SLOT_BLOCKED: {
    label: 'Slot Blocked',
    badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    dotClass: 'bg-amber-600',
  },
  FACILITY_SLOT_UNBLOCKED: {
    label: 'Slot Unblocked',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  FACILITY_SLOT_DELETED: {
    label: 'Slot Deleted',
    badgeClass: 'bg-error-container/60 text-on-error-container border border-error/25',
    dotClass: 'bg-error',
  },
  AUTHORITY_SLOT_BLOCK: {
    label: 'Authority Slot Block',
    badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    dotClass: 'bg-amber-600',
  },
  AUTHORITY_SLOT_UNBLOCK: {
    label: 'Authority Block Cleared',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  OFFICE_RECEIPT_PAYMENT: {
    label: 'Office Receipt Recorded',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClass: 'bg-emerald-600',
  },
  USER_STATUS_MODERATION: {
    label: 'Account Status Updated',
    badgeClass: 'bg-error-container/60 text-on-error-container border border-error/25',
    dotClass: 'bg-error',
  },
  OFFICER_AUTH: {
    label: 'Officer Sign-In',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed border border-secondary/20',
    dotClass: 'bg-secondary',
  },
  BOOKING_CANCELLATION: {
    label: 'Booking Cancelled',
    badgeClass: 'bg-surface-container text-secondary border border-outline-variant/40',
    dotClass: 'bg-secondary',
  },
  SYSTEM_SEED: {
    label: 'System Initialized',
    badgeClass: 'bg-surface-container text-secondary border border-outline-variant/40',
    dotClass: 'bg-secondary',
  },
};

function getEntityDisplay(entity: BackendAuditEntityType): {
  label: string;
  badgeClass: string;
} {
  switch (entity) {
    case 'FACILITY':
      return { label: 'FACILITY', badgeClass: 'bg-primary-fixed/80 text-primary' };
    case 'SLOT':
      return { label: 'SLOT', badgeClass: 'bg-amber-50 text-amber-800' };
    case 'PAYMENT':
      return { label: 'PAYMENT', badgeClass: 'bg-emerald-50 text-emerald-800' };
    case 'USER':
      return { label: 'ACCOUNT', badgeClass: 'bg-secondary-fixed text-secondary' };
    default:
      return { label: 'SYSTEM', badgeClass: 'bg-surface-container text-on-surface-variant' };
  }
}

export function mapApiAuditLogToEntry(log: ApiAuditLog): AuditLogEntry {
  const dt = new Date(log.created_at);
  const details = (log.details ?? {}) as Record<string, unknown>;
  const officerName =
    log.officer?.full_name ?? log.officer?.username ?? log.officer_username ?? 'System Officer';
  const officerUsername =
    log.officer?.username ?? log.officer_username ?? String(details.officer_username ?? 'officer');
  const officerRole =
    log.officer?.role ?? log.officer_role ?? String(details.officer_role ?? 'STAFF_ADMIN');
  const cat = log.action_category.toUpperCase();

  const entityType: BackendAuditEntityType =
    log.target_entity ??
    (cat.startsWith('FACILITY_SLOT_') || cat.startsWith('AUTHORITY_SLOT_') || cat.includes('BOOKING')
      ? 'SLOT'
      : cat.startsWith('FACILITY_')
        ? 'FACILITY'
        : cat.includes('PAYMENT') || cat.includes('RECEIPT')
          ? 'PAYMENT'
          : cat.includes('USER_STATUS') || cat === 'OFFICER_AUTH'
            ? 'USER'
            : 'SYSTEM');

  const actionMeta = AUDIT_ACTION_META[cat] ?? {
    label: cat.replace(/_/g, ' '),
    badgeClass: 'bg-surface-container text-secondary border border-outline-variant/40',
    dotClass: 'bg-secondary',
  };

  const entityMeta = getEntityDisplay(entityType);

  const metaBadges: AuditMetadataBadge[] = [];
  const blockType = details.block_type ?? details.block_status;
  if (blockType === 'BLOCKED_MAINTENANCE') {
    metaBadges.push({ label: 'Maintenance Block', tone: 'amber' });
  } else if (blockType === 'RESERVED_DEPARTMENT') {
    metaBadges.push({ label: 'Department Reserved', tone: 'primary' });
  }

  if (details.previous_status && details.new_status) {
    metaBadges.push({
      label: `${String(details.previous_status)} → ${String(details.new_status)}`,
      tone: details.new_status === 'ACTIVE' ? 'emerald' : 'amber',
    });
  }

  if (details.start_time && details.end_time) {
    metaBadges.push({
      label: `${String(details.start_time)}–${String(details.end_time)}${
        details.date ? ` (${String(details.date)})` : ''
      }`,
      tone: 'neutral',
    });
  }

  if (details.total_amount) {
    metaBadges.push({
      label: `₹${Number(details.total_amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      tone: 'emerald',
    });
  }

  if (details.public_rate !== undefined && details.govt_rate !== undefined) {
    metaBadges.push({
      label: `Public ₹${String(details.public_rate)} / Govt ₹${String(details.govt_rate)}`,
      tone: 'primary',
    });
  }

  const conciseReason =
    log.reason ||
    (typeof details.reason === 'string' && details.reason) ||
    (typeof details.internal_reason === 'string' && details.internal_reason) ||
    (typeof details.ban_reason === 'string' && details.ban_reason) ||
    (typeof details.remarks === 'string' && details.remarks) ||
    log.action_description;

  const targetLabel =
    log.target_entity_label ||
    String(details.facility_name ?? details.facility_code ?? log.target_ref_id ?? 'System Record');

  return {
    id: log.id,
    isoTimestamp: log.timestamp ?? dt.toISOString(),
    date: dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeIst: dt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    officerInitials: getInitials(officerName),
    officerAvatarClass: 'bg-primary-fixed text-primary',
    officerName,
    officerUsername,
    officerRole,
    ipAddress: log.ip_address,
    actionCategory: cat,
    categoryLabel: actionMeta.label,
    categoryBadgeClass: actionMeta.badgeClass,
    categoryDotClass: actionMeta.dotClass,
    entityType,
    entityLabel: entityMeta.label,
    entityBadgeClass: entityMeta.badgeClass,
    actionTitle: log.action_description,
    targetRefId: log.target_ref_id || log.id.slice(0, 12),
    targetLabel,
    reason: conciseReason,
    metaBadges,
  };
}
