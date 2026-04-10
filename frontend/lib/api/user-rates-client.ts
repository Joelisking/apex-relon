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

export const userRatesApi = {
  getForUser: (userId: string): Promise<UserRate[]> =>
    authFetch(`/rates/${userId}`),

  create: (dto: CreateUserRateDto): Promise<UserRate> =>
    authFetch('/rates', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

export const payGradesApi = {
  getAll: (): Promise<PayGrade[]> =>
    authFetch('/pay-grades', {}, 'settings'),
};
