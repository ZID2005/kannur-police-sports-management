import type {
  ApiPaymentPricingBreakdown,
  BackendCourtPartition,
  BackendPaymentMode,
  BackendSlotBookingStatus,
  FacilityOperationalStatus,
  PublicSlotOperationalStatus,
} from '@/api/client';

export interface BookingCourtOption {
  id: 'full' | 'half_a' | 'half_b';
  partition: BackendCourtPartition;
  label: string;
  shortName: string;
  turfBadge: string;
  icon: string;
  hourlyRate: number;
  standardHourlyRate: number;
  concessionDiscount: number;
  concessionPercent: number;
  gstRate: number;
}

export interface BookingVenue {
  id: string;
  code: string;
  name: string;
  category: string;
  badge: string;
  subtitle: string;
  priceLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  operationalStatus: FacilityOperationalStatus;
  rateBannerText: string;
  policyBadge: string;
  operatingHoursText: string;
  dailyUserHourCap: number;
  isPartitionable: boolean;
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
  startTime: string;
  endTime: string;
  session: 'morning' | 'evening';
  timeLabel: string;
  summaryTimeLabel: string;
  status: 'available' | 'booked' | 'blocked_maintenance' | 'reserved_department' | 'facility_unavailable';
  operationalStatus: PublicSlotOperationalStatus;
  operationalLabel: string | null;
  operationalReason: string | null;
  sessionTag: string;
  durationLabel: string;
}

export interface BookingRegistrant {
  name: string;
  registrantId: string;
  email: string;
  accountBadge: string;
  isGovt: boolean;
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
  supportBadge: string;
}

export interface BookingReceiptData {
  bookingId?: string;
  bookingReference: string;
  receiptNo?: string | null;
  status: BackendSlotBookingStatus;
  venueName: string;
  facilityCode?: string;
  courtPartition: BackendCourtPartition;
  courtModeLabel: string;
  dateLabel: string;
  timeSlotLabel: string;
  sessionNote?: string;
  memberName: string;
  memberUsername?: string;
  userCategory: 'PUBLIC' | 'GOVT_PERSONNEL';
  paymentMode?: BackendPaymentMode | null;
  paidAt?: string | null;
  pricingBreakdown: ApiPaymentPricingBreakdown;
}
