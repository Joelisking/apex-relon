import { apiFetch, getTokenFromClientCookies } from './client';
import type { CostBreakdown, CostBreakdownRoleEstimate } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface CreateCostBreakdownDto {
  title: string;
  jobTypeId?: string;
  projectId?: string;
  leadId?: string;
  notes?: string;
}

export interface UpdateCostBreakdownDto {
  title?: string;
  status?: string;
  notes?: string;
  projectId?: string;
  mileageQty?: number | null;
  mileageRate?: number | null;
  lodgingQty?: number | null;
  lodgingRate?: number | null;
  perDiemQty?: number | null;
  perDiemRate?: number | null;
  roundedFee?: number | null;
}

export interface UpsertRoleEstimateDto {
  subtaskId: string;
  role: string;
  estimatedHours: number;
  hourlyRate?: number;
}

export const costBreakdownApi = {
  getAll: (filters?: { leadId?: string }) => {
    const params = filters?.leadId ? `?leadId=${filters.leadId}` : '';
    return apiFetch<CostBreakdown[]>(`/cost-breakdowns${params}`);
  },
  getOne: (id: string) => apiFetch<CostBreakdown>(`/cost-breakdowns/${id}`),
  create: (dto: CreateCostBreakdownDto) =>
    apiFetch<CostBreakdown>('/cost-breakdowns', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id: string, dto: UpdateCostBreakdownDto) =>
    apiFetch<CostBreakdown>(`/cost-breakdowns/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  delete: (id: string) => apiFetch<void>(`/cost-breakdowns/${id}`, { method: 'DELETE' }),
  upsertRoleEstimate: (lineId: string, dto: UpsertRoleEstimateDto) =>
    apiFetch<CostBreakdownRoleEstimate>(`/cost-breakdowns/lines/${lineId}/role-estimates`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
  updateLine: (lineId: string, dto: { excludedSubtaskIds: string[] }) =>
    apiFetch<{ id: string; excludedSubtaskIds: string[] }>(`/cost-breakdowns/lines/${lineId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  deleteRoleEstimate: (lineId: string, subtaskId: string, role: string) =>
    apiFetch<void>(
      `/cost-breakdowns/lines/${lineId}/role-estimates/${encodeURIComponent(subtaskId)}/${encodeURIComponent(role)}`,
      { method: 'DELETE' },
    ),
  deleteLine: (lineId: string) => apiFetch<void>(`/cost-breakdowns/lines/${lineId}`, { method: 'DELETE' }),
  addLine: (costBreakdownId: string, serviceItemId: string) =>
    apiFetch<import('../types').CostBreakdownLine>(`/cost-breakdowns/${costBreakdownId}/lines`, {
      method: 'POST',
      body: JSON.stringify({ serviceItemId }),
    }),
  downloadPdf: async (id: string): Promise<Blob> => {
    const token = getTokenFromClientCookies();
    const response = await fetch(`${API_URL}/cost-breakdowns/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`PDF download failed: ${response.status}`);
    return response.blob();
  },
};
