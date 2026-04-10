import { apiFetch } from './client';

export interface PtoPolicy {
  id: string;
  name: string;
  maxDaysPerYear: number;
  accrualType: string;
  carryoverMax: number | null;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PtoRequest {
  id: string;
  userId: string;
  policyId: string | null;
  type: string;
  startDate: string;
  endDate: string;
  hours: number;
  status: string;
  notes: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  deniedReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; role: string };
  approvedBy?: { id: string; name: string } | null;
  policy?: { id: string; name: string } | null;
}

export interface CreatePtoRequestDto {
  type: string;
  startDate: string;
  endDate: string;
  hours: number;
  notes?: string;
  policyId?: string;
}

export interface ReviewPtoRequestDto {
  action: 'APPROVE' | 'DENY';
  deniedReason?: string;
}

export const ptoApi = {
  // Policies
  getPolicies: () => apiFetch<PtoPolicy[]>('/pto/policies'),
  createPolicy: (dto: Omit<PtoPolicy, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<PtoPolicy>('/pto/policies', { method: 'POST', body: JSON.stringify(dto) }),
  updatePolicy: (id: string, dto: Partial<Omit<PtoPolicy, 'id' | 'createdAt' | 'updatedAt'>>) =>
    apiFetch<PtoPolicy>(`/pto/policies/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deletePolicy: (id: string) =>
    apiFetch<void>(`/pto/policies/${id}`, { method: 'DELETE' }),

  // Requests
  getMyRequests: () => apiFetch<PtoRequest[]>('/pto/requests/me'),
  getPendingRequests: () => apiFetch<PtoRequest[]>('/pto/requests/pending'),
  getAllRequests: (status?: string) =>
    apiFetch<PtoRequest[]>(`/pto/requests${status ? `?status=${status}` : ''}`),
  getCalendarRequests: (startDate: string, endDate: string) =>
    apiFetch<PtoRequest[]>(`/pto/requests/calendar?startDate=${startDate}&endDate=${endDate}`),

  createRequest: (dto: CreatePtoRequestDto) =>
    apiFetch<PtoRequest>('/pto/requests', { method: 'POST', body: JSON.stringify(dto) }),
  reviewRequest: (id: string, dto: ReviewPtoRequestDto) =>
    apiFetch<PtoRequest>(`/pto/requests/${id}/review`, { method: 'PATCH', body: JSON.stringify(dto) }),
  cancelRequest: (id: string) =>
    apiFetch<PtoRequest>(`/pto/requests/${id}/cancel`, { method: 'PATCH' }),
};
