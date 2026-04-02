import { API_URL, getTokenFromClientCookies } from './client';

async function prefFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/user-preferences${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const userPreferencesApi = {
  async get<T>(key: string): Promise<T | null> {
    const data = await prefFetch<{ value: T | null }>(`/${key}`);
    return data.value;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await prefFetch(`/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  async remove(key: string): Promise<void> {
    await prefFetch(`/${key}`, { method: 'DELETE' });
  },
};
