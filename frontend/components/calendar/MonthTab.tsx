'use client';

import { useCallback } from 'react';
import { Calendar, Views } from 'react-big-calendar';
import { localizer, eventPropGetter, makeComponents } from './calendarShared';
import type { CalendarEvent } from './calendarUtils';

interface MonthTabProps {
  events: CalendarEvent[];
  currentDate: Date;
  onNavigate: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function MonthTab({ events, currentDate, onNavigate, onEventClick }: MonthTabProps) {
  const handleSelectEvent = useCallback(
    (event: object) => onEventClick(event as CalendarEvent),
    [onEventClick],
  );

  return (
    <div className="rbc-calendar-wrapper h-[calc(100vh-220px)] min-h-[500px]">
      <Calendar<CalendarEvent, object>
        localizer={localizer}
        events={events}
        view={Views.MONTH}
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
