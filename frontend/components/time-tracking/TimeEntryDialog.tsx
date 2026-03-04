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
import { API_URL } from '@/lib/api/client';

function getToken() {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}
function getCurrentUserId() {
  return typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? '{}')?.id
    : undefined;
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
  const userId = getCurrentUserId();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('1');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);

  // Fetch projects for selector
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

  useEffect(() => {
    if (entry) {
      setDate(entry.date.split('T')[0]);
      setHours(String(entry.hours));
      setProjectId(entry.projectId ?? '');
      setDescription(entry.description ?? '');
      setBillable(entry.billable);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setHours(initialHours ? String(initialHours) : '1');
      setProjectId(initialProjectId ?? '');
      setDescription('');
      setBillable(true);
    }
  }, [entry, open, initialHours, initialProjectId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        userId,
        date,
        hours: parseFloat(hours),
        projectId: projectId || undefined,
        description: description || undefined,
        billable,
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

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
            />
          </div>

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
