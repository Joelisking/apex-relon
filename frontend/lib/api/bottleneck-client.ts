import { API_URL, getTokenFromClientCookies } from './client';

async function bottleneckFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/analytics/bottleneck${path}`, {
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
  return res.json() as Promise<T>;
}

export interface BlockerEntry {
  userId: string;
  userName: string;
  blockerScore: number;
  overdueCount: number;
  stuckProjectsBlocking: number;
  completionRate: number;
}

export interface BottleneckWidgetSummary {
  topBlockers: BlockerEntry[];
  criticalStages: Array<{ stage: string; avgDays: number; count: number }>;
  stuckProjectCount: number;
  overdueTaskCount: number;
}

export const bottleneckApi = {
  getWidgetSummary: () => bottleneckFetch<BottleneckWidgetSummary>('/widget-summary'),
};
