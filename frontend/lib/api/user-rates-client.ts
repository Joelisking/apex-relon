import { API_URL, getTokenFromClientCookies } from './client';

export interface UserRate {
  id: string;
  userId: string;
  rate: number;
  type: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface CreateUserRateDto {
  userId: string;
  rate: number;
  type: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

async function authFetch(path: string, init: RequestInit = {}) {
  const token = getTokenFromClientCookies();
  const res = await fetch(`${API_URL}/time-tracking${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
