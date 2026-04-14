'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCombobox } from './CalendarCombobox';
import { tasksApi } from '@/lib/api/tasks-client';
import { projectsApi } from '@/lib/api/projects-client';
import { ptoApi, type PtoRequest } from '@/lib/api/pto-client';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
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
import { useAuth } from '@/contexts/auth-context';
import type { Task } from '@/lib/types';
import type { Project } from '@/lib/api/projects-client';
import { cn } from '@/lib/utils';

type CalView = 'month' | 'week' | 'agenda';

export function CalendarView() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const canAssign = hasPermission('tasks:assign');
  const canViewAll = hasPermission('tasks:view_all');
  const canEditTasks = hasPermission('tasks:edit');
  const canEditAllTasks = hasPermission('tasks:edit_all');
  const canEditProjects = hasPermission('projects:edit');
  const canAdvancedFilter = hasPermission('calendar:advanced_filters');

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<CalView>('month');
  const [showTasks, setShowTasks] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showPto, setShowPto] = useState(true);
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProjectEvent, setSelectedProjectEvent] = useState<CalendarEvent | null>(null);

  // Assignees are needed so TaskDialog can render the Assign To picker
  // (and so the Status → Done button is accessible to the assigned user).
  const { data: assignableUsers = [] } = useQuery<UserDirectoryItem[]>({
    queryKey: ['assignable-users', canViewAll, user?.teamId],
    queryFn: async () => {
      const { users: all } = await usersApi.getUsersDirectory();
      return canViewAll
        ? all
        : all.filter((u) => !u.teamId || u.teamId === user?.teamId);
    },
    enabled: canAssign || canAdvancedFilter,
    staleTime: 5 * 60_000,
  });

  const rbcView = activeView;
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getVisibleRange(currentDate, rbcView),
    [currentDate, rbcView],
  );

  const dueAfter = rangeStart.toISOString().split('T')[0];
  const dueBefore = rangeEnd.toISOString().split('T')[0];

  const { data: tasks = [] } = useQuery({
    queryKey: filterProjectId
      ? ['calendar-tasks', 'project', filterProjectId]
      : ['calendar-tasks', dueAfter, dueBefore],
    queryFn: () =>
      filterProjectId
        ? tasksApi.getAll({ entityType: 'project', entityId: filterProjectId })
        : tasksApi.getAll({ dueAfter, dueBefore }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['calendar-projects'],
    queryFn: () => projectsApi.getAll(),
  });

  const { data: ptoRequests = [] } = useQuery<PtoRequest[]>({
    queryKey: ['calendar-pto', dueAfter, dueBefore],
    queryFn: () => ptoApi.getCalendarRequests(dueAfter, dueBefore),
  });

  const projectOptions = useMemo(
    () =>
      (projects as Project[]).map((p) => {
        const prefix = p.jobNumber ? `${p.jobNumber}` : '';
        const label = prefix ? `${prefix} — ${p.name}` : p.name;
        return {
          id: p.id,
          label,
          searchValue: prefix ? `${prefix} ${p.name}` : p.name,
        };
      }),
    [projects],
  );

  const personOptions = useMemo(
    () =>
      assignableUsers.map((u) => ({
        id: u.id,
        label: u.name,
        searchValue: u.name,
      })),
    [assignableUsers],
  );

  const events = useMemo<CalendarEvent[]>(() => {
    const evts: CalendarEvent[] = [];

    if (showTasks) {
      for (const task of tasks) {
        const t = task as Task;
        if (filterProjectId && !(t.entityType === 'project' && t.entityId === filterProjectId)) continue;
        if (filterAssigneeId && t.assignedToId !== filterAssigneeId) continue;
        const ev = taskToEvent(t);
        if (ev) evts.push(ev);
      }
    }

    // Project timeline events are not assignee-specific; hide them when filtering by person
    if (showProjects && !filterAssigneeId) {
      for (const project of projects) {
        if (filterProjectId && (project as Project).id !== filterProjectId) continue;
        evts.push(...projectToEvents(project as Project));
      }
    }

    // PTO is not project-specific; hide it when filtering by project
    if (showPto && !filterProjectId) {
      for (const req of ptoRequests) {
        if (filterAssigneeId && req.userId !== filterAssigneeId) continue;
        evts.push(ptoToEvent(req));
      }
    }

    return evts;
  }, [tasks, projects, ptoRequests, showTasks, showProjects, showPto, filterProjectId, filterAssigneeId]);

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

        {canAdvancedFilter && (
          <div className="flex items-center gap-2">
            <CalendarCombobox
              value={filterProjectId}
              onChange={setFilterProjectId}
              options={projectOptions}
              placeholder="All Projects"
              width="w-[180px]"
            />
            <CalendarCombobox
              value={filterAssigneeId}
              onChange={setFilterAssigneeId}
              options={personOptions}
              placeholder="All People"
              width="w-[160px]"
            />
          </div>
        )}

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
        currentUserId={user?.id}
        canAssign={canAssign}
        assignableUsers={assignableUsers}
        canEdit={
          canEditAllTasks ||
          (canEditTasks &&
            !!selectedTask &&
            !!user?.id &&
            (selectedTask.assignedToId
              ? selectedTask.assignedToId === user.id
              : selectedTask.createdById === user.id))
        }
        onSaved={() => {
          setSelectedTask(null);
          queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
        }}
      />

      <ProjectCalendarPopover
        event={selectedProjectEvent}
        canEdit={canEditProjects}
        onClose={() => setSelectedProjectEvent(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['calendar-projects'] })}
      />
    </div>
  );
}
