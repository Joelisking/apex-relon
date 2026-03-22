'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  AlertTriangle,
  User,
  ClipboardList,
  Link2,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { tasksApi } from '@/lib/api/tasks-client';
import { usersApi } from '@/lib/api/users-client';
import type { Task } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { TaskDialog } from './TaskDialog';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { UncompleteTaskDialog } from './UncompleteTaskDialog';

const PRIORITY_META: Record<
  string,
  { label: string; color: string }
> = {
  LOW: { label: 'Low', color: 'text-muted-foreground' },
  MEDIUM: { label: 'Medium', color: 'text-amber-600' },
  HIGH: { label: 'High', color: 'text-orange-600' },
  URGENT: { label: 'Urgent', color: 'text-destructive' },
};

function canCompleteTask(task: Task, currentUserId?: string): boolean {
  if (!currentUserId) return false;
  if (task.assignedToId) return task.assignedToId === currentUserId;
  return task.createdById === currentUserId;
}

interface LinkedTasksSectionProps {
  entityType: string;
  entityId: string;
}

export function LinkedTasksSection({
  entityType,
  entityId,
}: LinkedTasksSectionProps) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [uncompleteTarget, setUncompleteTarget] = useState<Task | null>(null);

  const canAssign = hasPermission('tasks:assign');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['entity-tasks', entityType, entityId],
    queryFn: () => tasksApi.getByEntity(entityType, entityId),
    enabled: !!entityId,
  });

  const { data: usersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getUsersDirectory(),
    enabled: canAssign,
  });
  const assignableUsers = usersData?.users ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['entity-tasks', entityType, entityId],
    });

  const handleCompleteConfirm = async (completionNote: string) => {
    if (!completeTarget) return;
    try {
      await tasksApi.complete(completeTarget.id, completionNote);
      setCompleteTarget(null);
      invalidate();
    } catch (err) {
      console.error('Failed to complete task', err);
      toast.error('Failed to complete task');
    }
  };

  const handleUncompleteConfirm = async (reason: string) => {
    if (!uncompleteTarget) return;
    try {
      await tasksApi.update(uncompleteTarget.id, {
        status: 'OPEN',
        uncompleteReason: reason,
      });
      setUncompleteTarget(null);
      invalidate();
    } catch (err) {
      console.error('Failed to reopen task', err);
      toast.error('Failed to reopen task');
    }
  };

  const handleToggleClick = (task: Task) => {
    if (task.status === 'DONE') {
      if (canCompleteTask(task, user?.id)) {
        setUncompleteTarget(task);
      }
      return;
    }
    if (canCompleteTask(task, user?.id)) {
      setCompleteTarget(task);
    }
  };

  const handleSaved = () => {
    invalidate();
  };

  const pending = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const cancelled = tasks.filter((t) => t.status === 'CANCELLED');
  const done = tasks.filter((t) => t.status === 'DONE');
  const orderedTasks = [...pending, ...cancelled, ...done];

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <ClipboardList className="h-3.5 w-3.5" />
          Tasks
          {pending.length > 0 && (
            <span className="ml-0.5 text-muted-foreground">
              · {pending.length} open
            </span>
          )}
          {cancelled.length > 0 && (
            <span className="ml-0.5 text-muted-foreground">
              · {cancelled.length} cancelled
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setEditingTask(null);
            setAddOpen(true);
          }}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">
          Loading tasks...
        </p>
      ) : orderedTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No tasks linked yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {orderedTasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              isPast(new Date(task.dueDate)) &&
              !isToday(new Date(task.dueDate)) &&
              task.status !== 'DONE' &&
              task.status !== 'CANCELLED';
            const isDone = task.status === 'DONE';
            const isCancelled = task.status === 'CANCELLED';
            const meta =
              PRIORITY_META[task.priority] ?? PRIORITY_META.MEDIUM;
            const canComplete = !isCancelled && canCompleteTask(task, user?.id);

            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-colors group',
                  isDone || isCancelled
                    ? 'bg-muted/20 border-border/30 opacity-60'
                    : 'bg-background border-border/50 hover:bg-muted/30',
                )}>
                {/* Complete toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleClick(task)}
                  disabled={!canComplete}
                  className={cn(
                    'shrink-0 mt-0.5 transition-colors',
                    isDone
                      ? canComplete
                        ? 'text-emerald-500 hover:text-emerald-600'
                        : 'text-emerald-500'
                      : isCancelled
                        ? 'text-muted-foreground cursor-not-allowed'
                        : canComplete
                          ? 'text-muted-foreground hover:text-emerald-500'
                          : 'text-muted-foreground cursor-not-allowed',
                  )}>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>

                {/* Content */}
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setEditingTask(task);
                    setAddOpen(true);
                  }}>
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      (isDone || isCancelled) && 'line-through text-muted-foreground',
                    )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.entityName && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{task.entityName}</span>
                      </span>
                    )}
                    {task.dueDate && (
                      <span
                        className={cn(
                          'flex items-center gap-1 text-xs',
                          isOverdue
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}>
                        {isOverdue ? (
                          <AlertTriangle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                    {task.assignedTo && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {task.assignedTo.name.split(' ')[0]}
                      </span>
                    )}
                    <span
                      className={cn(
                        'text-[11px] font-medium',
                        meta.color,
                      )}>
                      {meta.label}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) setEditingTask(null);
        }}
        editingTask={editingTask}
        assignableUsers={assignableUsers}
        currentUserId={user?.id}
        canAssign={canAssign}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
        onSaved={handleSaved}
      />

      {completeTarget && (
        <CompleteTaskDialog
          task={completeTarget}
          open={!!completeTarget}
          onClose={() => setCompleteTarget(null)}
          onConfirm={handleCompleteConfirm}
        />
      )}

      {uncompleteTarget && (
        <UncompleteTaskDialog
          task={uncompleteTarget}
          open={!!uncompleteTarget}
          onClose={() => setUncompleteTarget(null)}
          onConfirm={handleUncompleteConfirm}
        />
      )}
    </section>
  );
}
