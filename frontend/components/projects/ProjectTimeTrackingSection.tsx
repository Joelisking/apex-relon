'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { TimeEntryDialog, type TimeEntry } from '@/components/time-tracking/TimeEntryDialog';
import { apiFetch } from '@/lib/api/client';
import { workCodesApi, type WorkCode } from '@/lib/api/work-codes-client';

interface TimeEntryWithCode extends TimeEntry {
  projectId: string;
  workCode?: Pick<WorkCode, 'id' | 'code' | 'name' | 'parentCode' | 'isMainTask'>;
  user: { id: string; name: string };
}

interface ProjectTimeTrackingSectionProps {
  projectId: string;
  canLogTime: boolean;
}

export function ProjectTimeTrackingSection({ projectId, canLogTime }: ProjectTimeTrackingSectionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery<TimeEntryWithCode[]>({
    queryKey: ['project-time-entries', projectId],
    queryFn: () => apiFetch<TimeEntryWithCode[]>(`/time-tracking/entries?projectId=${projectId}&limit=500`),
  });

  // Work codes used as a lookup for main task names in the rollup
  const { data: allWorkCodes = [] } = useQuery<WorkCode[]>({
    queryKey: ['work-codes'],
    queryFn: () => workCodesApi.getAll(),
  });

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['project-time-entries', projectId] });
  };

  const handleLogTime = () => {
    setEditEntry(null);
    setDialogOpen(true);
  };

  // Build rollup: group entries by main task code
  const rollup = buildRollup(entries, allWorkCodes);

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Time Tracking</h3>
        {canLogTime && (
          <Button size="sm" variant="outline" onClick={handleLogTime}>
            <Plus className="h-4 w-4 mr-1" />
            Log Time
          </Button>
        )}
      </div>

      {/* Summary by main task */}
      {rollup.length > 0 && (
        <div className="space-y-3">
          {rollup.map(({ divisionLabel, groups }) => (
            <div key={divisionLabel}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {divisionLabel}
              </p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map(({ mainTaskLabel, mainCode, hours, subtaskRows }) => (
                      <React.Fragment key={mainCode}>
                        <TableRow className="bg-muted/40">
                          <TableCell className="font-medium text-sm">{mainTaskLabel}</TableCell>
                          <TableCell className="text-right text-sm font-semibold tabular-nums">{hours.toFixed(2)}</TableCell>
                        </TableRow>
                        {subtaskRows.map((row) => (
                          <TableRow key={row.label}>
                            <TableCell className="pl-8 text-sm text-muted-foreground">{row.label}</TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{row.hours.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full entry log */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">All Entries</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
        ) : entries.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={canLogTime ? 'cursor-pointer hover:bg-muted/30' : ''}
                    onClick={canLogTime ? () => { setEditEntry(entry as TimeEntry); setDialogOpen(true); } : undefined}
                  >
                    <TableCell className="text-sm">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {entry.workCode ? entry.workCode.code : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.workCode ? entry.workCode.name : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{entry.user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.description || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">
                      {entry.hours.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-lg">
            No time entries yet
          </p>
        )}
      </div>

      {/* Footer total */}
      {entries.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total logged:</span>
          <span className="text-sm font-semibold tabular-nums">{totalHours.toFixed(2)} hrs</span>
        </div>
      )}

      <TimeEntryDialog
        open={dialogOpen}
        entry={editEntry}
        initialProjectId={projectId}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />
    </div>
  );
}

// ─── Rollup helpers ───────────────────────────────────────────────────────────

const DIVISION_LABELS: Record<number, string> = {
  5000: 'Engineering Services',
  6000: 'Stormwater Inspections',
  7000: 'Construction Inspection',
};

function buildRollup(entries: TimeEntryWithCode[], allCodes: WorkCode[]) {
  const codeByCode = new Map(allCodes.map((c) => [c.code, c]));

  // Only entries with a work code contribute to the rollup
  const coded = entries.filter((e) => e.workCode);

  // Group by division
  const byDivision: Record<number, TimeEntryWithCode[]> = {};
  for (const e of coded) {
    const div = Math.floor(e.workCode!.code / 1000) * 1000;
    if (!byDivision[div]) byDivision[div] = [];
    byDivision[div].push(e);
  }

  return Object.entries(byDivision).map(([divStr, divEntries]) => {
    const division = parseInt(divStr, 10);

    // Group by main task code
    const byMainCode: Record<number, { subtask?: string; hours: number }[]> = {};

    for (const e of divEntries) {
      const wc = e.workCode!;
      const mainCode = wc.isMainTask ? wc.code : (wc.parentCode ?? wc.code);
      if (!byMainCode[mainCode]) byMainCode[mainCode] = [];
      byMainCode[mainCode].push({
        subtask: !wc.isMainTask ? `${wc.code} – ${wc.name}` : undefined,
        hours: e.hours,
      });
    }

    const groups = Object.entries(byMainCode).map(([codeStr, rows]) => {
      const mainCode = parseInt(codeStr, 10);
      const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);

      // Look up main task name from the full work codes list (handles subtask-only entries)
      const mainTaskWc = codeByCode.get(mainCode);
      const mainTaskLabel = mainTaskWc ? `${mainTaskWc.code} – ${mainTaskWc.name}` : `${mainCode}`;

      // Group subtask hours
      const subtaskMap: Record<string, number> = {};
      for (const r of rows) {
        if (r.subtask) {
          subtaskMap[r.subtask] = (subtaskMap[r.subtask] ?? 0) + r.hours;
        }
      }

      return {
        mainCode,
        mainTaskLabel,
        hours: totalHours,
        subtaskRows: Object.entries(subtaskMap).map(([label, hours]) => ({ label, hours })),
      };
    });

    return {
      divisionLabel: DIVISION_LABELS[division] ?? `Division ${division}`,
      groups,
    };
  });
}
