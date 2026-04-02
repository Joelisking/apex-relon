'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Users, Trash2, Pencil, CalendarDays, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
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
import { ProxyUserPickerDialog } from './ProxyUserPickerDialog';
import type { UserDirectoryItem } from '@/lib/api/users-client';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';

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
  submittedById?: string | null;
  submittedBy?: { id: string; name: string } | null;
  projectId?: string;
  project?: { id: string; name: string };
  serviceItemId?: string;
  serviceItem?: { id: string; name: string };
  serviceItemSubtaskId?: string;
  serviceItemSubtask?: { id: string; name: string };
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  totalCost?: number;
  source: string;
}

interface TimesheetRow {
  user: { id: string; name: string };
  days: Record<string, number>;
  totalHours: number;
}

interface TimesheetData {
  startDate: string;
  endDate: string;
  rows: TimesheetRow[];
}

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // back to local Sunday
  return localDateString(d);
}

function formatHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function formatDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function TimeTrackingView() {
  const { user, hasPermission } = useAuth();
  const canManageAll = hasPermission('time_tracking:manage_all');
  const canEnterForOthers = hasPermission('time_tracking:enter_for_others');

  const [tab, setTab] = useState('my-time');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [proxyPickerOpen, setProxyPickerOpen] = useState(false);
  const [proxyUser, setProxyUser] = useState<UserDirectoryItem | null>(null);
  const queryClient = useQueryClient();

  // Date range filter — default to current month
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Weekly timesheet navigation
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const dateQuery = startDate && endDate
    ? `&startDate=${startDate}&endDate=${endDate}`
    : '';

  const canViewAll = canManageAll || canEnterForOthers;

  // When the user can view all entries, explicitly pass their userId so the backend
  // doesn't return all users' entries for the "My Time" tab.
  const myUserQuery = canViewAll && user?.id ? `&userId=${user.id}` : '';

  const { data: myEntries = [], isLoading: myLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', 'my', user?.id, startDate, endDate],
    queryFn: () =>
      ttFetch<TimeEntry[]>(`/entries?limit=200${dateQuery}${myUserQuery}`),
  });

  const { data: allEntries = [], isLoading: allLoading } = useQuery<TimeEntry[]>({
    queryKey: ['time-entries', 'all', startDate, endDate],
    queryFn: () => ttFetch<TimeEntry[]>(`/entries?limit=200${dateQuery}`),
    enabled: tab === 'team-time' && canViewAll,
  });

  const timesheetUserQuery = !canViewAll && user?.id ? `&userId=${user.id}` : '';

  const { data: timesheet, isLoading: timesheetLoading } = useQuery<TimesheetData>({
    queryKey: ['timesheet', weekStart, canViewAll ? 'all' : user?.id],
    queryFn: () => ttFetch<TimesheetData>(`/timesheet?startDate=${weekStart}${timesheetUserQuery}`),
    enabled: tab === 'timesheet',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ttFetch(`/entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Entry deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalHours = myEntries.reduce((s, e) => s + e.hours, 0);
  const billableHours = myEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  // Week days for timesheet header
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const start = new Date(weekStart + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [weekStart]);

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  // Mobile card view for a single entry
  const renderEntryCard = (entry: TimeEntry, showUser = false) => {
    const canEditThis = showUser ? canEnterForOthers : entry.userId === user?.id;
    return (
      <div key={entry.id} className="px-4 py-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {entry.project?.name ?? <span className="text-muted-foreground">No project</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.date.split('T')[0] + 'T12:00:00').toLocaleDateString()}
              {showUser && entry.user?.name ? ` · ${entry.user.name}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono font-semibold text-sm">{formatHours(entry.hours)}</p>
            {entry.billable ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-0.5">Billable</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs mt-0.5">Non-bill.</Badge>
            )}
          </div>
        </div>
        {entry.serviceItem && (
          <p className="text-xs text-muted-foreground">
            {entry.serviceItem.name}
            {entry.serviceItemSubtask ? ` · ${entry.serviceItemSubtask.name}` : ''}
          </p>
        )}
        {entry.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{entry.description}</p>
        )}
        {entry.submittedBy && (
          <p className="text-xs text-muted-foreground">Logged by {entry.submittedBy.name}</p>
        )}
        {canEditThis && (
          <div className="flex gap-1 justify-end pt-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => { setEditingEntry(entry); setProxyUser(null); setEntryDialogOpen(true); }}>
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
        )}
      </div>
    );
  };

  // Desktop table row for a single entry
  const renderEntryRow = (entry: TimeEntry, showUser = false) => {
    const canEditThis = showUser ? canEnterForOthers : entry.userId === user?.id;
    return (
      <TableRow key={entry.id}>
        <TableCell className="text-sm whitespace-nowrap">
          {new Date(entry.date.split('T')[0] + 'T12:00:00').toLocaleDateString()}
        </TableCell>
        {showUser && (
          <TableCell className="font-medium text-sm">{entry.user?.name ?? '—'}</TableCell>
        )}
        <TableCell className="text-sm">
          {entry.project?.name ?? <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="text-sm max-w-[160px] truncate">
          {entry.serviceItem ? (
            <span className="text-xs">
              <span className="font-medium">{entry.serviceItem.name}</span>
              {entry.serviceItemSubtask && (
                <span className="text-muted-foreground"> · {entry.serviceItemSubtask.name}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-[160px] text-sm">
          <div className="truncate text-muted-foreground">{entry.description ?? '—'}</div>
          {entry.submittedBy && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Logged by {entry.submittedBy.name}
            </div>
          )}
        </TableCell>
        <TableCell className="font-mono text-sm">{formatHours(entry.hours)}</TableCell>
        <TableCell>
          {entry.billable ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Billable</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Non-billable</Badge>
          )}
        </TableCell>
        {canEditThis && (
          <TableCell>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => { setEditingEntry(entry); setProxyUser(null); setEntryDialogOpen(true); }}>
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
        )}
      </TableRow>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground mt-1 hidden sm:block">
            Log hours, track billability, and monitor project budgets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <TimerWidget onSaved={() => queryClient.invalidateQueries({ queryKey: ['time-entries'] })} />
          {canEnterForOthers && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProxyPickerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" />
              <span className="sm:hidden">For Team</span>
              <span className="hidden sm:inline">Log for Team Member</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => { setEditingEntry(null); setProxyUser(null); setEntryDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Log Time
          </Button>
        </div>
      </div>

      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <div className="grid grid-cols-2 gap-3 sm:contents">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  className="h-8 w-full sm:w-44 text-sm"
                  clearable={false}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  className="h-8 w-full sm:w-44 text-sm"
                  clearable={false}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs flex-1 sm:flex-none"
                onClick={() => {
                  const d = new Date();
                  setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
                  setEndDate(d.toISOString().split('T')[0]);
                }}>
                This Month
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs flex-1 sm:flex-none"
                onClick={() => {
                  const d = new Date();
                  const start = new Date(d);
                  start.setDate(d.getDate() - d.getDay());
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(d.toISOString().split('T')[0]);
                }}>
                This Week
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="hidden sm:inline">Total Hours</span>
              <span className="sm:hidden">Total</span>
            </p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">{formatHours(totalHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500 shrink-0" />
              <span className="hidden sm:inline">Billable Hours</span>
              <span className="sm:hidden">Billable</span>
            </p>
            <p className="text-lg sm:text-2xl font-bold mt-1 text-green-600 tabular-nums">{formatHours(billableHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-4">
            <p className="text-xs text-muted-foreground">
              <span className="hidden sm:inline">Billability Rate</span>
              <span className="sm:hidden">Rate</span>
            </p>
            <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">
              {totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="my-time" className="flex-1 sm:flex-none">
            <Clock className="h-4 w-4 mr-1.5" />
            My Time
          </TabsTrigger>
          {canViewAll && (
            <TabsTrigger value="team-time" className="flex-1 sm:flex-none">
              <Users className="h-4 w-4 mr-1.5" />
              <span className="sm:hidden">Team</span>
              <span className="hidden sm:inline">Team Time</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="timesheet" className="flex-1 sm:flex-none">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Timesheet
          </TabsTrigger>
        </TabsList>

        {/* My Time */}
        <TabsContent value="my-time">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">My Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {myLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : myEntries.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No time entries for this period. Click &quot;Log Time&quot; to get started.
                </p>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y">
                    {myEntries.map((e) => renderEntryCard(e, false))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Service Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Billable</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>{myEntries.map((e) => renderEntryRow(e, false))}</TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Time — only visible to users with time_tracking:manage_all */}
        <TabsContent value="team-time">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">All Team Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {allLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : allEntries.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No entries for this period.</p>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y">
                    {allEntries.map((e) => renderEntryCard(e, true))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Service Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Billable</TableHead>
                          {canEnterForOthers && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>{allEntries.map((e) => renderEntryRow(e, true))}</TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Timesheet */}
        <TabsContent value="timesheet">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm">Weekly Timesheet</CardTitle>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shiftWeek(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm font-medium tabular-nums">
                    {formatDate(weekStart)} – {timesheet?.endDate ? formatDate(timesheet.endDate) : '…'}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => shiftWeek(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs ml-1"
                    onClick={() => setWeekStart(getWeekStart(new Date()))}>
                    Today
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {timesheetLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : !timesheet || timesheet.rows.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No hours logged this week.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Team Member</TableHead>
                        {weekDays.map((day) => (
                          <TableHead key={day} className="text-center w-20 text-xs">
                            <div>{new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className="text-muted-foreground font-normal">
                              {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheet.rows.map((row) => (
                        <TableRow key={row.user.id}>
                          <TableCell className="font-medium text-sm">{row.user.name}</TableCell>
                          {weekDays.map((day) => {
                            const h = row.days[day] ?? 0;
                            return (
                              <TableCell key={day} className="text-center font-mono text-sm">
                                {h > 0 ? (
                                  <span className={h >= 8 ? 'text-green-700 font-semibold' : h >= 4 ? 'text-foreground' : 'text-muted-foreground'}>
                                    {h}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-mono font-semibold text-sm">
                            {row.totalHours}h
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/30 font-medium">
                        <TableCell className="text-sm">Total</TableCell>
                        {weekDays.map((day) => {
                          const total = timesheet.rows.reduce((sum, row) => sum + (row.days[day] ?? 0), 0);
                          return (
                            <TableCell key={day} className="text-center font-mono text-sm">
                              {total > 0 ? total : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-mono text-sm">
                          {timesheet.rows.reduce((s, r) => s + r.totalHours, 0)}h
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProxyUserPickerDialog
        open={proxyPickerOpen}
        onOpenChange={setProxyPickerOpen}
        onUserSelected={(u) => {
          setProxyUser(u);
          setEditingEntry(null);
          setEntryDialogOpen(true);
        }}
      />

      <TimeEntryDialog
        open={entryDialogOpen}
        entry={editingEntry}
        targetUser={proxyUser}
        onOpenChange={(open) => {
          setEntryDialogOpen(open);
          if (!open) {
            setEditingEntry(null);
            setProxyUser(null);
          }
        }}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['time-entries'] })}
      />
    </div>
  );
}
