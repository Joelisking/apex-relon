import { API_URL, getTokenFromClientCookies } from './client';

export interface PayGrade {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface PayGradeSummary {
  id: string;
  name: string;
  code: string;
}

export interface UserRate {
  id: string;
  userId: string;
  rate: number;
  payGradeId: string;
  payGrade?: PayGradeSummary;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface CreateUserRateDto {
  userId: string;
  rate: number;
  payGradeId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

async function authFetch(path: string, init: RequestInit = {}, base = 'time-tracking') {
  const token = getTokenFromClientCookies();
  const res = await fetch(`${API_URL}/${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined;
  return res.json();
}

export interface UpdateUserRateDto {
  rate?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export const userRatesApi = {
  getForUser: (userId: string): Promise<UserRate[]> =>
    authFetch(`/rates/${userId}`),

  create: (dto: CreateUserRateDto): Promise<UserRate> =>
    authFetch('/rates', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: string, dto: UpdateUserRateDto): Promise<UserRate> =>
    authFetch(`/rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  delete: (id: string): Promise<void> =>
    authFetch(`/rates/${id}`, { method: 'DELETE' }),
};

export const payGradesApi = {
  getAll: (): Promise<PayGrade[]> =>
    authFetch('/pay-grades', {}, 'settings'),

  create: (dto: { name: string; code: string; description?: string; sortOrder?: number; isDefault?: boolean }): Promise<PayGrade> =>
    authFetch('/pay-grades', { method: 'POST', body: JSON.stringify(dto) }, 'settings'),

  update: (id: string, dto: Partial<{ name: string; description: string; sortOrder: number; isDefault: boolean; isActive: boolean }>): Promise<PayGrade> =>
    authFetch(`/pay-grades/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }, 'settings'),

  delete: (id: string): Promise<void> =>
    authFetch(`/pay-grades/${id}`, { method: 'DELETE' }, 'settings'),
};

export interface IndotPayZone {
  id: string;
  name: string;
  payGradeId: string;
  payGrade: PayGradeSummary;
  counties: string[];
  createdAt: string;
  updatedAt: string;
}

export const indotPayZonesApi = {
  getAll: (): Promise<IndotPayZone[]> =>
    authFetch('/indot-pay-zones', {}, 'settings'),

  create: (dto: { name: string; payGradeId: string; counties?: string[] }): Promise<IndotPayZone> =>
    authFetch('/indot-pay-zones', { method: 'POST', body: JSON.stringify(dto) }, 'settings'),

  update: (id: string, dto: Partial<{ name: string; payGradeId: string; counties: string[] }>): Promise<IndotPayZone> =>
    authFetch(`/indot-pay-zones/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }, 'settings'),

  delete: (id: string): Promise<void> =>
    authFetch(`/indot-pay-zones/${id}`, { method: 'DELETE' }, 'settings'),
};
