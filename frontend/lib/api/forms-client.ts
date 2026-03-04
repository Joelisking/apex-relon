import { apiFetch } from './client';
import type {
  LeadForm,
  LeadFormAnalytics,
  CreateLeadFormDto,
  UpdateLeadFormDto,
} from '../types';

export const formsApi = {
  getAll: () => apiFetch<LeadForm[]>('/forms'),

  getById: (id: string) => apiFetch<LeadForm>(`/forms/${id}`),

  create: (data: CreateLeadFormDto) =>
    apiFetch<LeadForm>('/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateLeadFormDto) =>
    apiFetch<LeadForm>(`/forms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/forms/${id}`, { method: 'DELETE' }),

  getAnalytics: (id: string) =>
    apiFetch<LeadFormAnalytics>(`/forms/${id}/analytics`),

  // Public endpoints — no auth token needed
  getPublic: (apiKey: string) =>
    apiFetch<Pick<LeadForm, 'id' | 'name' | 'description' | 'fields'>>(
      `/forms/public/${apiKey}`,
    ),

  submit: (apiKey: string, data: Record<string, string>) =>
    apiFetch<void>(`/forms/public/${apiKey}/submit`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    }),
};
