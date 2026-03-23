'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Loader2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationPreferencesDialog } from '@/components/notifications/NotificationPreferencesDialog';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: '📋',
  TASK_DUE: '⏰',
  TASK_OVERDUE: '🚨',
  LEAD_UPDATE: '🔔',
  LEAD_STALE: '😴',
  LEAD_STAGE_CHANGED: '📊',
  PROJECT_AT_RISK: '⚠️',
  CLIENT_DORMANT: '💤',
  QUOTE_STATUS: '📄',
  WORKFLOW: '⚡',
  SYSTEM: '🔧',
  MENTION: '💬',
};

function getEntityUrl(notification: Notification): string | null {
  const { type, entityType, entityId } = notification;
  if (!entityType || !entityId) return null;
  const isTaskNotif = type.startsWith('TASK_');
  switch (entityType) {
    case 'LEAD':
      return isTaskNotif ? `/leads/${entityId}?tab=tasks` : `/leads/${entityId}`;
    case 'CLIENT':
      return `/clients/${entityId}`;
    case 'PROJECT':
      return isTaskNotif ? `/projects/${entityId}?tab=tasks` : `/projects/${entityId}`;
    case 'TASK':
      return `/tasks`;
    default:
      return null;
  }
}

interface NotificationItemProps {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onNavigate: (url: string) => void;
}

function NotificationItem({ notif, onMarkRead, onNavigate }: NotificationItemProps) {
  const url = getEntityUrl(notif);

  const handleRowClick = () => {
    if (!notif.read) onMarkRead(notif.id);
    if (url) onNavigate(url);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 border-b border-border/30 transition-colors hover:bg-muted/30',
        !notif.read && 'bg-primary/5',
        url && 'cursor-pointer',
      )}
      onClick={handleRowClick}
      role={url ? 'button' : undefined}
      tabIndex={url ? 0 : undefined}
      onKeyDown={
        url
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') handleRowClick();
            }
          : undefined
      }
    >
      <span className="text-base mt-0.5 shrink-0">
        {typeIcons[notif.type] ?? '🔔'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-xs leading-snug', !notif.read && 'font-medium')}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {notif.message}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {timeAgo(notif.createdAt)}
        </p>
      </div>
      {!notif.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notif.id);
          }}
          title="Mark as read"
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    handleMarkRead,
    handleMarkAllRead,
  } = useNotifications();

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleNavigate = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const todayNotifs = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifs = notifications.filter((n) => !isToday(n.createdAt));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div>
              {todayNotifs.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground bg-muted/20">
                    Today
                  </div>
                  {todayNotifs.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onMarkRead={handleMarkRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </>
              )}
              {earlierNotifs.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground bg-muted/20">
                    Earlier
                  </div>
                  {earlierNotifs.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notif={notif}
                      onMarkRead={handleMarkRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        <div className="border-t px-3 py-2 flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
          <NotificationPreferencesDialog>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground gap-1"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </NotificationPreferencesDialog>
        </div>
      </PopoverContent>
    </Popover>
  );
}
