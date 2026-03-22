'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/api/projects-client';
import type { UserResponse } from '@/lib/api/users-client';

interface CrewTabProps {
  users: UserResponse[];
  projects: Project[];
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  onProjectClick: (project: Project) => void;
}

function formatDay(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function dateWithinRange(day: Date, start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T23:59:59');
  return day >= s && day <= e;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function shiftWeek(date: Date, direction: 1 | -1): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + direction * 7);
  return d;
}

function goToToday(): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function CrewTab({ users, projects, weekStart, onWeekChange, onProjectClick }: CrewTabProps) {
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const end = days[6];
    return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [days, weekStart]);

  function getUserProjects(userId: string): Project[] {
    return projects.filter((p) =>
      p.assignments?.some((a) => a.userId === userId),
    );
  }

  function getRoleLabel(project: Project, userId: string): string {
    return project.assignments?.find((a) => a.userId === userId)?.role ?? '';
  }

  return (
    <div className="space-y-3">
      {/* Week nav */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => onWeekChange(shiftWeek(weekStart, -1))}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
          onClick={() => onWeekChange(goToToday())}>
          Today
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => onWeekChange(shiftWeek(weekStart, 1))}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <span className="text-sm font-medium text-foreground">{weekLabel}</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36 min-w-[144px]">Team Member</TableHead>
              {days.map((d) => (
                <TableHead
                  key={d.toISOString()}
                  className={cn('text-center text-xs', isToday(d) && 'bg-accent-red/10 font-semibold')}>
                  {formatDay(d)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const userProjects = getUserProjects(user.id);
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-sm">
                      <div>{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.role}</div>
                    </TableCell>
                    {days.map((day) => {
                      const active = userProjects.filter((p) =>
                        dateWithinRange(day, p.startDate, p.estimatedDueDate),
                      );
                      return (
                        <TableCell
                          key={day.toISOString()}
                          className={cn('align-top text-center p-1', isToday(day) && 'bg-accent-red/5')}>
                          <div className="flex flex-col gap-0.5">
                            {active.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => onProjectClick(p)}
                                title={`${p.name} (${getRoleLabel(p, user.id)})`}
                                className="block w-full truncate rounded px-1 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors text-left">
                                {p.name}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  );
}
