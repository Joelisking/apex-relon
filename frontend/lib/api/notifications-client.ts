import { apiFetch } from './client';
import type { NotificationResponse, NotificationPreference } from '../types';

export const notificationsApi = {
  getAll: (filters?: {
    unread?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.unread) params.set('unread', 'true');
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<NotificationResponse>(`/notifications${query}`);
  },

  getUnreadCount: () =>
    apiFetch<number>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch<void>('/notifications/mark-all-read', {
      method: 'POST',
    }),

  getPreferences: () =>
    apiFetch<NotificationPreference>('/notifications/preferences'),

  updatePreferences: (dto: Partial<NotificationPreference>) =>
    apiFetch<NotificationPreference>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
};
