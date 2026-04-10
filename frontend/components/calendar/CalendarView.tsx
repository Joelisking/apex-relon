'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tasksApi } from '@/lib/api/tasks-client';
import { projectsApi } from '@/lib/api/projects-client';
import { ptoApi } from '@/lib/api/pto-client';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { ProjectCalendarPopover } from './ProjectCalendarPopover';
import { MonthTab } from './MonthTab';
import { WeekTab } from './WeekTab';
import { AgendaTab } from './AgendaTab';
import {
  taskToEvent,
  projectToEvents,
  ptoToEvent,
  getVisibleRange,
  type CalendarEvent,
} from './calendarUtils';
import type { Task } from '@/lib/types';
import type { Project } from '@/lib/api/projects-client';
import { cn } from '@/lib/utils';

type CalView = 'month' | 'week' | 'agenda';

export function CalendarView() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<CalView>('month');
  const [showTasks, setShowTasks] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showPto, setShowPto] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectEvent, setSelectedProjectEvent] = useState<CalendarEvent | null>(null);

  const rbcView = activeView;
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getVisibleRange(currentDate, rbcView),
    [currentDate, rbcView],
  );

  const dueAfter = rangeStart.toISOString().split('T')[0];
  const dueBefore = rangeEnd.toISOString().split('T')[0];

  const { data: tasks = [] } = useQuery({
    queryKey: ['calendar-tasks', dueAfter, dueBefore],
    queryFn: () => tasksApi.getAll({ dueAfter, dueBefore }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['calendar-projects'],
    queryFn: () => projectsApi.getAll(),
  });

  const { data: ptoRequests = [] } = useQuery({
    queryKey: ['calendar-pto', dueAfter, dueBefore],
    queryFn: () => ptoApi.getCalendarRequests(dueAfter, dueBefore),
  });

  const events = useMemo<CalendarEvent[]>(() => {
    const evts: CalendarEvent[] = [];
    if (showTasks) {
      for (const task of tasks) {
        const ev = taskToEvent(task as Task);
        if (ev) evts.push(ev);
      }
    }
    if (showProjects) {
      for (const project of projects) {
        evts.push(...projectToEvents(project as Project));
      }
    }
    if (showPto) {
      for (const req of ptoRequests) {
        evts.push(ptoToEvent(req));
      }
    }
    return evts;
  }, [tasks, projects, ptoRequests, showTasks, showProjects, showPto]);

  function handleEventClick(event: CalendarEvent) {
    if (event.kind === 'task') {
      setSelectedTask(event.resource as Task);
    } else if (event.kind === 'project-due') {
      setSelectedProjectEvent(event);
    } else {
      router.push(`/projects/${event.sourceId}`);
    }
  }

  const sharedTabProps = {
    events,
    currentDate,
    onNavigate: setCurrentDate,
    onEventClick: handleEventClick,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Calendar</h1>
          <p className="text-muted-foreground hidden sm:block">
            Task due dates, project due dates, and timelines
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as CalView)}>
          <TabsList className="h-8">
            <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
            <TabsTrigger value="agenda" className="text-xs px-3">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTasks((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              showTasks
                ? 'border-amber-300 bg-amber-100 text-amber-900'
                : 'border-border bg-muted text-muted-foreground',
            )}>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Tasks
          </button>
          <button
            onClick={() => setShowProjects((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              showProjects
                ? 'border-blue-300 bg-blue-100 text-blue-900'
                : 'border-border bg-muted text-muted-foreground',
            )}>
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            Projects
          </button>
          <button
            onClick={() => setShowPto((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              showPto
                ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                : 'border-border bg-muted text-muted-foreground',
            )}>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            PTO
          </button>
        </div>

        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          Tasks without a due date are not shown
        </div>
      </div>

      {/* Active tab */}
      {activeView === 'month' && <MonthTab {...sharedTabProps} />}
      {activeView === 'week' && <WeekTab {...sharedTabProps} />}
      {activeView === 'agenda' && <AgendaTab {...sharedTabProps} />}

      <TaskDialog
        open={selectedTask !== null}
        onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
        editingTask={selectedTask}
        onSaved={() => {
          setSelectedTask(null);
          queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
        }}
      />

      <ProjectCalendarPopover
        event={selectedProjectEvent}
        onClose={() => setSelectedProjectEvent(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['calendar-projects'] })}
      />
    </div>
  );
}
