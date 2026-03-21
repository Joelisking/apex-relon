import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

export async function qbFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/quickbooks${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface QbStatus {
  connected: boolean;
  companyName?: string;
  lastSyncAt?: string;
  realmId?: string;
}

export interface SyncLog {
  id: string;
  direction: string;
  entityType: string;
  externalId?: string;
  internalId?: string;
  status: string;
  errorMessage?: string;
  syncedAt: string;
}
