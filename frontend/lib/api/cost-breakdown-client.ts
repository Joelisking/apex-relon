import { apiFetch } from './client';
import type { CostBreakdown, CostBreakdownRoleEstimate } from '../types';

export interface CreateCostBreakdownDto {
  title: string;
  serviceTypeId?: string;
  projectId?: string;
  leadId?: string;
  notes?: string;
}

export interface UpdateCostBreakdownDto {
  title?: string;
  status?: string;
  notes?: string;
}

export interface UpsertRoleEstimateDto {
  role: string;
  estimatedHours: number;
  hourlyRate?: number;
}

export const costBreakdownApi = {
  getAll: () => apiFetch<CostBreakdown[]>('/cost-breakdowns'),
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
  deleteRoleEstimate: (lineId: string, role: string) =>
    apiFetch<void>(`/cost-breakdowns/lines/${lineId}/role-estimates/${encodeURIComponent(role)}`, {
      method: 'DELETE',
    }),
};
