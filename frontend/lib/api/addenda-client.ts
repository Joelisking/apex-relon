import { apiFetch } from './client';

export interface AddendumLine {
  id: string;
  addendumId: string;
  description: string;
  role?: string | null;
  estimatedHours: number;
  billableRate: number;
  lineTotal: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Addendum {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: string;
  total: number;
  approvedAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string };
  lines: AddendumLine[];
}

export interface CreateAddendumDto {
  title: string;
  description?: string;
  lines?: {
    description: string;
    role?: string;
    estimatedHours: number;
    billableRate: number;
    sortOrder?: number;
  }[];
}

export interface UpdateAddendumDto {
  title?: string;
  description?: string;
  status?: string;
}

export interface UpsertAddendumLineDto {
  id?: string;
  description: string;
  role?: string;
  estimatedHours: number;
  billableRate: number;
  sortOrder?: number;
}

export const addendaApi = {
  getAll: (projectId: string) =>
    apiFetch<Addendum[]>(`/projects/${projectId}/addenda`),

  create: (projectId: string, dto: CreateAddendumDto) =>
    apiFetch<Addendum>(`/projects/${projectId}/addenda`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: string, dto: UpdateAddendumDto) =>
    apiFetch<Addendum>(`/addenda/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  upsertLines: (id: string, lines: UpsertAddendumLineDto[]) =>
    apiFetch<Addendum>(`/addenda/${id}/lines`, {
      method: 'PATCH',
      body: JSON.stringify(lines),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/addenda/${id}`, { method: 'DELETE' }),
};
