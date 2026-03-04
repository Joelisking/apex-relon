import { API_URL } from './client';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') return decodeURIComponent(value);
  }
  return null;
}

export const dashboardLayoutApi = {
  async getLayout(): Promise<{ widgets: WidgetConfig[] }> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/dashboard/layout`, { headers });
    if (!res.ok) throw new Error('Failed to fetch layout');
    return res.json();
  },

  async saveLayout(widgets: WidgetConfig[]): Promise<void> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/dashboard/layout`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ widgets }),
    });
    if (!res.ok) throw new Error('Failed to save layout');
  },

  async resetLayout(): Promise<void> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/dashboard/layout`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to reset layout');
  },

  async getRoleDefaults(
    role: string,
  ): Promise<{ widgets: WidgetConfig[] }> {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(
      `${API_URL}/dashboard/layout/defaults/${role}`,
      { headers },
    );
    if (!res.ok) throw new Error('Failed to fetch defaults');
    return res.json();
  },
};
