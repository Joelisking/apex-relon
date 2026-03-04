'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Users, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TimeEntryDialog } from './TimeEntryDialog';
import { TimerWidget } from './TimerWidget';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

async function ttFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/time-tracking${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface TimeEntry {
  id: string;
  userId: string;
  user: { id: string; name: string };
  projectId?: string;
  project?: { id: string; name: string };
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  totalCost?: number;
  source: string;
}

export function TimeTrackingView() {
  const [tab, setTab] = useState('my-time');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const queryClient = useQueryClient();

  // Get current user from localStorage (simple approach)
  const currentUserId = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') ?? '{}')?.id
    : undefined;

  const { data: myEntries = [], isLoading: myLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', 'my', currentUserId],
    queryFn: () =>
      ttFetch<TimeEntry[]>(`/entries?userId=${currentUserId}&limit=50`),
    enabled: !!currentUserId,
  });

  const { data: allEntries = [], isLoading: allLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', 'all'],
    queryFn: () => ttFetch<TimeEntry[]>('/entries?limit=100'),
    enabled: tab === 'team-time',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ttFetch(`/entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const totalHours = myEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = myEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  const renderEntryRow = (entry: TimeEntry) => (
    <TableRow key={entry.id}>
      <TableCell className="text-sm">{new Date(entry.date).toLocaleDateString()}</TableCell>
      <TableCell>{entry.project?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">{entry.description ?? '—'}</TableCell>
      <TableCell className="font-mono">{formatHours(entry.hours)}</TableCell>
      <TableCell>
        {entry.billable ? (
          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Billable</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Non-billable</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {entry.source === 'timer' ? '⏱ Timer' : '✎ Manual'}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => { setEditingEntry(entry); setEntryDialogOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate(entry.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Log hours, track billability, and monitor project budgets.</p>
        </div>
        <div className="flex gap-2">
          <TimerWidget onSaved={() => queryClient.invalidateQueries({ queryKey: ['time-entries'] })} />
          <Button
            size="sm"
            onClick={() => { setEditingEntry(null); setEntryDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Log Time
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Total Hours (all logged)
            </p>
            <p className="text-2xl font-bold mt-1">{formatHours(totalHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-green-500" /> Billable Hours
            </p>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatHours(billableHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Billability Rate</p>
            <p className="text-2xl font-bold mt-1">
              {totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="my-time">
            <Clock className="h-4 w-4 mr-1.5" />
            My Time
          </TabsTrigger>
          <TabsTrigger value="team-time">
            <Users className="h-4 w-4 mr-1.5" />
            Team Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-time">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">My Recent Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : myEntries.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No time entries yet. Click "Log Time" to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{myEntries.map(renderEntryRow)}</TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-time">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">All Team Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : allEntries.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No entries yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Billable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-sm">{entry.user?.name ?? '—'}</TableCell>
                        <TableCell>{entry.project?.name ?? '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">{entry.description ?? '—'}</TableCell>
                        <TableCell className="font-mono">{formatHours(entry.hours)}</TableCell>
                        <TableCell>
                          {entry.billable ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Billable</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Non-billable</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TimeEntryDialog
        open={entryDialogOpen}
        entry={editingEntry}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['time-entries'] })}
      />
    </div>
  );
}
