'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api/notifications-client';
import { getTokenFromClientCookies } from '@/lib/api/client';
import type { Notification } from '@/lib/types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll({ limit: 20 });
      setNotifications(data.notifications);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // SSE for real-time notifications
  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const token = getTokenFromClientCookies();
    if (!token) return;
    try {
      const es = new EventSource(
        `${apiUrl}/notifications/stream?token=${token}`,
      );
      eventSourceRef.current = es;
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Notification;
          if (data && data.id) {
            setNotifications((prev) => [data, ...prev].slice(0, 20));
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // silently ignore parse errors
        }
      };
      es.onerror = () => {
        // silently ignore SSE errors
      };
      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch {
      // silently ignore connection errors
    }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently ignore
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    handleMarkRead,
    handleMarkAllRead,
  };
}
