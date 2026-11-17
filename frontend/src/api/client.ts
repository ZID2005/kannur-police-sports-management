/**
 * Typed API client for the Kannur City Police Sports Facilities Management System.
 * Configured with `credentials: 'include'` for the HTTP-only `kcp_session` cookie.
 */

export type BackendUserRole = 'PUBLIC' | 'GOVT_PERSONNEL' | 'STAFF_ADMIN' | 'GATE_OFFICER';
export type BackendAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type BackendFacilityCode =
  | 'SYNTHETIC_TRACK'
  | 'FOOTBALL_GROUND'
  | 'POLICE_TURF'
  | 'BADMINTON_COURT';
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
export type BackendPaymentStatus = 'PENDING' | 'SETTLED' | 'FAILED' | 'REFUNDED';
export type BackendVerificationType = 'QR_ONLY' | 'QR_AND_BIOMETRIC' | 'MANUAL_OVERRIDE';

export interface AuthUser {
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
  gst_percent: string;
  gst_amount: string;
  total_price: string;
  is_active: boolean;
}

export interface ApiFacility {
  id: string;
  code: BackendFacilityCode;
  name: string;
  operating_start: string;
  operating_end: string;
  slot_duration_mins: number;
  daily_user_hour_cap: number;
  monthly_member_cap: number | null;
  is_partitionable: boolean;
  booking_mode: 'MONTHLY_MEMBERSHIP_ONLY' | 'HOURLY_SLOTS';
  partition_rules: {
    is_partitionable: boolean;
    supported_partitions: BackendCourtPartition[];
    rule_summary: string;
  };
  user_category: 'PUBLIC' | 'GOVT_PERSONNEL';
  tariffs: ApiFacilityTariff[];
}

export interface ApiPublicSlotPartition {
  partition: BackendCourtPartition;
  status: 'AVAILABLE' | 'ALREADY_BOOKED';
}

export interface ApiPublicSlot {
  start_time: string;
  end_time: string;
  status: 'AVAILABLE' | 'ALREADY_BOOKED';
  partitions: Record<string, ApiPublicSlotPartition>;
}

export interface ApiPublicSlotsResponse {
  facility: {
    id: string;
    code: BackendFacilityCode;
    name: string;
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
  reviewed_by_officer_id: string | null;
  officer_remarks: string | null;
  qr_token_hash: string | null;
  created_at: string;
  updated_at: string;
  payment_locked?: boolean;
  payment_unlocked?: boolean;
  calculated_tariff?: ApiCalculatedTariff;
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
  };
  reviewed_by_officer?: {
    id: string;
    username: string;
    full_name: string;
  } | null;
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
  qr_token_hash: string | null;
  created_at: string;
  updated_at: string;
  booking_date_formatted: string;
  start_time_formatted: string;
  end_time_formatted: string;
  can_cancel?: boolean;
  fee_breakdown?: {
    user_category: string;
    booking_type: string;
    hours: number;
    base_amount: string;
    gst_percent: string;
    gst_amount: string;
    total_amount: string;
  };
  facility?: {
    id: string;
    code: BackendFacilityCode;
    name: string;
  };
}

export interface ApiPaymentRecord {
  id: string;
  receipt_no: string;
  reference_type: BackendPaymentReferenceType;
  reference_id: string;
  user_id: string;
  payment_mode: BackendPaymentMode;
  base_amount: string;
  gst_amount: string;
  total_amount: string;
  status: BackendPaymentStatus;
  recorded_by_officer_id: string | null;
  created_at: string;
  pass_or_booking_code: string | null;
  facility_code: BackendFacilityCode | null;
  facility_name?: string | null;
  qr_token_hash: string | null;
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

export interface ApiSettlePaymentResponse {
  payment: ApiPaymentRecord;
  qr_pass: {
    reference_type: BackendPaymentReferenceType;
    reference_id: string;
    pass_or_booking_code: string;
    facility_code: BackendFacilityCode;
    status: string;
    start_date?: string;
    end_date?: string;
    session_window?: BackendSessionWindow;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    court_partition?: BackendCourtPartition;
    qr_token: string;
    qr_token_hash: string;
  };
  membership?: ApiMembership & {
    start_date_formatted?: string;
    end_date_formatted?: string;
  };
  slot_booking?: ApiSlotBooking;
}

export interface ApiAdminPaymentsSummary {
  total_transactions: number;
  total_base_amount: string;
  total_gst_amount: string;
  total_revenue: string;
  online_gateway_revenue: string;
  office_receipt_revenue: string;
  membership_revenue: string;
  slot_booking_revenue: string;
}

export interface ApiGateLog {
  id: string;
  facility_id: string;
  gate_name: string;
  user_id: string | null;
  pass_or_booking_code: string;
  verification_type: BackendVerificationType;
  stage1_qr_passed: boolean;
  stage2_biometric_passed: boolean;
  access_granted: boolean;
  failure_or_override_reason: string | null;
  verified_by_officer_id: string;
  scanned_at: string;
  facility?: {
    id: string;
    code: BackendFacilityCode;
    name: string;
  };
  user?: {
    id: string;
    username: string;
    full_name: string;
    role: BackendUserRole;
  } | null;
  verified_by_officer?: {
    id: string;
    username: string;
    full_name: string;
    role?: BackendUserRole;
  } | null;
}

export interface ApiGateSyncCacheEntry {
  reference_type: BackendPaymentReferenceType;
  pass_or_booking_code: string;
  qr_token_hash: string | null;
  facility_code: BackendFacilityCode;
  user_id: string;
  user_full_name: string;
  user_role: BackendUserRole;
  profile_photo_url: string | null;
  session_window: BackendSessionWindow | null;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_until: string;
  court_partition?: BackendCourtPartition;
  requires_biometric: boolean;
}

export interface ApiGateSyncCacheManifest {
  manifest_version: string;
  generated_at: string;
  target_date: string;
  facility_filter: string;
  total_entries: number;
  active_memberships_count: number;
  confirmed_bookings_count: number;
  entries: ApiGateSyncCacheEntry[];
  manifest_signature: string;
}

export interface ApiGateVerifyResponse {
  access_granted: boolean;
  verification_type: BackendVerificationType;
  stage1_qr_passed: boolean;
  stage2_biometric_passed: boolean;
  failure_or_override_reason: string | null;
  holder: {
    reference_type: BackendPaymentReferenceType;
    pass_or_booking_code: string;
    user_id: string;
    full_name: string | null;
    username: string | null;
    role: BackendUserRole | null;
    profile_photo_url: string | null;
    session_window?: BackendSessionWindow;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    court_partition?: BackendCourtPartition;
    status: string;
  } | null;
  gate_log: ApiGateLog;
}

export interface ApiAuditLog {
  id: string;
  officer_id: string;
  action_category: string;
  action_description: string;
  target_ref_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string;
  created_at: string;
  officer?: {
    id: string;
    username: string;
    full_name: string;
    role: BackendUserRole;
  } | null;
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

function buildQueryString(params?: Record<string, string | number | boolean | undefined | null>): string {
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
  login: (payload: { username: string; password: string }) =>
    apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: {
    username: string;
    password: string;
    full_name: string;
    email?: string | null;
    role?: 'PUBLIC' | 'GOVT_PERSONNEL';
    profile_photo_url?: string | null;
  }) =>
    apiRequest<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => apiRequest<{ success: boolean; message: string }>('/api/auth/logout', { method: 'POST' }),
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
  apply: (payload: {
    facility_code?: 'SYNTHETIC_TRACK';
    duration_months: number;
    session_window: BackendSessionWindow;
    govt_service_proof_url?: string | null;
  }) =>
    apiRequest<{ membership: ApiMembership }>('/api/memberships/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
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

  listPayments: (params?: Record<string, string | undefined>) =>
    apiRequest<{
      summary: ApiAdminPaymentsSummary;
      payments: ApiPaymentRecord[];
    }>(`/api/admin/payments${buildQueryString(params)}`, { method: 'GET' }),

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
    apiRequest<ApiSettlePaymentResponse>('/api/admin/payments/office-receipt', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  downloadFinancialReportCsv: (params?: Record<string, string | undefined>) =>
    downloadCsvFile(
      `/api/admin/reports/financial${buildQueryString({ ...params, format: 'csv' })}`,
      'kcp-financial-report.csv'
    ),

  listGateLogs: (params?: Record<string, string | number | undefined>) =>
    apiRequest<{
      summary: {
        total_scans: number;
        granted_count: number;
        rejected_count: number;
        manual_override_count: number;
        biometric_verified_count: number;
      };
      pagination: {
        page: number;
        limit: number;
        total_records: number;
        total_pages: number;
      };
      gate_logs: ApiGateLog[];
    }>(`/api/admin/gate-logs${buildQueryString(params)}`, { method: 'GET' }),

  listAuditLogs: (params?: Record<string, string | number | undefined>) =>
    apiRequest<{
      pagination: {
        page: number;
        limit: number;
        total_records: number;
        total_pages: number;
      };
      audit_logs: ApiAuditLog[];
    }>(`/api/admin/audit-logs${buildQueryString({ ...params, format: 'json' })}`, {
      method: 'GET',
    }),

  downloadAuditLogsCsv: (params?: Record<string, string | undefined>) =>
    downloadCsvFile(
      `/api/admin/audit-logs${buildQueryString({ ...params, format: 'csv' })}`,
      'kcp-audit-logs.csv'
    ),
};

export const gateApi = {
  syncCache: (params?: { facility?: BackendFacilityCode; date?: string }) =>
    apiRequest<ApiGateSyncCacheManifest>(
      `/api/gate/sync-cache${buildQueryString(params)}`,
      { method: 'GET' }
    ),

  verify: (payload: {
    facility_code: BackendFacilityCode;
    gate_name?: string;
    qr_token?: string;
    pass_or_booking_code?: string;
    stage1_qr_passed?: boolean;
    stage2_biometric_passed?: boolean;
    scan_timestamp?: string;
  }) =>
    apiRequest<ApiGateVerifyResponse>('/api/gate/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  manualOverride: (payload: {
    facility_code: BackendFacilityCode;
    gate_name?: string;
    pass_or_booking_code: string;
    user_id?: string;
    override_reason: string;
    stage1_qr_passed?: boolean;
    stage2_biometric_passed?: boolean;
  }) =>
    apiRequest<{
      access_granted: boolean;
      verification_type: 'MANUAL_OVERRIDE';
      override_reason: string;
      gate_log: ApiGateLog;
    }>('/api/gate/manual-override', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  batchSync: (payload: {
    logs: Array<{
      facility_code: BackendFacilityCode;
      gate_name?: string;
      user_id?: string;
      pass_or_booking_code: string;
      verification_type?: BackendVerificationType;
      stage1_qr_passed: boolean;
      stage2_biometric_passed?: boolean;
      access_granted?: boolean;
      failure_or_override_reason?: string | null;
      scanned_at?: string;
    }>;
  }) =>
    apiRequest<{
      synced_count: number;
      gate_logs: ApiGateLog[];
    }>('/api/gate/batch-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
