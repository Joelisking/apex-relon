'use client';

import { dateFnsLocalizer, type Components } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight, User, FolderKanban, Clock, Tag, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './calendarUtils';
import type { Task } from '@/lib/types';
import type { Project } from '@/lib/api/projects-client';

// ── Localizer ─────────────────────────────────────────────────────────────────

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

// ── Text color helper ─────────────────────────────────────────────────────────

function eventTextColor(event: CalendarEvent): string {
  if (event.kind === 'task') {
    if (event.status === 'DONE') return 'text-green-900';
    if (event.priority === 'URGENT') return 'text-red-900';
    if (event.priority === 'HIGH') return 'text-orange-900';
    if (event.priority === 'MEDIUM') return 'text-amber-900';
    return 'text-slate-800';
  }
  if (event.kind === 'project-milestone') return 'text-purple-900';
  if (event.kind === 'project-due') return 'text-orange-900';
  return 'text-slate-800';
}

// ── Compact pill (month / agenda) ─────────────────────────────────────────────

export function EventPill({ event }: { event: CalendarEvent }) {
  return (
    <span
      className={cn(
        'block truncate rounded px-1 py-0.5 text-[11px] font-medium leading-tight',
        eventTextColor(event),
      )}
      style={{ backgroundColor: event.color }}>
      {event.kind === 'task' && event.jobNumber && (
        <span className="opacity-50 mr-1">{event.jobNumber} ·</span>
      )}
      {event.title}
    </span>
  );
}

// ── Rich pill (week view) ─────────────────────────────────────────────────────

function WeekEventPill({ event }: { event: CalendarEvent }) {
  const textColor = eventTextColor(event);
  const task = event.kind === 'task' ? (event.resource as Task | undefined) : undefined;
  const project =
    event.kind === 'project-due' || event.kind === 'project-milestone'
      ? (event.resource as Project | undefined)
      : undefined;

  const priorityLabel =
    task && task.priority && task.priority !== 'MEDIUM' && task.status !== 'DONE'
      ? task.priority.charAt(0) + task.priority.slice(1).toLowerCase()
      : null;

  return (
    <div
      className={cn('h-full w-full overflow-hidden flex flex-col gap-0.5 px-1.5 py-1', textColor)}>
      {/* Title */}
      <p className="text-[11px] font-semibold leading-tight line-clamp-2 break-words">
        {event.title}
      </p>

      {/* Task detail rows */}
      {task && (
        <>
          {task.assignedTo && (
            <div className="flex items-center gap-1 min-w-0">
              <User className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="text-[10px] leading-tight truncate opacity-80">
                {task.assignedTo.name}
              </span>
            </div>
          )}
          {(event.jobNumber || task.entityName) && (
            <div className="flex items-center gap-1 min-w-0">
              <FolderKanban className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="text-[10px] leading-tight truncate opacity-80">
                {event.jobNumber && task.entityName
                  ? `${event.jobNumber} — ${task.entityName}`
                  : event.jobNumber ?? task.entityName}
              </span>
            </div>
          )}
          {task.taskType && (
            <div className="flex items-center gap-1 min-w-0">
              <Tag className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="text-[10px] leading-tight truncate opacity-70">
                {task.taskType.name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-auto flex-wrap">
            {task.estimatedHours && task.estimatedHours > 0 && (
              <div className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5 opacity-50" />
                <span className="text-[10px] opacity-70">{task.estimatedHours}h</span>
              </div>
            )}
            {priorityLabel && (
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">
                {priorityLabel}
              </span>
            )}
          </div>
        </>
      )}

      {/* Project event detail rows */}
      {project && (
        <>
          {(project as Project & { client?: { name: string } }).client?.name && (
            <div className="flex items-center gap-1 min-w-0">
              <Briefcase className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="text-[10px] leading-tight truncate opacity-80">
                {(project as Project & { client?: { name: string } }).client!.name}
              </span>
            </div>
          )}
          {(project as Project & { jobNumber?: string }).jobNumber && (
            <div className="flex items-center gap-1 min-w-0">
              <Tag className="h-2.5 w-2.5 shrink-0 opacity-60" />
              <span className="text-[10px] leading-tight truncate opacity-70">
                {(project as Project & { jobNumber?: string }).jobNumber}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Nav toolbar ───────────────────────────────────────────────────────────────

function agendaWeekLabel(date: Date): string {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = String(start.getDate()).padStart(2, '0');
  const endDay = String(end.getDate()).padStart(2, '0');

  return startMonth === endMonth
    ? `${startMonth} ${startDay} – ${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function CalendarNavToolbar({ label, view, date, onNavigate }: {
  label: string;
  view: string;
  date: Date;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
}) {
  const displayLabel = view === 'agenda' ? agendaWeekLabel(date) : label;

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => onNavigate('PREV')}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
          onClick={() => onNavigate('TODAY')}>
          Today
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7"
          onClick={() => onNavigate('NEXT')}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span className="text-sm font-medium text-foreground">{displayLabel}</span>
    </div>
  );
}

// ── Shared event prop getter ──────────────────────────────────────────────────

export function eventPropGetter(event: object) {
  const ev = event as CalendarEvent;
  return {
    style: {
      backgroundColor: ev.color,
      border: 'none',
      borderRadius: '4px',
      padding: '0',
    },
  };
}

// ── Shared components map factory ─────────────────────────────────────────────

export function makeComponents(view?: 'week' | 'month' | 'agenda'): Components<CalendarEvent, object> {
  return {
    toolbar: CalendarNavToolbar as Components<CalendarEvent, object>['toolbar'],
    event: ({ event }) =>
      view === 'week' ? <WeekEventPill event={event} /> : <EventPill event={event} />,
  };
}
