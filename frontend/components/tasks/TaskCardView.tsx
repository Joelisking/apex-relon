'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  User,
  MoreHorizontal,
  Trash2,
  Pencil,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  priorityColors,
  statusColors,
  formatDate,
  isOverdue,
  isDueToday,
} from './task-utils';
import { CompleteTaskDialog } from './CompleteTaskDialog';
import { UncompleteTaskDialog } from './UncompleteTaskDialog';

const priorityAccent: Record<string, string> = {
  LOW: 'bg-gray-400/40',
  MEDIUM: 'bg-blue-500/50',
  HIGH: 'bg-orange-500/60',
  URGENT: 'bg-red-500/70',
};

interface TaskCardViewProps {
  tasks: Task[];
  canEdit: boolean;
  canDelete: boolean;
  currentUserId?: string;
  onComplete: (taskId: string, completionNote: string) => Promise<void>;
  onUncomplete: (taskId: string, reason: string) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

function canCompleteTask(task: Task, currentUserId?: string): boolean {
  if (!currentUserId) return false;
  if (task.assignedToId) return task.assignedToId === currentUserId;
  return task.createdById === currentUserId;
}

export function TaskCardView({
  tasks,
  canEdit,
  canDelete,
  currentUserId,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: TaskCardViewProps) {
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [uncompleteTarget, setUncompleteTarget] = useState<Task | null>(null);

  const handleCompleteConfirm = async (completionNote: string) => {
    if (!completeTarget) return;
    await onComplete(completeTarget.id, completionNote);
    setCompleteTarget(null);
  };

  const handleUncompleteConfirm = async (reason: string) => {
    if (!uncompleteTarget) return;
    await onUncomplete(uncompleteTarget.id, reason);
    setUncompleteTarget(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {tasks.map((task) => {
          const overdue = isOverdue(task.dueDate, task.status);
          const today = isDueToday(task.dueDate);
          const isDone = task.status === 'DONE';
          const isCancelled = task.status === 'CANCELLED';
          const canComplete = canCompleteTask(task, currentUserId);

          return (
            <div
              key={task.id}
              className={cn(
                'relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
                isDone
                  ? 'opacity-60 border-border/40'
                  : 'border-border/60',
              )}>
              {/* Priority accent strip */}
              <div
                className={cn(
                  'absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full',
                  priorityAccent[task.priority] ?? priorityAccent.MEDIUM,
                )}
              />

              {/* Top row: complete toggle + actions */}
              <div className="flex items-start justify-between gap-2 pl-2">
                {isDone ? (
                  canComplete ? (
                    <button
                      type="button"
                      onClick={() => setUncompleteTarget(task)}
                      className="shrink-0 mt-0.5 transition-colors text-emerald-500 hover:text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="shrink-0 mt-0.5 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={!canEdit || !canComplete || isCancelled}
                    onClick={() => {
                      if (canEdit && canComplete && !isCancelled) {
                        setCompleteTarget(task);
                      }
                    }}
                    className={cn(
                      'shrink-0 mt-0.5 transition-colors',
                      canEdit && canComplete && !isCancelled
                        ? 'text-muted-foreground/30 hover:text-emerald-500'
                        : 'text-muted-foreground/30 cursor-not-allowed',
                    )}>
                    <Circle className="h-4 w-4" />
                  </button>
                )}

                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 -mr-1 -mt-0.5 text-muted-foreground/50 hover:text-foreground">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(task.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Title + description */}
              <div className="pl-2 min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold leading-snug wrap-break-word',
                    isDone && 'line-through text-muted-foreground',
                  )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>

              {/* Badges row */}
              <div className="pl-2 flex flex-wrap gap-1.5 items-center">
                <Badge
                  className={cn(
                    'text-[10px] font-medium',
                    priorityColors[task.priority],
                  )}>
                  {task.priority}
                </Badge>
                <Badge
                  className={cn(
                    'text-[10px] font-medium',
                    statusColors[task.status],
                  )}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.entityType && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal gap-1 max-w-[140px]">
                    <Link2 className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">
                      {task.entityName || task.entityType}
                    </span>
                  </Badge>
                )}
              </div>

              {/* Footer: due date + assignee */}
              <div className="pl-2 mt-auto flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                {task.dueDate ? (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[11px]',
                      overdue
                        ? 'text-red-600 font-medium'
                        : today
                          ? 'text-amber-600 font-medium'
                          : 'text-muted-foreground/60',
                    )}>
                    {overdue ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {formatDate(task.dueDate)}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/40">
                    No due date
                  </span>
                )}

                {task.assignedTo && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60 truncate">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {task.assignedTo.name.split(' ')[0]}
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
    </>
  );
}
