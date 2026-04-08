'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WeeklySheetCell, type CellEntry } from './WeeklySheetCell';
import { WeeklySheetAddProject } from './WeeklySheetAddProject';

interface ProjectRow {
  project: { id: string; name: string; status: string; jobNumber: string | null } | null;
  days: Record<string, { hours: number; entries: CellEntry[] }>;
  totalHours: number;
}

interface ExtraProject {
  id: string;
  name: string;
  status: string;
  jobNumber: string | null;
}

interface WeeklySheetGridProps {
  rows: ProjectRow[];
  extraRows: ExtraProject[];
  weekDays: string[];
  dailyTotals: Record<string, number>;
  grandTotal: number;
  targetUser: { id: string; name: string } | null;
  canEdit: boolean;
  statusFilter: string;
  onUpdated: () => void;
  onAddProject: (project: { id: string; name: string; status: string; jobNumber: string | null }) => void;
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function formatTotalHours(h: number): string {
  if (h === 0) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function WeeklySheetGrid({
  rows,
  extraRows,
  weekDays,
  dailyTotals,
  grandTotal,
  targetUser,
  canEdit,
  statusFilter,
  onUpdated,
  onAddProject,
}: WeeklySheetGridProps) {
  const existingProjectIds = new Set([
    ...rows.map((r) => r.project?.id ?? '__none__'),
    ...extraRows.map((r) => r.id),
  ]);

  const renderProjectCell = (projectId: string, day: string, cell?: { hours: number; entries: CellEntry[] }) => (
    <TableCell key={day} className="text-center p-1">
      <WeeklySheetCell
        hours={cell?.hours ?? 0}
        entries={cell?.entries ?? []}
        projectId={projectId}
        date={day}
        targetUser={targetUser}
        canEdit={canEdit}
        onUpdated={onUpdated}
      />
    </TableCell>
  );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-52 min-w-[160px]">Project</TableHead>
            {weekDays.map((day) => {
              const { weekday, date } = formatDayHeader(day);
              return (
                <TableHead key={day} className="text-center w-20">
                  <div className="flex flex-col items-center leading-tight">
                    <span>{weekday}</span>
                    <span className="text-muted-foreground font-normal text-xs">{date}</span>
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="text-right w-20 min-w-[64px]">Total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => {
            const pid = row.project?.id ?? '__none__';
            return (
              <TableRow key={pid}>
                <TableCell className="py-1 align-middle">
                  <div className="font-medium text-sm leading-tight">{row.project?.name ?? '(No Project)'}</div>
                  {row.project?.jobNumber && (
                    <div className="text-xs text-muted-foreground">{row.project.jobNumber}</div>
                  )}
                </TableCell>
                {weekDays.map((day) => renderProjectCell(pid, day, row.days[day]))}
                <TableCell className="text-right font-mono text-sm font-semibold py-1">
                  {formatTotalHours(row.totalHours)}
                </TableCell>
              </TableRow>
            );
          })}

          {extraRows.map((proj) => (
            <TableRow key={proj.id}>
              <TableCell className="py-1 align-middle">
                <div className="font-medium text-sm leading-tight">{proj.name}</div>
                {proj.jobNumber && (
                  <div className="text-xs text-muted-foreground">{proj.jobNumber}</div>
                )}
              </TableCell>
              {weekDays.map((day) => renderProjectCell(proj.id, day, undefined))}
              <TableCell className="text-right font-mono text-sm text-muted-foreground py-1">—</TableCell>
            </TableRow>
          ))}

          {/* Totals row */}
          <TableRow className="bg-muted/30 border-t-2">
            <TableCell className="py-1">
              {canEdit && (
                <WeeklySheetAddProject
                  existingProjectIds={existingProjectIds}
                  statusFilter={statusFilter}
                  onAdd={onAddProject}
                />
              )}
            </TableCell>
            {weekDays.map((day) => {
              const total = dailyTotals[day] ?? 0;
              return (
                <TableCell key={day} className="text-center font-mono text-sm font-medium py-1">
                  {total > 0 ? formatTotalHours(total) : <span className="text-muted-foreground">—</span>}
                </TableCell>
              );
            })}
            <TableCell className="text-right font-mono text-sm font-semibold py-1">
              {formatTotalHours(grandTotal)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
