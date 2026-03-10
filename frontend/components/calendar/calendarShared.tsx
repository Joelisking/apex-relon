'use client';

import { dateFnsLocalizer, type Components } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from './calendarUtils';

// ── Localizer ─────────────────────────────────────────────────────────────────

export const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

// ── Event pill ────────────────────────────────────────────────────────────────

export function EventPill({ event }: { event: CalendarEvent }) {
  const textColor =
    event.kind === 'task' && event.priority === 'URGENT'
      ? 'text-red-900'
      : event.kind === 'task' && event.priority === 'HIGH'
        ? 'text-orange-900'
        : event.kind === 'task' && event.priority === 'MEDIUM'
          ? 'text-amber-900'
          : event.kind === 'task' && event.status === 'DONE'
            ? 'text-green-900'
            : event.kind === 'project-span'
              ? 'text-blue-900'
              : event.kind === 'project-milestone'
                ? 'text-purple-900'
                : 'text-slate-800';

  return (
    <span
      className={cn(
        'block truncate rounded px-1 py-0.5 text-[11px] font-medium leading-tight',
        textColor,
      )}
      style={{ backgroundColor: event.color }}>
      {event.title}
    </span>
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

export function makeComponents(): Components<CalendarEvent, object> {
  return {
    toolbar: CalendarNavToolbar as Components<CalendarEvent, object>['toolbar'],
    event: ({ event }) => <EventPill event={event} />,
  };
}
