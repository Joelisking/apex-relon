'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Plus,
  LayoutGrid,
  List,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tasksApi } from '@/lib/api/tasks-client';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import type { Task, TaskSummary, TeamTaskSummary } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { TaskDialog } from './TaskDialog';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { TaskTableView } from './TaskTableView';
import { TaskCardView } from './TaskCardView';
import { TeamTasksView } from './TeamTasksView';

type ViewMode = 'table' | 'card' | 'team';

export default function TasksView() {
  const { user, hasPermission } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [teamSummary, setTeamSummary] = useState<TeamTaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<UserDirectoryItem[]>([]);

  const canAssign = hasPermission('tasks:assign');
  const canViewAll = hasPermission('tasks:view_all');

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, string> = {};
      if (statusFilter === 'active') {
        // Don't send status to get all, then filter client side
      } else if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (canViewAll && assigneeFilter === 'mine' && user?.id) {
        filters.assignedToId = user.id;
      }

      const [taskData, summaryData, teamData] = await Promise.all([
        tasksApi.getAll(filters),
        tasksApi.getSummary(),
        tasksApi.getTeamSummary(),
      ]);

      if (statusFilter === 'active') {
        setTasks(
          taskData.filter(
            (t) => t.status !== 'DONE' && t.status !== 'CANCELLED',
          ),
        );
      } else {
        setTasks(taskData);
      }
      setSummary(summaryData);
      // Only show team section if user actually has direct reports
      setTeamSummary(teamData && teamData.members.length > 0 ? teamData : null);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, assigneeFilter, canViewAll, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreate = () => {
    setEditingTask(null);
    if (canAssign && assignableUsers.length === 0) {
      usersApi
        .getUsersDirectory()
        .then(({ users: all }) => {
          const filtered = canViewAll
            ? all
            : all.filter(
                (u) => !u.teamId || u.teamId === user?.teamId,
              );
          setAssignableUsers(filtered);
        })
        .catch(() => {});
    }
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    if (canAssign && assignableUsers.length === 0) {
      usersApi
        .getUsersDirectory()
        .then(({ users: all }) => {
          const filtered = canViewAll
            ? all
            : all.filter(
                (u) => !u.teamId || u.teamId === user?.teamId,
              );
          setAssignableUsers(filtered);
        })
        .catch(() => {});
    }
    setDialogOpen(true);
  };

  const handleComplete = async (
    taskId: string,
    completionNote: string,
  ) => {
    try {
      await tasksApi.complete(taskId, completionNote);
      fetchTasks();
    } catch (err) {
      console.error('Failed to complete task', err);
    }
  };

  const handleUncomplete = async (taskId: string, reason: string) => {
    try {
      await tasksApi.update(taskId, {
        status: 'OPEN',
        uncompleteReason: reason,
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to revert task', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await tasksApi.delete(deleteId);
      setDeleteId(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const canCreate = hasPermission('tasks:create');
  const canEdit = hasPermission('tasks:edit');
  const canDelete = hasPermission('tasks:delete');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            Manage your tasks and follow-ups
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Summary stats bar */}
      {summary && (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* My stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60">
            {teamSummary && (
              <div className="col-span-2 sm:col-span-4 px-5 py-1.5 bg-muted/30 border-b border-border/40">
                <p className="text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground">My Tasks</p>
              </div>
            )}
            <div className="relative bg-card px-5 py-4">
              {summary.overdue > 0 && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
              )}
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Overdue</p>
              <p className={cn('text-[22px] font-bold tabular-nums leading-none mt-1', summary.overdue > 0 ? 'text-red-600' : 'text-foreground')}>
                {summary.overdue}
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Due Today</p>
              <p className={cn('text-[22px] font-bold tabular-nums leading-none mt-1', summary.dueToday > 0 ? 'text-amber-600' : 'text-foreground')}>
                {summary.dueToday}
              </p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Upcoming</p>
              <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">{summary.upcoming}</p>
            </div>
            <div className="bg-card px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Total Open</p>
              <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">{summary.total}</p>
            </div>
          </div>

          {/* Team totals row */}
          {teamSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/60 border-t border-border/60">
              <div className="col-span-2 sm:col-span-4 px-5 py-1.5 bg-muted/30 border-b border-border/40">
                <p className="text-[10px] uppercase tracking-[0.06em] font-medium text-muted-foreground">
                  Team ({teamSummary.members.length} member{teamSummary.members.length !== 1 ? 's' : ''})
                </p>
              </div>
              <div className="relative bg-card px-5 py-4">
                {teamSummary.team.overdue > 0 && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                )}
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Overdue</p>
                <p className={cn('text-[22px] font-bold tabular-nums leading-none mt-1', teamSummary.team.overdue > 0 ? 'text-red-600' : 'text-foreground')}>
                  {teamSummary.team.overdue}
                </p>
              </div>
              <div className="bg-card px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Due Today</p>
                <p className={cn('text-[22px] font-bold tabular-nums leading-none mt-1', teamSummary.team.dueToday > 0 ? 'text-amber-600' : 'text-foreground')}>
                  {teamSummary.team.dueToday}
                </p>
              </div>
              <div className="bg-card px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Upcoming</p>
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">{teamSummary.team.upcoming}</p>
              </div>
              <div className="bg-card px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">Total Open</p>
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mt-1">{teamSummary.team.total}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        {canViewAll && (
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full h-8 text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="mine">Mine Only</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        <div className="flex items-center rounded-md border border-border/60 bg-muted/40 p-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-sm transition-colors',
              viewMode === 'table'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setViewMode('table')}>
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-sm transition-colors',
              viewMode === 'card'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setViewMode('card')}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          {teamSummary && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded-sm transition-colors',
                viewMode === 'team'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setViewMode('team')}
              title="By member">
              <Users className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden animate-pulse">
          <div className="bg-muted/40 px-4 py-2.5 grid grid-cols-[2rem_1fr_2rem] md:grid-cols-[2rem_1fr_6rem_7rem_8rem_5rem_2rem] gap-4 border-b border-border/40">
            <div className="h-2.5 bg-muted rounded" />
            <div className="h-2.5 bg-muted rounded" />
            <div className="h-2.5 bg-muted rounded hidden md:block" />
            <div className="h-2.5 bg-muted rounded hidden md:block" />
            <div className="h-2.5 bg-muted rounded hidden md:block" />
            <div className="h-2.5 bg-muted rounded hidden md:block" />
            <div className="h-2.5 bg-muted rounded" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 grid grid-cols-[2rem_1fr_2rem] md:grid-cols-[2rem_1fr_6rem_7rem_8rem_5rem_2rem] gap-4 border-b border-border/40 last:border-0">
              <div className="h-4 bg-muted rounded-full w-4 self-center" />
              <div className="space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2" />
              </div>
              <div className="h-5 bg-muted rounded-full w-14 self-center hidden md:block" />
              <div className="h-3.5 bg-muted rounded w-20 self-center hidden md:block" />
              <div className="h-3.5 bg-muted rounded w-24 self-center hidden md:block" />
              <div className="h-5 bg-muted rounded-full w-16 self-center hidden md:block" />
              <div className="h-4 bg-muted rounded w-4 self-center" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            No tasks found
          </p>
          {canCreate && (
            <Button
              onClick={openCreate}
              variant="outline"
              size="sm"
              className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create your first task
            </Button>
          )}
        </div>
      ) : viewMode === 'team' && teamSummary ? (
        <TeamTasksView
          members={teamSummary.members}
          canEdit={canEdit}
          canDelete={canDelete}
          currentUserId={user?.id}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          onTaskSaved={fetchTasks}
        />
      ) : viewMode === 'card' ? (
        <TaskCardView
          tasks={tasks}
          canEdit={canEdit}
          canDelete={canDelete}
          currentUserId={user?.id}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      ) : (
        <TaskTableView
          tasks={tasks}
          canEdit={canEdit}
          canDelete={canDelete}
          currentUserId={user?.id}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      )}

      {/* Create/Edit Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingTask={editingTask}
        assignableUsers={assignableUsers}
        currentUserId={user?.id}
        canAssign={canAssign}
        onSaved={fetchTasks}
      />

      {/* Delete confirmation */}
      <TaskDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
