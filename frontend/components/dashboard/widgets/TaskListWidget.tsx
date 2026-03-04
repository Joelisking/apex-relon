'use client';

import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks-client';
import { CheckCircle2, Clock, ListTodo, ExternalLink } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { Task, TaskSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';

interface Props {
  widget: WidgetConfig;
}

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'text-red-700 bg-red-50 border-red-200',
  HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-muted-foreground bg-muted border-border/60',
};

export function TaskListWidget({ widget }: Props) {
  const title = widget.config.title || 'My Tasks';

  const { data: summary } = useQuery({
    queryKey: ['tasks-summary'],
    queryFn: () => tasksApi.getSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dueBefore = tomorrow.toISOString();

  const { data: urgentTasks = [], isLoading } = useQuery({
    queryKey: ['tasks-urgent', dueBefore],
    queryFn: () => tasksApi.getAll({ status: 'OPEN', dueBefore }),
    staleTime: 2 * 60 * 1000,
  });

  const displayTasks = (urgentTasks as Task[]).slice(0, 5);

  const typedSummary = summary as TaskSummary | undefined;

  const statsBar = [
    { label: 'Overdue',   value: typedSummary?.overdue  ?? 0, valueClass: 'text-destructive' },
    { label: 'Due Today', value: typedSummary?.dueToday ?? 0, valueClass: 'text-amber-600'  },
    { label: 'Upcoming',  value: typedSummary?.upcoming ?? 0, valueClass: 'text-foreground'  },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
            {title}
          </span>
        </div>
        <a
          href="/tasks"
          className="text-[10px] text-muted-foreground/50 hover:text-foreground flex items-center gap-1 transition-colors">
          View all <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-border/60 shrink-0">
        {statsBar.map((stat) => (
          <div key={stat.label} className="relative bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium mb-1">
              {stat.label}
            </p>
            <p className={cn('text-[22px] font-bold tabular-nums leading-none', stat.valueClass)}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground/50">Loading...</p>
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <p className="text-xs text-muted-foreground">
            {typedSummary && typedSummary.upcoming > 0
              ? 'No urgent tasks'
              : 'All caught up!'}
          </p>
          {typedSummary && typedSummary.upcoming > 0 && (
            <p className="text-[10px] text-muted-foreground/50">
              {typedSummary.upcoming} upcoming
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-border/40">
          {displayTasks.map((task: Task) => {
            const isOverdue =
              task.dueDate ? isPast(new Date(task.dueDate)) : false;
            return (
              <div
                key={task.id}
                className="px-4 py-2.5 hover:bg-muted/30 transition-colors flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{task.title}</p>
                  {task.dueDate && (
                    <p
                      className={cn(
                        'text-[10px] flex items-center gap-1 mt-0.5',
                        isOverdue ? 'text-destructive font-medium' : 'text-amber-600',
                      )}>
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(task.dueDate), 'MMM d')}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium shrink-0 mt-0.5',
                    PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.LOW,
                  )}>
                  {task.priority.charAt(0) +
                    task.priority.slice(1).toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
