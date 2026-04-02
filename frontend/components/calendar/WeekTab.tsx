'use client';

import { useCallback } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { localizer, eventPropGetter, makeComponents } from './calendarShared';
import type { CalendarEvent } from './calendarUtils';

interface WeekTabProps {
  events: CalendarEvent[];
  currentDate: Date;
  onNavigate: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function WeekTab({ events, currentDate, onNavigate, onEventClick }: WeekTabProps) {
  const handleSelectEvent = useCallback(
    (event: object) => onEventClick(event as CalendarEvent),
    [onEventClick],
  );

  return (
    <div className="rbc-calendar-wrapper h-[calc(100dvh-220px)] min-h-[500px]">
      <Calendar<CalendarEvent, object>
        localizer={localizer}
        events={events}
        view={Views.WEEK}
        date={currentDate}
        onNavigate={onNavigate}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventPropGetter}
        components={makeComponents()}
        popup
        showAllEvents
        style={{ height: '100%' }}
      />
    </div>
  );
}
