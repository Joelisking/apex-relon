'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { notificationsApi } from '@/lib/api/notifications-client';
import type { NotificationPreference } from '@/lib/types';

type PreferenceKey = keyof Omit<NotificationPreference, 'id' | 'userId'>;

const PREFERENCE_ITEMS: { key: PreferenceKey; label: string }[] = [
  { key: 'taskAssigned', label: 'Task assigned to me' },
  { key: 'taskDue', label: 'Task due today reminder' },
  { key: 'taskOverdue', label: 'Overdue task reminder' },
  { key: 'leadStale', label: 'Stale lead alert (14+ days)' },
  { key: 'leadStageChanged', label: 'Lead stage changes' },
  { key: 'projectAtRisk', label: 'Project at risk alert' },
  { key: 'clientDormant', label: 'Dormant client alert (30+ days)' },
  { key: 'emailDigest', label: 'Daily email digest' },
];

interface NotificationPreferencesDialogProps {
  children: React.ReactNode;
}

export function NotificationPreferencesDialog({
  children,
}: NotificationPreferencesDialogProps) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !prefs) {
      const load = async () => {
        setLoading(true);
        try {
          const data = await notificationsApi.getPreferences();
          setPrefs(data);
        } catch {
          // silently ignore
        } finally {
          setLoading(false);
        }
      };
      void load();
    }
  }, [open, prefs]);

  const handleToggle = async (key: PreferenceKey, value: boolean) => {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      await notificationsApi.updatePreferences({ [key]: value });
    } catch {
      setPrefs(prev);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings className="h-4 w-4" />
            Notification Preferences
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          {loading || !prefs ? (
            <div className="flex items-center justify-center py-6">
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border/40">
              {PREFERENCE_ITEMS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm text-foreground">{label}</span>
                  <Switch
                    checked={prefs[key]}
                    onCheckedChange={(checked) => handleToggle(key, checked)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
