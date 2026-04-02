import type { Task } from '@/lib/types';
import type { Project } from '@/lib/api/projects-client';

export type CalendarEventKind =
  | 'task'
  | 'project-span'
  | 'project-milestone'
  | 'project-due';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  kind: CalendarEventKind;
  sourceId: string;
  color: string;
  priority?: string;
  status?: string;
  resource?: Task | Project;
}

// ── Color helpers ───────────────────────────────────────────────────────────

export function getTaskColor(task: Task): string {
  if (task.status === 'DONE') return '#bbf7d0'; // green-200
  switch (task.priority) {
    case 'URGENT':
      return '#fca5a5'; // red-300
    case 'HIGH':
      return '#fdba74'; // orange-300
    case 'MEDIUM':
      return '#fde68a'; // amber-200
    default:
      return '#e2e8f0'; // slate-200
  }
}

// ── Task → CalendarEvent ────────────────────────────────────────────────────

export function taskToEvent(task: Task): CalendarEvent | null {
  if (!task.dueDate) return null;

  const start = new Date(task.dueDate.slice(0, 10) + 'T00:00:00');
  const end = new Date(task.dueDate.slice(0, 10) + 'T23:59:59');

  return {
    id: `task-${task.id}`,
    title: task.title,
    start,
    end,
    allDay: true,
    kind: 'task',
    sourceId: task.id,
    color: getTaskColor(task),
    priority: task.priority,
    status: task.status,
    resource: task,
  };
}

// ── Project → CalendarEvent[] ───────────────────────────────────────────────

function toLocalDate(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T00:00:00');
}

export function projectToEvents(project: Project): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (project.startDate && project.estimatedDueDate) {
    const start = toLocalDate(project.startDate);
    const end = toLocalDate(project.estimatedDueDate);
    end.setHours(23, 59, 59, 999);
    events.push({
      id: `project-span-${project.id}`,
      title: project.name,
      start,
      end,
      allDay: true,
      kind: 'project-span',
      sourceId: project.id,
      color: '#bfdbfe', // blue-200
      resource: project,
    });
  } else if (!project.startDate && project.estimatedDueDate) {
    const d = toLocalDate(project.estimatedDueDate);
    events.push({
      id: `project-due-${project.id}`,
      title: `Due: ${project.name}`,
      start: d,
      end: d,
      allDay: true,
      kind: 'project-due',
      sourceId: project.id,
      color: '#fed7aa', // orange-200
      resource: project,
    });
  }

  if (project.completedDate) {
    const d = toLocalDate(project.completedDate);
    events.push({
      id: `project-milestone-${project.id}`,
      title: `✓ ${project.name}`,
      start: d,
      end: d,
      allDay: true,
      kind: 'project-milestone',
      sourceId: project.id,
      color: '#e9d5ff', // purple-200
      resource: project,
    });
  }

  return events;
}

// ── Visible date range helper ────────────────────────────────────────────────

export function getVisibleRange(
  date: Date,
  view: 'month' | 'week' | 'agenda',
): { start: Date; end: Date } {
  const d = new Date(date);

  if (view === 'week') {
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === 'agenda') {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setDate(d.getDate() + 30);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
