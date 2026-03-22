'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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

interface TaskTableViewProps {
  tasks: Task[];
  canEdit: boolean;
  canEditAll?: boolean;
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

function canEditTask(task: Task, currentUserId?: string, canEditAll?: boolean): boolean {
  if (canEditAll) return true;
  if (!currentUserId) return false;
  if (task.assignedToId) return task.assignedToId === currentUserId;
  return task.createdById === currentUserId;
}

export function TaskTableView({
  tasks,
  canEdit,
  canEditAll,
  canDelete,
  currentUserId,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: TaskTableViewProps) {
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [uncompleteTarget, setUncompleteTarget] = useState<Task | null>(null);

  const handleCompleteClick = (task: Task) => {
    setCompleteTarget(task);
  };

  const handleUncompleteClick = (task: Task) => {
    setUncompleteTarget(task);
  };

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
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Task</TableHead>
              <TableHead className="hidden md:table-cell">
                Priority
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Due Date
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                Assigned To
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                Status
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isDone = task.status === 'DONE';
              const isCancelled = task.status === 'CANCELLED';
              const canComplete = canCompleteTask(task, currentUserId);

              return (
                <TableRow
                  key={task.id}
                  className={cn(isDone && 'opacity-60')}>
                  <TableCell className="px-3 py-2.5">
                    {isDone ? (
                      canComplete ? (
                        <button
                          type="button"
                          onClick={() => handleUncompleteClick(task)}
                          className="text-emerald-500 hover:text-emerald-600 transition-colors">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      )
                    ) : canEdit && canComplete && !isCancelled ? (
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleCompleteClick(task)}
                        className="mt-0.5"
                      />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isDone && 'line-through text-muted-foreground',
                      )}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.entityType && (
                      <span className="flex items-center gap-1 mt-1.5">
                        <span className="text-[10px] uppercase tracking-[0.04em] text-muted-foreground font-medium leading-none">
                          {task.entityType}
                        </span>
                        {task.entityName && (
                          <>
                            <span className="text-muted-foreground text-[10px] leading-none">·</span>
                            <span className="text-[11px] text-muted-foreground font-medium leading-none truncate max-w-[140px]">
                              {task.entityName}
                            </span>
                          </>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 hidden md:table-cell">
                    <Badge
                      className={cn(
                        'text-[10px] font-medium',
                        priorityColors[task.priority],
                      )}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 hidden md:table-cell">
                    <span
                      className={cn(
                        'text-xs',
                        isOverdue(task.dueDate, task.status) &&
                          'text-red-600 font-medium',
                        isDueToday(task.dueDate) &&
                          'text-amber-600 font-medium',
                      )}>
                      {task.dueDate ? (
                        <span className="flex items-center gap-1">
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {formatDate(task.dueDate)}
                          {task.dueTime && (
                            <span className="text-muted-foreground">
                              {' '}
                              {task.dueTime}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          No due date
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {task.assignedTo?.name || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 hidden lg:table-cell">
                    <Badge
                      className={cn(
                        'text-[10px] font-medium',
                        statusColors[task.status],
                      )}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && canEditTask(task, currentUserId, canEditAll) && (
                            <DropdownMenuItem
                              onClick={() => onEdit(task)}>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
