// Client API service communicating with Express backend
// Configured to point to the deployed Render backend via NEXT_PUBLIC_API_URL or VITE_API_URL
const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  'http://localhost:5000/api';

const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

export interface ConsumptionData {
  type: 'BILL' | 'APPLIANCES';
  value: number | Record<string, number>;
}

export interface PublicCalculatePayload {
  meterNumber?: string;
  consumptionData: ConsumptionData;
  consumerName?: string;
  consumerPhone?: string;
  city?: string;
}

export interface PublicCalculateResponse {
  inquiryId: string;
  meterNumber: string;
  consumptionData: ConsumptionData;
  calculatedKw: number;
  grossCost: number;
  subsidyAmount: number;
  netCost: number;
  batteryBackupKwh: number;
  status: string;
  feedbackRating: number | null;
  sizingDetails: {
    dailyKwh: number;
    monthlySavingsEst: number;
  };
}

export interface Vendor {
  _id: string;
  companyName: string;
  contactEmail: string;
  phone: string;
  servicePincodes: string[];
  rating: number;
  accreditation?: string;
  completedProjects?: number;
}

export interface LeadItem {
  _id: string;
  meterNumber: string;
  consumptionData: ConsumptionData;
  calculatedKw: number;
  calculatedCost: number;
  subsidyAmount?: number;
  netCost?: number;
  batteryBackupKwh?: number;
  status: 'PENDING' | 'APPROVED' | 'COMMISSIONED';
  feedbackRating?: number;
  consumerName?: string;
  consumerPhone?: string;
  userPhone?: string;
  selectedVendorId?: string | { _id: string; companyName: string; phone?: string; rating?: number };
  selectedVendor?: { _id: string; companyName: string; phone?: string; rating?: number };
  vendorContacted?: boolean;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryUser {
  name: string;
  email?: string;
  meterNumber: string;
}

export interface InquiryItem {
  _id: string;
  meterNumber: string;
  user?: InquiryUser;
  name?: string;
  email?: string;
  userEmail?: string;
  consumerName?: string;
  consumerPhone?: string;
  userPhone?: string;
  city?: string;
  consumptionData: ConsumptionData;
  calculatedKw: number;
  grossCost: number;
  calculatedCost: number;
  subsidyAmount: number;
  netCost: number;
  batteryBackupKwh?: number;
  status: string;
  feedbackRating?: number | null;
  selectedVendorId?: any;
  selectedVendor?: any;
  vendorContacted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  totalLeads: number;
  totalDemandedKw: number;
  totalDemandedCost: number;
  avgRating: number;
  byStatus: {
    PENDING: number;
    APPROVED: number;
    COMMISSIONED: number;
  };
}

export interface CohortPayload {
  type: 'APPLIANCE' | 'KW';
  houses: number;
  loadDetails: Record<string, number> | { kw: number };
}

export interface DPRGeneratePayload {
  areaName: string;
  availableLandAcres: number;
  distanceToSubstation: number;
  cohortData: CohortPayload[];
}

function getAuthHeader(token?: string | null): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` };
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('sdpr_demo_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token) return { Authorization: `Bearer ${parsed.token}` };
      }
    } catch {}
  }
  return {};
}

export interface CreateInquiryPayload {
  calculatedKw: number;
  grossCost: number;
  calculatedCost?: number;
  subsidyAmount: number;
  netCost?: number;
  batteryBackupKwh?: number;
  meterNumber?: string;
  userId?: string;
  consumerName?: string;
  consumerPhone?: string;
  city?: string;
  consumptionData?: ConsumptionData;
  status?: string;
}

/**
 * Public: Run solar sizing calculation and save inquiry
 */
export async function calculatePublicInquiry(
  payload: PublicCalculatePayload,
  token?: string | null
): Promise<PublicCalculateResponse> {
  const res = await fetch(`${API_BASE_URL}/public/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to calculate solar system.');
  }

  return data.data;
}

/**
 * Public: Asynchronously POST calculation results directly to /api/public/inquiry
 */
export async function createPublicInquiry(
  payload: CreateInquiryPayload,
  token?: string | null
): Promise<PublicCalculateResponse> {
  const res = await fetch(`${API_BASE_URL}/public/inquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit public inquiry to database.');
  }

  return data.data;
}

export const submitPublicInquiry = createPublicInquiry;

/**
 * Public: Fetch past inquiries submitted by citizen
 */
export async function fetchMyInquiries(token?: string | null): Promise<LeadItem[]> {
  const res = await fetch(`${API_BASE_URL}/public/my-inquiries`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch saved calculations.');
  }

  return data.data || [];
}

/**
 * Public: Submit 1-5 star feedback
 */
export async function submitFeedbackRating(payload: {
  inquiryId?: string;
  meterNumber?: string;
  rating: number;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/public/feedback`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to submit feedback rating.');
  }
}

/**
 * Admin: Fetch paginated, filterable CRM leads
 */
export async function fetchLeads(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  },
  token?: string | null
): Promise<{
  leads: LeadItem[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  stats: LeadStats;
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE_URL}/admin/leads?${query.toString()}`, {
    headers: {
      ...getAuthHeader(token)
    },
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch CRM leads.');
  }

  return {
    leads: data.data,
    pagination: data.pagination,
    stats: data.stats
  };
}

/**
 * Admin: Fetch all public inquiries from live database
 */
export async function fetchAdminInquiries(token?: string | null): Promise<InquiryItem[]> {
  const res = await fetch(`${API_BASE_URL}/admin/inquiries`, {
    headers: {
      ...getAuthHeader(token)
    },
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch inquiries.');
  }

  return Array.isArray(data) ? data : data.data || [];
}

/**
 * Admin: Update inquiry status
 */
export async function updateInquiryStatus(
  id: string,
  status: string,
  token?: string | null
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/admin/inquiries/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok || (data.success === false)) {
    throw new Error(data.error || 'Failed to update inquiry status.');
  }

  return data.data || data;
}

/**
 * Admin: Update lead status
 */
export async function updateLeadStatus(
  id: string,
  status: 'PENDING' | 'APPROVED' | 'COMMISSIONED' | string,
  token?: string | null
): Promise<LeadItem> {
  const res = await fetch(`${API_BASE_URL}/admin/leads/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify({ status })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update lead status.');
  }

  return data.data;
}

/**
 * Admin: Generate Official Area DPR and trigger immediate PDF buffer download
 */
export async function generateAndDownloadDPR(
  payload: DPRGeneratePayload,
  token?: string | null
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/dpr/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errMessage = 'Failed to generate DPR PDF.';
    try {
      const errJson = await res.json();
      errMessage = errJson.error || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  // Extract filename from header or fallback
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  let filename = `Official_Solar_DPR_${payload.areaName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Admin: List past DPRs
 */
export async function fetchDPRList(token?: string | null): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/admin/dpr`, {
    headers: {
      ...getAuthHeader(token)
    },
    cache: 'no-store'
  });
  const data = await res.json();
  return data.success ? data.data : [];
}

/**
 * Public: Fetch empanelled vendors by PIN code
 */
export async function fetchVendors(pincode?: string): Promise<{
  vendors: Vendor[];
  fallbackUsed: boolean;
}> {
  const query = pincode ? `?pincode=${encodeURIComponent(pincode.trim())}` : '';
  const res = await fetch(`${API_BASE_URL}/public/vendors${query}`, {
    cache: 'no-store'
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch vendor list.');
  }

  return {
    vendors: data.data,
    fallbackUsed: data.fallbackUsed || false
  };
}

/**
 * Public: Contact vendor for specific inquiry
 */
export async function contactVendor(
  inquiryId: string,
  payload: { userPhone: string; vendorId: string },
  token?: string | null
): Promise<{
  inquiryId: string;
  vendorContacted: boolean;
  selectedVendor: { companyName: string; phone?: string };
}> {
  const res = await fetch(`${API_BASE_URL}/public/inquiry/${inquiryId}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(token)
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to dispatch report to installer.');
  }

  return data.data;
}

/**
 * Public: Download Personal Rooftop Solar Installation Report (PDF)
 */
export async function downloadPersonalDprPdf(
  inquiryId: string,
  token?: string | null
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/public/inquiry/${inquiryId}/download-pdf`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(token)
    }
  });

  if (!res.ok) {
    let errMessage = 'Failed to generate personal solar PDF report.';
    try {
      const errJson = await res.json();
      errMessage = errJson.error || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  // Extract filename from header or fallback
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  let filename = 'My-Solar-Report.pdf';
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}



