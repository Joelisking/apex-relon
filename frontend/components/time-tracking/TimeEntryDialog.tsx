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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  const [hours, setHours] = useState('1');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [serviceItemId, setServiceItemId] = useState('');
  const [serviceItemSubtaskId, setServiceItemSubtaskId] = useState('');

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
      setHours(String(entry.hours));
      setProjectId(entry.projectId ?? '');
      setDescription(entry.description ?? '');
      setBillable(entry.billable);
      setServiceItemId(entry.serviceItemId ?? '');
      setServiceItemSubtaskId(entry.serviceItemSubtaskId ?? '');
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setHours(initialHours ? String(initialHours) : '1');
      setProjectId(initialProjectId ?? '');
      setDescription('');
      setBillable(true);
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        date,
        hours: parseFloat(hours),
        projectId: projectId || undefined,
        description: description || undefined,
        billable,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit Time Entry' : 'Log Time'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date + Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="1.5"
              />
            </div>
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

          {/* Billable toggle */}
          <div className="flex items-center gap-3">
            <Switch id="billable" checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor="billable">Billable</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : entry ? 'Update' : 'Log Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
