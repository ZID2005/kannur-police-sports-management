/**
 * Typed API client for the Kannur City Police Sports Facilities Management System.
 * Configured with `credentials: 'include'` for the HTTP-only `kcp_session` cookie.
 */

export type BackendUserRole = 'PUBLIC' | 'GOVT_PERSONNEL' | 'STAFF_ADMIN';
export type BackendAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type BackendGender = 'MALE' | 'FEMALE' | 'TRANSGENDER';
export type CoreFacilityCode =
  | 'SYNTHETIC_TRACK'
  | 'FOOTBALL_GROUND'
  | 'POLICE_TURF'
  | 'BADMINTON_COURT';
export type BackendFacilityCode = CoreFacilityCode | (string & {});
export type BackendCourtPartition = 'FULL' | 'HALF_A' | 'HALF_B';
export type BackendSessionWindow = 'MORNING' | 'EVENING' | 'BOTH';
export type BackendMembershipStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED_UNPAID'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUSPENDED';
export type BackendSlotBookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REFUNDED';
export type BackendPaymentMode = 'ONLINE_GATEWAY' | 'OFFICE_RECEIPT';
export type BackendPaymentReferenceType = 'MEMBERSHIP' | 'SLOT_BOOKING';
export type BackendPaymentStatus =
  | 'SETTLED'
  | 'PENDING_RECONCILIATION'
  | 'FAILED'
  | 'REFUNDED';
export type BackendAuditEntityType = 'FACILITY' | 'SLOT' | 'PAYMENT' | 'USER' | 'SYSTEM';

export type FacilityOperationalStatus = 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
export type ManagedSlotStatus = 'OPEN' | 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
export type EffectiveSlotStatus =
  | 'OPEN'
  | 'FULL'
  | 'BLOCKED_MAINTENANCE'
  | 'RESERVED_DEPARTMENT';
export type FacilityBookingMode = 'HOURLY_SLOTS' | 'MONTHLY_MEMBERSHIP_ONLY';

export interface MemberOnboardingFields {
  gender?: BackendGender | null;
  date_of_birth?: string | null;
  parent_name?: string | null;
  present_address?: string | null;
  city_locality?: string | null;
  pin_code?: string | null;
  permanent_address?: string | null;
  designation?: string | null;
  office_address?: string | null;
  track_purpose?: string | null;
  is_registered_sportsperson?: boolean;
  sport_discipline?: string | null;
  association_details?: string | null;
}

export interface AuthUser extends MemberOnboardingFields {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: BackendUserRole;
  account_status: BackendAccountStatus;
  profile_photo_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiFacilityTariff {
  id: string;
  user_category: 'PUBLIC' | 'GOVT_PERSONNEL';
  booking_type: 'MONTHLY_PASS' | 'FULL_COURT' | 'HALF_COURT';
  base_price: string;
  standard_base_price?: string;
  concession_discount?: string;
  concession_percent?: number;
  gst_percent: string;
  gst_amount: string;
  total_price: string;
  is_active: boolean;
}

export interface ApiFacility {
  id: string;
  code: BackendFacilityCode;
  name: string;
  category?: string | null;
  court_count?: number | null;
  court_unit_label?: string | null;
  operational_status?: FacilityOperationalStatus;
  max_capacity_per_slot?: number | null;
  description?: string | null;
  operating_start: string;
  operating_end: string;
  slot_duration_mins: number;
  daily_user_hour_cap: number;
  monthly_member_cap: number | null;
  is_partitionable: boolean;
  booking_mode: FacilityBookingMode;
  partition_rules: {
    is_partitionable: boolean;
    supported_partitions: BackendCourtPartition[];
    rule_summary: string;
  };
  user_category: 'PUBLIC' | 'GOVT_PERSONNEL';
  tariffs: ApiFacilityTariff[];
}

export type PublicSlotOperationalStatus =
  | 'OPEN'
  | 'BOOKED'
  | 'BLOCKED_MAINTENANCE'
  | 'RESERVED_DEPARTMENT'
  | 'FACILITY_MAINTENANCE'
  | 'FACILITY_CLOSED';

export interface ApiPublicSlotPartition {
  partition: BackendCourtPartition;
  status: 'AVAILABLE' | 'ALREADY_BOOKED';
  operational_status?: PublicSlotOperationalStatus;
  operational_label?: string | null;
  operational_reason?: string | null;
}

export interface ApiPublicSlot {
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'ALREADY_BOOKED';
  operational_status?: PublicSlotOperationalStatus;
  operational_label?: string | null;
  operational_reason?: string | null;
  partitions: Record<string, ApiPublicSlotPartition>;
}

export interface ApiPublicSlotsResponse {
  facility: {
    id: string;
    code: BackendFacilityCode;
    name: string;
    category?: string | null;
    court_count?: number | null;
    operational_status?: FacilityOperationalStatus;
    booking_mode?: FacilityBookingMode;
    description?: string | null;
    is_partitionable: boolean;
    operating_start: string;
    operating_end: string;
    slot_duration_mins: number;
    daily_user_hour_cap: number;
  };
  date: string;
  slots: ApiPublicSlot[];
}

export interface ApiAdminSlotPartition {
  partition: BackendCourtPartition;
  status: 'AVAILABLE' | 'BOOKED' | 'AUTHORITY_BLOCKED';
  block_id?: string;
  blocked_partition?: BackendCourtPartition;
  internal_reason?: string;
  created_by_officer?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
  booking_id?: string;
  booking_code?: string;
  booking_status?: BackendSlotBookingStatus;
  booked_partition?: BackendCourtPartition;
  user_full_name?: string | null;
  user?: {
    id: string;
    username: string;
    full_name: string;
    role: BackendUserRole;
  } | null;
}

export interface ApiAdminSlot {
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'BOOKED' | 'AUTHORITY_BLOCKED';
  internal_reason: string | null;
  booking_code: string | null;
  user_full_name: string | null;
  partitions: Record<string, ApiAdminSlotPartition>;
}

export interface ApiAdminSlotsResponse {
  facility: ApiPublicSlotsResponse['facility'];
  date: string;
  slots: ApiAdminSlot[];
}

export interface ApiManagedSlotBookingSummary {
  id: string;
  booking_code: string;
  member_name: string;
  member_username: string;
  court_partition: BackendCourtPartition;
  status: BackendSlotBookingStatus;
}

export interface ApiManagedSlot {
  id: string;
  facility_id: string;
  slot_date: string | null;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  active_bookings_count: number;
  status: EffectiveSlotStatus;
  base_status: ManagedSlotStatus;
  block_reason: string | null;
  block_id: string | null;
  court_partition: BackendCourtPartition;
  bookings: ApiManagedSlotBookingSummary[];
}

export interface ApiAdminFacilityPricing {
  unit: 'per_hour' | 'per_month';
  gst_percent: number;
  public_rate: number;
  govt_rate: number;
  half_court_public_rate: number | null;
  half_court_govt_rate: number | null;
}

export interface ApiAdminFacilityStats {
  total_slots: number;
  open_slots: number;
  full_slots: number;
  blocked_slots: number;
  active_bookings_count: number;
  occupied_slots: number;
  utilization_rate: number;
}

export interface ApiAdminFacility {
  id: string;
  code: string;
  name: string;
  category: string;
  court_count: number;
  court_unit_label: string;
  operational_status: FacilityOperationalStatus;
  max_capacity_per_slot: number;
  operating_start: string;
  operating_end: string;
  slot_duration_mins: number;
  daily_user_hour_cap: number;
  monthly_member_cap: number | null;
  is_partitionable: boolean;
  booking_mode: FacilityBookingMode;
  description: string;
  pricing: ApiAdminFacilityPricing;
  stats: ApiAdminFacilityStats;
  slots: ApiManagedSlot[];
}

export interface ApiAdminFacilitiesResponse {
  date: string;
  summary: {
    total_facilities: number;
    active_facilities: number;
    maintenance_facilities: number;
    closed_facilities: number;
    total_courts: number;
    active_courts: number;
    total_slots_today: number;
    booked_or_blocked_slots_today: number;
    slot_utilization_rate: number;
  };
  facilities: ApiAdminFacility[];
}

export interface CreateFacilityPayload {
  name: string;
  code?: string;
  category: string;
  court_count: number;
  court_unit_label?: string;
  operational_status?: FacilityOperationalStatus;
  max_capacity_per_slot: number;
  operating_start: string;
  operating_end: string;
  slot_duration_mins?: number;
  daily_user_hour_cap?: number;
  monthly_member_cap?: number | null;
  is_partitionable?: boolean;
  booking_mode?: FacilityBookingMode;
  public_rate: number;
  govt_rate: number;
  half_court_public_rate?: number | null;
  half_court_govt_rate?: number | null;
  description?: string;
}

export type UpdateFacilityPayload = Partial<Omit<CreateFacilityPayload, 'code'>>;

export interface CreateSlotPayload {
  start_time: string;
  end_time: string;
  max_capacity?: number;
  slot_date?: string | null;
  status?: ManagedSlotStatus;
  block_reason?: string | null;
  court_partition?: BackendCourtPartition;
}

export interface UpdateSlotPayload {
  start_time?: string;
  end_time?: string;
  max_capacity?: number;
  status?: ManagedSlotStatus;
  block_reason?: string | null;
  date?: string;
}

export interface ToggleSlotBlockPayload {
  blocked: boolean;
  date?: string;
  block_status?: 'BLOCKED_MAINTENANCE' | 'RESERVED_DEPARTMENT';
  reason?: string;
  force_override?: boolean;
}

export interface ApiCalculatedTariff {
  monthly_base_price: string;
  duration_months: number;
  base_amount: string;
  gst_percent: string;
  gst_amount: string;
  total_amount: string;
}

export interface ApiMembership {
  id: string;
  pass_code: string;
  user_id: string;
  facility_id: string;
  duration_months: number;
  session_window: BackendSessionWindow;
  start_date: string | null;
  end_date: string | null;
  status: BackendMembershipStatus;
  govt_service_proof_url: string | null;
  track_purpose?: string | null;
  is_registered_sportsperson?: boolean;
  sport_discipline?: string | null;
  association_details?: string | null;
  declaration_accepted?: boolean;
  reviewed_by_officer_id: string | null;
  officer_remarks: string | null;
  created_at: string;
  updated_at: string;
  payment_locked?: boolean;
  payment_unlocked?: boolean;
  user_category?: 'PUBLIC' | 'GOVT_PERSONNEL';
  calculated_tariff?: ApiCalculatedTariff;
  pricing_breakdown?: ApiPaymentPricingBreakdown;
  status_timeline?: Array<{
    stage: string;
    completed: boolean;
    timestamp?: string;
    status?: BackendMembershipStatus;
    officer_remarks?: string | null;
    payment_locked?: boolean;
    description: string;
  }>;
  facility?: {
    id: string;
    code: BackendFacilityCode;
    name: string;
    monthly_member_cap?: number | null;
  };
  user?: {
    id: string;
    username: string;
    full_name: string;
    email?: string | null;
    role: BackendUserRole;
    account_status?: BackendAccountStatus;
    profile_photo_url?: string | null;
    gender?: BackendGender | null;
    date_of_birth?: string | null;
    parent_name?: string | null;
    present_address?: string | null;
    city_locality?: string | null;
    pin_code?: string | null;
    permanent_address?: string | null;
    designation?: string | null;
    office_address?: string | null;
    track_purpose?: string | null;
    is_registered_sportsperson?: boolean;
    sport_discipline?: string | null;
    association_details?: string | null;
  };
  reviewed_by_officer?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

export interface ApiBookingReceiptMeta {
  receipt_no: string;
  payment_mode: BackendPaymentMode;
  status: BackendPaymentStatus;
  paid_at: string;
}

export interface ApiSlotBooking {
  id: string;
  booking_code: string;
  user_id: string;
  facility_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  court_partition: BackendCourtPartition;
  total_amount: string;
  status: BackendSlotBookingStatus;
  created_at: string;
  updated_at?: string;
  booking_date_formatted: string;
  start_time_formatted: string;
  end_time_formatted: string;
  can_cancel?: boolean;
  user_category?: 'PUBLIC' | 'GOVT_PERSONNEL';
  pricing_breakdown?: ApiPaymentPricingBreakdown;
  receipt?: ApiBookingReceiptMeta | null;
  fee_breakdown?: {
    user_category: string;
    booking_type: string;
    hours: number;
    base_fee?: string;
    concession_discount?: string;
    concession_percent?: number;
    taxable_subtotal?: string;
    base_amount: string;
    gst_percent: string;
    gst_amount: string;
    total_amount: string;
  };
  facility?: {
    id: string;
    code: BackendFacilityCode;
    name: string;
    category?: string | null;
  };
}

export interface ApiPaymentPricingBreakdown {
  base_fee: string;
  concession_discount: string;
  concession_percent: number;
  taxable_subtotal: string;
  gst_rate: number;
  gst_amount: string;
  final_total_paid: string;
}

export interface ApiPaymentRecord {
  id: string;
  receipt_no: string;
  reference_type: BackendPaymentReferenceType;
  reference_id: string;
  user_id: string;
  user_category?: 'PUBLIC' | 'GOVT_PERSONNEL';
  payment_mode: BackendPaymentMode;
  base_amount: string;
  gst_amount: string;
  total_amount: string;
  status: BackendPaymentStatus;
  recorded_by_officer_id: string | null;
  created_at: string;
  pass_or_booking_code: string | null;
  facility_code: string | null;
  facility_name?: string | null;
  pricing_breakdown?: ApiPaymentPricingBreakdown;
  user?: {
    id: string;
    username: string;
    full_name: string;
    email: string | null;
    role: BackendUserRole;
  } | null;
  recorded_by_officer?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
  reference_details?: Record<string, unknown> | null;
}

export interface ApiSettlementReceipt {
  receipt_no: string;
  reference_type: BackendPaymentReferenceType;
  reference_id: string;
  booking_or_pass_code: string;
  facility_code: BackendFacilityCode;
  facility_name: string;
  status: string;
  user_category: 'PUBLIC' | 'GOVT_PERSONNEL';
  payment_mode: BackendPaymentMode;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  court_partition?: BackendCourtPartition;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  session_window?: BackendSessionWindow;
  pricing_breakdown: ApiPaymentPricingBreakdown;
  issued_at: string;
}

export interface ApiSettlePaymentResponse {
  payment: ApiPaymentRecord;
  receipt?: ApiSettlementReceipt;
  membership?: ApiMembership & {
    start_date_formatted?: string;
    end_date_formatted?: string;
  };
  slot_booking?: ApiSlotBooking;
}

export interface ApiOfficeReceiptResponse {
  payment: ApiPaymentRecord;
  receipt: ApiSettlementReceipt;
  membership?: ApiMembership & {
    start_date_formatted?: string;
    end_date_formatted?: string;
  };
  slot_booking?: ApiSlotBooking;
}

export interface ApiAdminPaymentsSummary {
  total_transactions: number;
  total_records: number;
  completed_transactions_count: number;
  pending_transactions_count: number;
  failed_or_refunded_count: number;
  pending_amount: string;
  total_gross_base_fee: string;
  total_concessions_applied: string;
  concession_transactions_count: number;
  total_base_amount: string;
  total_taxable_subtotal: string;
  total_gst_amount: string;
  gst_collected: string;
  total_revenue: string;
  online_gateway_revenue: string;
  office_receipt_revenue: string;
  membership_revenue: string;
  slot_booking_revenue: string;
  public_revenue: string;
  govt_revenue: string;
  monthly_revenue: string;
}

export interface ApiAdminPaymentsResponse {
  summary: ApiAdminPaymentsSummary;
  facilities: Array<{ code: string; name: string }>;
  payments: ApiPaymentRecord[];
}

export interface ApiAdminBookingItem {
  id: string;
  booking_code: string;
  member_name: string;
  member_username: string;
  member_role: BackendUserRole;
  facility_code: string;
  facility_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  court_partition: BackendCourtPartition;
  total_amount: string;
  status: BackendSlotBookingStatus;
  created_at?: string;
}

export interface ApiAdminMemberSignup {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: BackendUserRole;
  account_status: BackendAccountStatus;
  created_at: string;
}

export interface ApiAdminMemberDirectoryItem
  extends ApiAdminMemberSignup,
    MemberOnboardingFields {
  confirmed_bookings_count: number;
  active_pass_code: string | null;
  active_pass_plan: string | null;
}

export interface ApiAdminDashboardOverview {
  date: string;
  kpis: {
    total_registered_members: number;
    active_members_count: number;
    public_members_count: number;
    govt_members_count: number;
    todays_confirmed_bookings: number;
    todays_total_bookings: number;
    active_facilities_count: number;
    total_facilities_count?: number;
    maintenance_facilities_count?: number;
    closed_facilities_count?: number;
    active_courts_count?: number;
    total_courts_count?: number;
    bookable_courts_count: number;
    slot_utilization_rate: number;
    todays_booked_slots_count: number;
    todays_total_slots_count: number;
    monthly_revenue: string;
    facility_bookings_breakdown: Array<{
      facility_code: string;
      facility_name: string;
      operational_status?: FacilityOperationalStatus;
      confirmed_count: number;
    }>;
  };
  todays_bookings: ApiAdminBookingItem[];
  recent_member_signups: ApiAdminMemberSignup[];
}

export interface ApiAuditLog {
  id: string;
  officer_id: string;
  officer_username?: string;
  officer_role?: string;
  action_category: string;
  action_description: string;
  target_ref_id: string | null;
  target_entity?: BackendAuditEntityType;
  target_entity_label?: string;
  reason?: string;
  details: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
  timestamp?: string;
  officer?: {
    id: string;
    username: string;
    full_name: string;
    role: BackendUserRole;
  } | null;
}

export interface ApiAuditLogsSummary {
  total_events: number;
  filtered_events: number;
  facility_actions_count: number;
  slot_actions_count: number;
  payment_actions_count: number;
  account_actions_count: number;
  officers: Array<{
    id: string;
    username: string;
    full_name: string;
    role: string;
  }>;
}

export interface ApiAuditLogsResponse {
  summary: ApiAuditLogsSummary;
  pagination: {
    page: number;
    limit: number;
    total_records: number;
    total_pages: number;
  };
  audit_logs: ApiAuditLog[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode?: string;
  public readonly details?: unknown;

  constructor(message: string, status: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

interface BackendResponseEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  details?: unknown;
  errors?: Array<{ field?: string; message?: string }>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

function buildQueryString(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(text || `Request failed with HTTP ${response.status}`, response.status);
    }
    return (await response.text()) as unknown as T;
  }

  const payload = (await response.json()) as BackendResponseEnvelope<T>;

  if (!response.ok || payload.success === false) {
    const validationMsg =
      Array.isArray(payload.errors) && payload.errors.length > 0
        ? payload.errors.map((e) => e.message).filter(Boolean).join('; ')
        : undefined;
    throw new ApiError(
      validationMsg || payload.message || `Request failed with HTTP ${response.status}`,
      response.status,
      payload.errorCode,
      payload.details
    );
  }

  return (payload.data !== undefined ? payload.data : (payload as unknown)) as T;
}

export async function downloadCsvFile(path: string, fallbackFilename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `CSV export failed with HTTP ${response.status}`;
    try {
      const json = (await response.json()) as { message?: string; errorCode?: string };
      if (json.message) message = json.message;
    } catch {
      // Ignore JSON parse fallback
    }
    throw new ApiError(message, response.status);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

export const authApi = {
  me: () => apiRequest<{ user: AuthUser }>('/api/auth/me', { method: 'GET' }),
  updateProfile: (
    payload: {
      full_name?: string;
      email?: string | null;
    } & MemberOnboardingFields
  ) =>
    apiRequest<{ user: AuthUser }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  login: (payload: { username: string; password: string }) =>
    apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (
    payload: {
      username?: string;
      password: string;
      full_name: string;
      email?: string | null;
      role?: 'PUBLIC' | 'GOVT_PERSONNEL';
      profile_photo_url?: string | null;
    } & MemberOnboardingFields
  ) =>
    apiRequest<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest<{ success: boolean; message: string }>('/api/auth/logout', { method: 'POST' }),
};

export const facilitiesApi = {
  list: () => apiRequest<{ facilities: ApiFacility[] }>('/api/facilities', { method: 'GET' }),
  getPublicSlots: (code: BackendFacilityCode, date: string) =>
    apiRequest<ApiPublicSlotsResponse>(
      `/api/facilities/${encodeURIComponent(code)}/slots${buildQueryString({ date })}`,
      { method: 'GET' }
    ),
};

export const membershipsApi = {
  getMy: () => apiRequest<{ memberships: ApiMembership[] }>('/api/memberships/my', { method: 'GET' }),
  apply: (
    payload: {
      facility_code?: 'SYNTHETIC_TRACK';
      duration_months: number;
      session_window: BackendSessionWindow;
      govt_service_proof_url?: string | null;
      instant_checkout?: boolean;
      declaration_accepted?: boolean;
    } & MemberOnboardingFields
  ) =>
    apiRequest<{ membership: ApiMembership }>('/api/memberships/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePeriod: (
    id: string,
    payload: {
      duration_months?: number;
      session_window?: BackendSessionWindow;
    }
  ) =>
    apiRequest<{ membership: ApiMembership }>(
      `/api/memberships/${encodeURIComponent(id)}/period`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),
};

export const bookingsApi = {
  getMy: () => apiRequest<{ bookings: ApiSlotBooking[] }>('/api/bookings/my', { method: 'GET' }),
  reserve: (payload: {
    facility_code: BackendFacilityCode;
    booking_date: string;
    start_time: string;
    end_time?: string;
    court_partition?: BackendCourtPartition;
  }) =>
    apiRequest<{ booking: ApiSlotBooking }>('/api/bookings/reserve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancel: (id: string, reason?: string) =>
    apiRequest<{ booking: ApiSlotBooking }>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
};

export const paymentsApi = {
  settle: (payload: {
    reference_type: BackendPaymentReferenceType;
    reference_id?: string;
    pass_or_booking_code?: string;
    base_amount?: number;
    gst_amount?: number;
    total_amount?: number;
  }) =>
    apiRequest<ApiSettlePaymentResponse>('/api/payments/settle', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMy: () => apiRequest<{ payments: ApiPaymentRecord[] }>('/api/payments/my', { method: 'GET' }),
};

export const adminApi = {
  listFacilities: (params?: {
    date?: string;
    status?: FacilityOperationalStatus;
    search?: string;
  }) =>
    apiRequest<ApiAdminFacilitiesResponse>(
      `/api/admin/facilities${buildQueryString(params)}`,
      { method: 'GET' }
    ),

  getFacilitySchedule: (facilityId: string, date?: string) =>
    apiRequest<{ date: string; facility: ApiAdminFacility }>(
      `/api/admin/facilities/${encodeURIComponent(facilityId)}/schedule${buildQueryString({ date })}`,
      { method: 'GET' }
    ),

  createFacility: (payload: CreateFacilityPayload) =>
    apiRequest<{ facility: ApiAdminFacility }>('/api/admin/facilities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateFacility: (id: string, payload: UpdateFacilityPayload) =>
    apiRequest<{ facility: ApiAdminFacility }>(
      `/api/admin/facilities/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  updateFacilityStatus: (
    id: string,
    payload: { operational_status: FacilityOperationalStatus; reason?: string }
  ) =>
    apiRequest<{ facility: ApiAdminFacility }>(
      `/api/admin/facilities/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  createFacilitySlot: (facilityId: string, payload: CreateSlotPayload) =>
    apiRequest<{ slot: ApiManagedSlot }>(
      `/api/admin/facilities/${encodeURIComponent(facilityId)}/slots`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateFacilitySlot: (facilityId: string, slotId: string, payload: UpdateSlotPayload) =>
    apiRequest<{ slot: ApiManagedSlot }>(
      `/api/admin/facilities/${encodeURIComponent(facilityId)}/slots/${encodeURIComponent(slotId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  toggleFacilitySlotBlock: (
    facilityId: string,
    slotId: string,
    payload: ToggleSlotBlockPayload
  ) =>
    apiRequest<{ slot: ApiManagedSlot; authority_block: Record<string, unknown> | null }>(
      `/api/admin/facilities/${encodeURIComponent(facilityId)}/slots/${encodeURIComponent(slotId)}/block`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  deleteFacilitySlot: (facilityId: string, slotId: string, date?: string) =>
    apiRequest<{ deleted_slot_id: string; facility_id: string }>(
      `/api/admin/facilities/${encodeURIComponent(facilityId)}/slots/${encodeURIComponent(slotId)}${buildQueryString({ date })}`,
      {
        method: 'DELETE',
      }
    ),

  listMemberships: (params?: {
    status?: string;
    role?: string;
    session_window?: string;
    search?: string;
  }) =>
    apiRequest<{
      capacity: {
        active_and_approved_count: number;
        monthly_member_cap: number;
        remaining_slots: number;
      };
      memberships: ApiMembership[];
    }>(`/api/admin/memberships${buildQueryString(params)}`, { method: 'GET' }),

  getMembershipById: (id: string) =>
    apiRequest<{ membership: ApiMembership }>(`/api/admin/memberships/${encodeURIComponent(id)}`, {
      method: 'GET',
    }),

  reviewMembership: (
    id: string,
    payload: {
      action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION' | 'SUSPEND';
      officer_remarks: string;
    }
  ) =>
    apiRequest<{ membership: ApiMembership }>(
      `/api/admin/memberships/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getFacilitySlots: (code: BackendFacilityCode, date: string) =>
    apiRequest<ApiAdminSlotsResponse>(
      `/api/admin/facilities/${encodeURIComponent(code)}/slots${buildQueryString({ date })}`,
      { method: 'GET' }
    ),

  createSlotBlock: (payload: {
    facility_code: BackendFacilityCode;
    block_date: string;
    start_time: string;
    end_time?: string;
    court_partition?: BackendCourtPartition;
    internal_reason: string;
    force_override?: boolean;
  }) =>
    apiRequest<{
      authority_block: {
        id: string;
        facility_id: string;
        block_date_formatted: string;
        start_time_formatted: string;
        end_time_formatted: string;
        court_partition: BackendCourtPartition;
        internal_reason: string;
        overridden_bookings: string[];
      };
    }>('/api/admin/slots/block', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteSlotBlock: (id: string) =>
    apiRequest<{
      authority_block: {
        id: string;
        is_active: boolean;
      };
    }>(`/api/admin/slots/block/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  updateUserStatus: (
    id: string,
    payload: { account_status: BackendAccountStatus; ban_reason: string }
  ) =>
    apiRequest<{ user: AuthUser }>(`/api/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  listPayments: (params?: {
    from_date?: string;
    to_date?: string;
    facility_code?: string;
    status?: string;
    user_category?: 'PUBLIC' | 'GOVT_PERSONNEL';
    payment_mode?: BackendPaymentMode;
    reference_type?: BackendPaymentReferenceType;
    search?: string;
  }) =>
    apiRequest<ApiAdminPaymentsResponse>(
      `/api/admin/payments${buildQueryString({ ...params, format: 'json' })}`,
      { method: 'GET' }
    ),

  downloadPaymentsCsv: (params?: {
    from_date?: string;
    to_date?: string;
    facility_code?: string;
    status?: string;
    user_category?: 'PUBLIC' | 'GOVT_PERSONNEL';
    payment_mode?: BackendPaymentMode;
    reference_type?: BackendPaymentReferenceType;
    search?: string;
  }) =>
    downloadCsvFile(
      `/api/admin/payments${buildQueryString({ ...params, format: 'csv' })}`,
      'kcp-payments-ledger.csv'
    ),

  recordOfficeReceipt: (payload: {
    reference_type: BackendPaymentReferenceType;
    reference_id?: string;
    pass_or_booking_code?: string;
    base_amount?: number;
    gst_amount?: number;
    total_amount?: number;
    treasury_challan_no?: string;
    remarks?: string;
  }) =>
    apiRequest<ApiOfficeReceiptResponse>('/api/admin/payments/office-receipt', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  downloadFinancialReportCsv: (params?: Record<string, string | undefined>) =>
    downloadCsvFile(
      `/api/admin/reports/financial${buildQueryString({ ...params, format: 'csv' })}`,
      'kcp-financial-report.csv'
    ),

  listAuditLogs: (params?: {
    action_category?: string;
    entity_type?: BackendAuditEntityType;
    officer_id?: string;
    target_ref_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    apiRequest<ApiAuditLogsResponse>(
      `/api/admin/audit-logs${buildQueryString({ ...params, format: 'json' })}`,
      { method: 'GET' }
    ),

  downloadAuditLogsCsv: (params?: {
    action_category?: string;
    entity_type?: BackendAuditEntityType;
    officer_id?: string;
    target_ref_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
  }) =>
    downloadCsvFile(
      `/api/admin/audit-logs${buildQueryString({ ...params, format: 'csv' })}`,
      'kcp-audit-logs.csv'
    ),

  getDashboardOverview: () =>
    apiRequest<ApiAdminDashboardOverview>('/api/admin/dashboard-overview', {
      method: 'GET',
    }),

  listBookings: (params?: {
    date?: string;
    facility_code?: string;
    status?: string;
    search?: string;
  }) =>
    apiRequest<{
      summary: {
        total_bookings: number;
        confirmed_count: number;
        pending_payment_count: number;
        cancelled_count: number;
        todays_confirmed_count: number;
      };
      bookings: ApiAdminBookingItem[];
    }>(`/api/admin/bookings${buildQueryString(params)}`, { method: 'GET' }),

  listMembers: (params?: {
    role?: string;
    account_status?: string;
    gender?: BackendGender;
    search?: string;
  }) =>
    apiRequest<{
      summary: {
        total_members: number;
        active_count: number;
        public_count: number;
        govt_count: number;
        active_track_passes: number;
      };
      members: ApiAdminMemberDirectoryItem[];
    }>(`/api/admin/members${buildQueryString(params)}`, { method: 'GET' }),
};
