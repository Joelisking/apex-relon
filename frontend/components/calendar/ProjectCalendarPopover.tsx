'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { projectsApi } from '@/lib/api/projects-client';
import type { CalendarEvent } from './calendarUtils';

interface ProjectCalendarPopoverProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectCalendarPopover({ event, onClose, onSaved }: ProjectCalendarPopoverProps) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDate(event?.estimatedDueDate?.slice(0, 10) ?? '');
  }, [event?.sourceId, event?.estimatedDueDate]);

  const projectName = event?.title?.replace(/^Due:\s*/, '') ?? '';

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await projectsApi.update(event.sourceId, {
        estimatedDueDate: date ? new Date(date + 'T12:00:00').toISOString() : undefined,
      });
      toast.success('Due date updated');
      onSaved();
      onClose();
    } catch {
      toast.error('Failed to update due date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">{projectName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
          <DatePicker value={date} onChange={setDate} placeholder="No due date set" />
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground px-0 hover:bg-transparent hover:text-foreground"
            onClick={() => { router.push(`/projects/${event?.sourceId}`); onClose(); }}>
            <ExternalLink className="h-3.5 w-3.5" />
            View Project
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
