export interface BookingCourtOption {
  id: 'full' | 'half_a' | 'half_b';
  label: string;
  shortName: string;
  turfBadge: string;
  icon: string;
  hourlyRate: number;
}

export interface BookingVenue {
  id: string;
  name: string;
  badge: string;
  subtitle: string;
  priceLabel: string;
  imageUrl: string;
  imageAlt: string;
  rateBannerText: string;
  complianceBadge: string;
  operatingHoursText: string;
  courtOptions: BookingCourtOption[];
}

export interface BookingDateOption {
  id: string;
  dayShort: string;
  dateNum: string;
  fullDateLabel: string;
  ticketDateLabel: string;
  slotsCountLabel: string;
  isPast?: boolean;
}

export interface BookingTimeSlot {
  id: string;
  session: 'morning' | 'evening';
  timeLabel: string;
  summaryTimeLabel: string;
  status: 'available' | 'booked' | 'maintenance';
  sessionTag: string;
  durationLabel: string;
}

export interface BookingRegistrant {
  name: string;
  registrantId: string;
  email: string;
  accountBadge: string;
}

export interface BookingPortalMeta {
  portalBadge: string;
  title: string;
  statusPillText: string;
  calendarMonthLabel: string;
  morningTitle: string;
  morningRange: string;
  morningBadge: string;
  eveningTitle: string;
  eveningRange: string;
  eveningBadge: string;
  slotPolicyNotice: string;
  gstRate: number;
  floodlightChargeLabel: string;
  cancellationNotice: string;
  supportDeskTitle: string;
  supportDeskSubtitle: string;
  supportGateBadge: string;
}

export interface BookingTicketGuideline {
  id: string;
  icon: string;
  textPrefix: string;
  highlightText?: string;
  textSuffix: string;
}

export interface BookingTicketData {
  departmentBadge: string;
  clearanceStage: string;
  headline: string;
  syncStatusBadge: string;
  subheadline: string;
  organizationName: string;
  passTitle: string;
  passTypeBadge: string;
  bookingReference: string;
  approvalBadge: string;
  venueName: string;
  venueSubtitle: string;
  venueShortBadge: string;
  venueIcon: string;
  dateLabel: string;
  timeSlotLabel: string;
  sessionNote: string;
  gateName: string;
  gateLaneInfo: string;
  gateQuadrant: string;
  attendeeName: string;
  attendeeRole: string;
  attendeeAvatarUrl: string;
  attendeeAvatarAlt: string;
  amountPaid: string;
  paymentStatusNote: string;
  upiReference: string;
  qrSectionLabel: string;
  qrNotice: string;
  qrTokenHash: string;
  qrSeed: string;
  guidelinesTitle: string;
  guidelines: BookingTicketGuideline[];
  helplineTitle: string;
  helplineSubtitle: string;
  helplineBadge: string;
}

export interface BookingSelectionState {
  venueName: string;
  courtShortName: string;
  turfBadge: string;
  dateLabel: string;
  timeSlotLabel: string;
  sessionNote: string;
  totalAmountFormatted: string;
  bookingReference?: string;
  receiptNo?: string;
  qrTokenHash?: string;
  attendeeName?: string;
  attendeeRole?: string;
  paymentStatusNote?: string;
  gateName?: string;
}

export interface PassDetailItem {
  id: string;
  label: string;
  value: string;
  subtext: string;
  highlightSubtext?: boolean;
}

export interface PassBiometricStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface PassChallanRow {
  label: string;
  value: string;
  isMono?: boolean;
}

export interface PassData {
  passReference: string;
  vaultRecordText: string;
  syncBadgeText: string;
  authTag: string;
  statusTag: string;
  confirmationTitle: string;
  confirmationDescription: string;
  councilName: string;
  passTitle: string;
  verifiedBadgeText: string;
  memberName: string;
  departmentalCode: string;
  designation: string;
  memberId: string;
  photoUrl: string;
  photoAlt: string;
  liveStatusText: string;
  details: PassDetailItem[];
  qrTitle: string;
  qrDescription: string;
  nfcBadgeText: string;
  barcodeCaption: string;
  qrSeed: string;
  legalDisclaimer: string;
  nodeId: string;
  venuePhotoUrl: string;
  venuePhotoAlt: string;
  venueCardTitle: string;
  venueCardAddress: string;
  receiptAmount: string;
  accessGuideTitle: string;
  accessGuideSubtitle: string;
  biometricSteps: PassBiometricStep[];
  dailyHoursText: string;
  trackRulesText: string;
  challanTotal: string;
  challanRows: PassChallanRow[];
  dutyDeskLabel: string;
  dutyDeskLocation: string;
}
