'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { UmbrellaOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usersApi } from '@/lib/api/users-client';
import { ptoApi } from '@/lib/api/pto-client';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { WeeklySheetGrid } from './WeeklySheetGrid';
import type { CellEntry } from './WeeklySheetCell';

const FILTER_STORAGE_KEY = 'apex_weekly_sheet_status_filter';

interface ProjectRow {
  project: { id: string; name: string; status: string; jobNumber: string | null } | null;
  days: Record<string, { hours: number; entries: CellEntry[] }>;
  totalHours: number;
}

interface TimesheetByProjectData {
  startDate: string;
  endDate: string;
  rows: ProjectRow[];
  dailyTotals: Record<string, number>;
  grandTotal: number;
}

interface ExtraProject {
  id: string;
  name: string;
  status: string;
  jobNumber: string | null;
}

function localDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return localDateString(d);
}

function formatWeekLabel(startDate: string, endDate: string): string {
  const s = new Date(startDate + 'T12:00:00');
  const e = new Date(endDate + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

async function fetchTimesheetByProject(startDate: string, userId: string): Promise<TimesheetByProjectData> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(
    `${API_URL}/time-tracking/timesheet/by-project?startDate=${startDate}&userId=${userId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function WeeklySheetTab() {
  const { user, hasPermission } = useAuth();
  const canEnterForOthers = hasPermission('time_tracking:enter_for_others');
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedUserId, setSelectedUserId] = useState(user?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    try { return localStorage.getItem(FILTER_STORAGE_KEY) ?? 'Active'; } catch { return 'Active'; }
  });
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
  const [extraProjects, setExtraProjects] = useState<ExtraProject[]>([]);

  const effectiveUserId = selectedUserId || user?.id || '';

  const { data: timesheetData, isLoading } = useQuery<TimesheetByProjectData>({
    queryKey: ['timesheet-by-project', weekStart, effectiveUserId],
    queryFn: () => fetchTimesheetByProject(weekStart, effectiveUserId),
    enabled: !!effectiveUserId && !!weekStart,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => usersApi.getUsersDirectory(),
    enabled: canEnterForOthers,
  });

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
    setWeekStart(localDateString(d));
    setExtraProjects([]);
  };

  const handleUserChange = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setExtraProjects([]);
  }, []);

  const handleSaveFilter = () => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, pendingStatusFilter); } catch {}
    setStatusFilter(pendingStatusFilter);
    toast.success('Filter saved');
  };

  const handleAddProject = useCallback((project: { id: string; name: string; status: string; jobNumber: string | null }) => {
    setExtraProjects((prev) => prev.some((p) => p.id === project.id) ? prev : [...prev, project]);
  }, []);

  const handleUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['timesheet-by-project'] });
  }, [queryClient]);

  // PTO for the current week
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart + 'T12:00:00');
    end.setDate(end.getDate() + 6);
    return localDateString(end);
  }, [weekStart]);

  const { data: ptoDays = [] } = useQuery({
    queryKey: ['pto-my-week', weekStart, weekEnd],
    queryFn: async () => {
      const requests = await ptoApi.getMyRequests();
      return requests.filter(
        (r) =>
          r.status === 'APPROVED' &&
          r.startDate <= weekEnd + 'T23:59:59' &&
          r.endDate >= weekStart + 'T00:00:00',
      );
    },
    enabled: !!effectiveUserId,
  });

  // Remove extra projects that now appear in fetched data (they got their first entry)
  const fetchedProjectIds = new Set(timesheetData?.rows.map((r) => r.project?.id) ?? []);
  const visibleExtraProjects = extraProjects.filter((p) => !fetchedProjectIds.has(p.id));

  const viewingOtherUser = effectiveUserId !== user?.id;
  const canEdit = !viewingOtherUser || canEnterForOthers;

  const targetUser = viewingOtherUser
    ? (usersData?.users.find((u) => u.id === effectiveUserId) ?? null)
    : null;

  const teamMembers = usersData?.users ?? [];

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-end gap-3">
        {/* User picker — only for users who can enter for others */}
        {canEnterForOthers && (
          <div className="space-y-1">
            <Label className="text-xs">Viewing</Label>
            <SearchableSelect
              value={selectedUserId}
              onValueChange={handleUserChange}
              placeholder="Select user…"
              searchPlaceholder="Search by name…"
              emptyMessage="No users found."
              className="w-48"
              options={[
                { value: user?.id ?? '', label: `${user?.name ?? 'Me'} (me)` },
                ...teamMembers
                  .filter((u) => u.id !== user?.id)
                  .map((u) => ({ value: u.id, label: u.name, keywords: u.role })),
              ]}
            />
          </div>
        )}

        {/* Status filter */}
        <div className="space-y-1">
          <Label className="text-xs">Project status</Label>
          <div className="flex gap-1.5">
            <Select value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active only</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs"
              onClick={handleSaveFilter}
              disabled={pendingStatusFilter === statusFilter}
            >
              Save
            </Button>
          </div>
        </div>

        {/* Week navigation — pushed to the right */}
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[170px] text-center">
            {timesheetData
              ? formatWeekLabel(timesheetData.startDate, timesheetData.endDate)
              : '…'}
          </span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs ml-1"
            onClick={() => { setWeekStart(getWeekStart(new Date())); setExtraProjects([]); }}
          >
            Today
          </Button>
        </div>
      </div>

      {/* PTO banner */}
      {ptoDays.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <UmbrellaOff className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            You have approved PTO this week:{' '}
            {ptoDays.map((r) => `${r.hours}h ${r.type.charAt(0) + r.type.slice(1).toLowerCase()}`).join(', ')}
          </span>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <p className="py-6 text-sm text-muted-foreground text-center">Loading…</p>
      ) : (
        <WeeklySheetGrid
          rows={timesheetData?.rows ?? []}
          extraRows={visibleExtraProjects}
          weekDays={weekDays}
          dailyTotals={timesheetData?.dailyTotals ?? {}}
          grandTotal={timesheetData?.grandTotal ?? 0}
          targetUser={targetUser ? { id: targetUser.id, name: targetUser.name, role: targetUser.role } : null}
          canEdit={canEdit}
          statusFilter={statusFilter}
          onUpdated={handleUpdated}
          onAddProject={handleAddProject}
        />
      )}
    </div>
  );
}
