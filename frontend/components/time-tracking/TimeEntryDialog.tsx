'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { API_URL, getTokenFromClientCookies, serviceItemsApi } from '@/lib/api/client';
import type { ServiceItem } from '@/lib/types';

function getToken() {
  return getTokenFromClientCookies() ?? '';
}

async function ttFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/time-tracking${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  serviceItemId?: string;
  serviceItemSubtaskId?: string;
}

interface TimeEntryDialogProps {
  open: boolean;
  entry?: TimeEntry | null;
  initialHours?: number;
  initialProjectId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TimeEntryDialog({
  open,
  entry,
  initialHours,
  initialProjectId,
  onOpenChange,
  onSaved,
}: TimeEntryDialogProps) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00:00');
  const [endTime, setEndTime] = useState('09:00:00');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState<boolean | null>(null);
  const [serviceItemId, setServiceItemId] = useState('');
  const [serviceItemSubtaskId, setServiceItemSubtaskId] = useState('');

  // Compute hours from start/end times
  const computedHours = (() => {
    const [sh, sm, ss] = startTime.split(':').map(Number);
    const [eh, em, es] = endTime.split(':').map(Number);
    const startSec = sh * 3600 + sm * 60 + ss;
    const endSec = eh * 3600 + em * 60 + es;
    const diff = endSec - startSec;
    if (diff <= 0) return 0;
    return Math.round((diff / 3600) * 10000) / 10000;
  })();

  // Fetch projects
  const { data: projects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['projects-simple'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/projects?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      return Array.isArray(data) ? data : (data.projects ?? data.data ?? []);
    },
  });

  // Fetch service items (with subtasks embedded)
  const { data: serviceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['service-items-active'],
    queryFn: () => serviceItemsApi.getAll(),
  });

  // Subtasks for the currently selected service item
  const selectedItem = serviceItems.find((si) => si.id === serviceItemId);
  const subtasks = selectedItem?.subtasks ?? [];

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (entry) {
      setDate(entry.date.split('T')[0]);
      const h = entry.hours || 1;
      setStartTime('08:00:00');
      const endTotalSec = 8 * 3600 + Math.round(h * 3600);
      const eh = Math.floor(endTotalSec / 3600);
      const em = Math.floor((endTotalSec % 3600) / 60);
      const es = endTotalSec % 60;
      setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:${String(es).padStart(2, '0')}`);
      setProjectId(entry.projectId ?? '');
      setDescription(entry.description ?? '');
      setBillable(entry.billable);
      setServiceItemId(entry.serviceItemId ?? '');
      setServiceItemSubtaskId(entry.serviceItemSubtaskId ?? '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('08:00:00');
      const ih = initialHours || 1;
      const endTotalSec = 8 * 3600 + Math.round(ih * 3600);
      const eh = Math.floor(endTotalSec / 3600);
      const em = Math.floor((endTotalSec % 3600) / 60);
      const es = endTotalSec % 60;
      setEndTime(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:${String(es).padStart(2, '0')}`);
      setProjectId(initialProjectId ?? '');
      setDescription('');
      setBillable(null);
      setServiceItemId('');
      setServiceItemSubtaskId('');
    }
  }, [entry, open, initialHours, initialProjectId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset subtask when service item changes
  const handleServiceItemChange = (val: string) => {
    setServiceItemId(val === '__none__' ? '' : val);
    setServiceItemSubtaskId('');
  };

  const canSave = computedHours > 0 && billable !== null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        date,
        hours: computedHours,
        projectId: projectId || undefined,
        description: description || undefined,
        billable: billable!,
        serviceItemId: serviceItemId || undefined,
        serviceItemSubtaskId: serviceItemSubtaskId || undefined,
      };

      if (entry) {
        return ttFetch(`/entries/${entry.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        return ttFetch('/entries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(entry ? 'Entry updated' : 'Time logged');
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} clearable={false} />
          </div>

          {/* Start / End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Start Time</Label>
              <TimePicker value={startTime} onChange={setStartTime} />
            </div>
            <div>
              <Label className="mb-1.5 block">End Time</Label>
              <TimePicker value={endTime} onChange={setEndTime} />
            </div>
          </div>

          {/* Duration display */}
          <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
            <span className="text-xs text-muted-foreground">Duration:</span>
            {computedHours > 0 ? (
              <span className="text-sm font-medium tabular-nums">
                {(() => {
                  const totalSec = Math.round(computedHours * 3600);
                  const hh = Math.floor(totalSec / 3600);
                  const mm = Math.floor((totalSec % 3600) / 60);
                  const ss = totalSec % 60;
                  return `${hh}h ${mm}m ${ss}s (${computedHours.toFixed(2)} hrs)`;
                })()}
              </span>
            ) : (
              <span className="text-sm text-destructive">End time must be after start time</span>
            )}
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => setProjectId(v === '__none__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Item */}
          <div className="space-y-1.5">
            <Label>Service Item</Label>
            <Select value={serviceItemId || '__none__'} onValueChange={handleServiceItemChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select service item (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {serviceItems.map((si) => (
                  <SelectItem key={si.id} value={si.id}>
                    {si.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subtask — only shown when a service item is selected and has subtasks */}
          {serviceItemId && subtasks.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subtask</Label>
              <Select
                value={serviceItemSubtaskId || '__none__'}
                onValueChange={(v) => setServiceItemSubtaskId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subtask (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {subtasks.map((st) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
            />
          </div>

          {/* Billable selection — nothing selected by default */}
          <div className="space-y-1.5">
            <Label>
              Billable <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={billable === true ? 'default' : 'outline'}
                className={billable === true ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                onClick={() => setBillable(true)}
              >
                Billable
              </Button>
              <Button
                type="button"
                size="sm"
                variant={billable === false ? 'default' : 'outline'}
                className={billable === false ? 'bg-slate-600 hover:bg-slate-700 text-white' : ''}
                onClick={() => setBillable(false)}
              >
                Non-billable
              </Button>
            </div>
            {billable === null && (
              <p className="text-xs text-muted-foreground">Please select whether this entry is billable</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave}>
            {saveMutation.isPending ? 'Saving…' : entry ? 'Update' : 'Log Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
