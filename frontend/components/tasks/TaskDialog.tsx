'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  X,
  Loader2,
  Check,
  ChevronDown,
  Tag,
} from 'lucide-react';
import { TimePicker } from './TimePicker';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EntityLinkPicker } from './EntityLinkPicker';
import { AssignUserPicker } from './AssignUserPicker';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { tasksApi, type CreateTaskDto } from '@/lib/api/tasks-client';
import { settingsApi } from '@/lib/api/client';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { rolesApi, type RoleResponse } from '@/lib/api/roles-client';
import { toast } from 'sonner';
import { type UserDirectoryItem } from '@/lib/api/users-client';
import { ServiceSubtaskPicker } from '@/components/shared/ServiceSubtaskPicker';
import type { Task, TaskType, CostBreakdown, ServiceItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: Task | null;
  assignableUsers?: UserDirectoryItem[];
  currentUserId?: string;
  canAssign?: boolean;
  /**
   * Whether the current user can edit this task's fields. When false, all
   * non-status fields are read-only; the user may still mark the task as done
   * via the Status section if `canMarkDone` allows it.
   * Defaults to `true` for backwards compatibility with callers that haven't
   * been updated; new callers should pass an explicit value.
   */
  canEdit?: boolean;
  onSaved: () => void;
  /** Pre-fill entity link when creating a new task from a record's detail view */
  defaultEntityType?: string;
  defaultEntityId?: string;
}

const PRIORITY_OPTIONS = [
  {
    value: 'LOW',
    label: 'Low',
    active: 'bg-slate-200 border-slate-400 text-slate-800',
    inactive:
      'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300',
  },
  {
    value: 'MEDIUM',
    label: 'Medium',
    active: 'bg-amber-100 border-amber-400 text-amber-800',
    inactive:
      'bg-amber-50/60 border-amber-100 text-amber-600 hover:bg-amber-50 hover:border-amber-200',
  },
  {
    value: 'HIGH',
    label: 'High',
    active: 'bg-orange-100 border-orange-400 text-orange-800',
    inactive:
      'bg-orange-50/60 border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200',
  },
  {
    value: 'URGENT',
    label: 'Urgent',
    active: 'bg-red-100 border-red-400 text-red-800',
    inactive:
      'bg-red-50/60 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200',
  },
] as const;

const STATUS_OPTIONS = [
  {
    value: 'OPEN',
    label: 'Open',
    active: 'bg-sky-100 border-sky-400 text-sky-800',
    inactive:
      'bg-sky-50/60 border-sky-100 text-sky-600 hover:bg-sky-50 hover:border-sky-200',
  },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    active: 'bg-violet-100 border-violet-400 text-violet-800',
    inactive:
      'bg-violet-50/60 border-violet-100 text-violet-600 hover:bg-violet-50 hover:border-violet-200',
  },
  {
    value: 'DONE',
    label: 'Done',
    active: 'bg-emerald-100 border-emerald-400 text-emerald-800',
    inactive:
      'bg-emerald-50/60 border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    active: 'bg-zinc-200 border-zinc-400 text-zinc-700',
    inactive:
      'bg-zinc-50/60 border-zinc-100 text-zinc-500 hover:bg-zinc-100 hover:border-zinc-200',
  },
] as const;

/** Determine if the current user can mark a task as done in the dialog */
function canMarkDone(task: Task | null, currentUserId?: string): boolean {
  if (!task || !currentUserId) return false;
  if (task.assignedToId) return task.assignedToId === currentUserId;
  return task.createdById === currentUserId;
}

export function TaskDialog({
  open,
  onOpenChange,
  editingTask,
  assignableUsers = [],
  currentUserId,
  canAssign = false,
  canEdit = true,
  onSaved,
  defaultEntityType,
  defaultEntityId,
}: TaskDialogProps) {
  // When editing an existing task without edit permission, the dialog is
  // read-only except for the Status section. New-task creation always allows
  // full editing (create-task permission is enforced by the parent).
  const readOnly = !!editingTask && !canEdit;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<
    CreateTaskDto & { status?: string; completionNote?: string; entityJobNumber?: string }
  >({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'MEDIUM',
    assignedToId: '',
    entityType: '',
    entityId: '',
    taskTypeId: '',
  });
  const [taskTypeOpen, setTaskTypeOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [showAllCbItems, setShowAllCbItems] = useState(false);

  // Task types filtered by the linked entity's project type
  const [linkedJobTypeId, setLinkedJobTypeId] = useState<string | undefined>(undefined);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  // Load the project's cost breakdown (with lines + subtasks) when a project is linked.
  const isProjectTask = form.entityType === 'PROJECT' && !!form.entityId;
  const { data: projectCostBreakdowns = [] } = useQuery<CostBreakdown[]>({
    queryKey: ['project-cost-breakdowns', form.entityId],
    queryFn: () => costBreakdownApi.getAll({ projectId: form.entityId! }),
    enabled: isProjectTask,
    staleTime: 60_000,
  });
  const cbLines = useMemo(
    () => projectCostBreakdowns[0]?.lines ?? [],
    [projectCostBreakdowns],
  );

  // Load the full role catalog so we can resolve a User.role (stored as
  // Role.key) to its Role.label — which is what CostBreakdownRoleEstimate.role
  // actually stores (see CostBreakdownSubtaskSection.tsx:249).
  const { data: rolesCatalog = [] } = useQuery<RoleResponse[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60_000,
  });

  // Set of strings that identify the assignee's role in the CB — holds BOTH
  // the key and the label, plus any roleDisplayNames override, so we match
  // regardless of which form the CB estimate was stored as.
  const assigneeRoleMatchers = useMemo(() => {
    const user = assignableUsers.find((u) => u.id === form.assignedToId);
    if (!user?.role) return null;
    const matchers = new Set<string>([user.role]);
    const roleRecord = rolesCatalog.find((r) => r.key === user.role);
    if (roleRecord) matchers.add(roleRecord.label);
    return matchers;
  }, [assignableUsers, form.assignedToId, rolesCatalog]);

  // All CB service items, unfiltered — used for the "show all" fallback.
  const allCbServiceItems: ServiceItem[] = useMemo(
    () => cbLines.map((l) => l.serviceItem),
    [cbLines],
  );

  // Service items filtered down to subtasks that have a role estimate for the
  // assignee. When no assignee/role is set, returns the full unfiltered list.
  // No silent fallback — an empty result is surfaced to the user explicitly.
  const filteredCbServiceItems: ServiceItem[] = useMemo(() => {
    if (!assigneeRoleMatchers) return cbLines.map((line) => line.serviceItem);
    return cbLines
      .map((line) => {
        const allowedSubtaskIds = new Set(
          line.roleEstimates
            .filter(
              (re) =>
                assigneeRoleMatchers.has(re.role) && re.estimatedHours > 0,
            )
            .map((re) => re.subtaskId),
        );
        if (allowedSubtaskIds.size === 0) return null;
        const subtasks = line.serviceItem.subtasks.filter((st) =>
          allowedSubtaskIds.has(st.id),
        );
        if (subtasks.length === 0) return null;
        return { ...line.serviceItem, subtasks };
      })
      .filter((si): si is ServiceItem => si !== null);
  }, [cbLines, assigneeRoleMatchers]);

  // True when an assignee with a known role is selected but their role has no
  // subtasks in this cost breakdown (i.e. the filter returned nothing).
  const roleFilterEmpty =
    !!assigneeRoleMatchers && filteredCbServiceItems.length === 0;

  // Items shown in the picker — either role-filtered or all, depending on state.
  const cbServiceItems = showAllCbItems
    ? allCbServiceItems
    : filteredCbServiceItems;

  // Whether the current user is allowed to set DONE in this dialog
  const allowDone = canMarkDone(editingTask, currentUserId);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLinkedJobTypeId(undefined);
      setShowAllCbItems(false);
      return;
    }
    setTaskTypeOpen(false);
    if (editingTask) {
      setForm({
        title: editingTask.title,
        description: editingTask.description || '',
        dueDate: editingTask.dueDate
          ? editingTask.dueDate.split('T')[0]
          : '',
        dueTime: editingTask.dueTime || '',
        priority: editingTask.priority,
        assignedToId: editingTask.assignedToId || '',
        entityType: editingTask.entityType || '',
        entityId: editingTask.entityId || '',
        entityJobNumber: editingTask.entityJobNumber || '',
        taskTypeId: editingTask.taskTypeId || '',
        estimatedHours: editingTask.estimatedHours ?? undefined,
        serviceItemId: editingTask.serviceItemId ?? undefined,
        serviceItemSubtaskId: editingTask.serviceItemSubtaskId ?? undefined,
        costBreakdownLineId: editingTask.costBreakdownLineId ?? undefined,
        status: editingTask.status,
        completionNote: '',
      });
    } else {
      setForm({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'MEDIUM',
        assignedToId: currentUserId || '',
        entityType: defaultEntityType || '',
        entityId: defaultEntityId || '',
        taskTypeId: '',
      });
    }
  }, [
    open,
    editingTask,
    currentUserId,
    defaultEntityType,
    defaultEntityId,
  ]);

  // Fetch task types, filtered by linked entity's project type when available
  useEffect(() => {
    settingsApi
      .getTaskTypes(linkedJobTypeId)
      .then((data) => setTaskTypes(data.filter((tt) => tt.isActive)))
      .catch(() => setTaskTypes([]));
  }, [linkedJobTypeId]);

  const selectedTaskType = taskTypes.find((tt) => tt.id === form.taskTypeId);

  const isMarkingDone = form.status === 'DONE' && editingTask?.status !== 'DONE';

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        entityType: form.entityType || undefined,
        entityId: form.entityId || undefined,
        assignedToId: form.assignedToId || undefined,
        taskTypeId: form.taskTypeId || undefined,
        dueDate: form.dueDate || undefined,
        dueTime: form.dueTime || undefined,
        completionNote:
          isMarkingDone ? form.completionNote?.trim() : undefined,
      };
      if (editingTask) {
        await tasksApi.update(editingTask.id, payload);
      } else {
        await tasksApi.create(payload);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      console.error('Failed to save task', err);
      toast.error('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {editingTask ? 'Edit Task' : 'New Task'}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 pt-6 pb-5 space-y-4">
          {/* All editable fields except Status are wrapped in a fieldset so
              read-only mode natively disables every descendant form control. */}
          <fieldset
            disabled={readOnly}
            className="border-0 p-0 m-0 min-w-0 space-y-4 disabled:opacity-70">
          {/* Entity Link — at top so subtask picker + task type can scope to it */}
          <EntityLinkPicker
            entityType={form.entityType ?? ''}
            entityId={form.entityId ?? ''}
            entityJobNumber={form.entityJobNumber}
            onChange={(type, id, jobTypeId, jobNumber) => {
              setShowAllCbItems(false);
              setForm((prev) => ({
                ...prev,
                entityType: type,
                entityId: id,
                entityJobNumber: jobNumber || '',
                taskTypeId: '',
                serviceItemId: undefined,
                serviceItemSubtaskId: undefined,
                costBreakdownLineId: undefined,
                estimatedHours: undefined,
              }));
              setLinkedJobTypeId(jobTypeId);
            }}
          />

          {/* Assign To — the assignee's role filters which subtasks are pickable below */}
          {canAssign && assignableUsers.length > 0 && (
            <AssignUserPicker
              assignableUsers={assignableUsers}
              selectedUserId={form.assignedToId ?? ''}
              currentUserId={currentUserId}
              helperText={
                isProjectTask && cbLines.length > 0
                  ? '— filters subtasks by role'
                  : undefined
              }
              onSelect={(userId) => {
                setShowAllCbItems(false);
                const newUser = assignableUsers.find((u) => u.id === userId);
                const newRoleKey = newUser?.role ?? null;
                const newRoleLabel = newRoleKey
                  ? (rolesCatalog.find((r) => r.key === newRoleKey)?.label ?? null)
                  : null;
                const newMatchers = new Set<string>();
                if (newRoleKey) newMatchers.add(newRoleKey);
                if (newRoleLabel) newMatchers.add(newRoleLabel);

                // If the currently-picked subtask has no role estimate for
                // the new assignee's role, clear the CB-linked selection so
                // the user is prompted to pick again.
                const currentSubtaskId = form.serviceItemSubtaskId;
                let clearSelection = false;
                if (newMatchers.size > 0 && currentSubtaskId) {
                  const stillValid = cbLines.some((line) =>
                    line.roleEstimates.some(
                      (re) =>
                        re.subtaskId === currentSubtaskId &&
                        newMatchers.has(re.role) &&
                        re.estimatedHours > 0,
                    ),
                  );
                  if (!stillValid) clearSelection = true;
                }
                setForm((prev) => ({
                  ...prev,
                  assignedToId: userId,
                  ...(clearSelection
                    ? {
                        serviceItemId: undefined,
                        serviceItemSubtaskId: undefined,
                        costBreakdownLineId: undefined,
                        estimatedHours: undefined,
                      }
                    : {}),
                }));
              }}
            />
          )}

          {/* Service Item / Subtask — grouped picker, only for project tasks with a CB */}
          {isProjectTask && allCbServiceItems.length > 0 && (
            roleFilterEmpty && !showAllCbItems ? (
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-4 py-3 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                  Service Item / Subtask
                  <span className="ml-1.5 normal-case tracking-normal font-normal">
                    — from cost breakdown
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  No tasks available for this user in the cost breakdown.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllCbItems(true)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Show all service items and subtasks for this project
                </button>
              </div>
            ) : (
            <ServiceSubtaskPicker
              label="Service Item / Subtask"
              helperText={showAllCbItems ? '— showing all (role has no tasks)' : '— from cost breakdown'}
              placeholder="Pick a subtask (or type a custom title below)"
              serviceItems={cbServiceItems}
              serviceItemId={form.serviceItemId ?? ''}
              serviceItemSubtaskId={form.serviceItemSubtaskId ?? ''}
              onSelect={(siId, stId) => {
                const line = cbLines.find((l) => l.serviceItemId === siId);
                let autoHours: number | undefined = undefined;
                let autoTitle: string | null = null;
                if (line) {
                  // When an assignee is set, scope hours to their role;
                  // otherwise fall back to the sum of all role estimates.
                  const relevant = assigneeRoleMatchers
                    ? line.roleEstimates.filter((re) =>
                        assigneeRoleMatchers.has(re.role),
                      )
                    : line.roleEstimates;
                  if (stId) {
                    autoHours = relevant
                      .filter((re) => re.subtaskId === stId)
                      .reduce((s, re) => s + re.estimatedHours, 0);
                    const subtask = line.serviceItem.subtasks.find((s) => s.id === stId);
                    autoTitle = subtask?.name ?? null;
                  } else {
                    autoHours = relevant.reduce((s, re) => s + re.estimatedHours, 0);
                    autoTitle = line.serviceItem.name;
                  }
                }
                setForm((prev) => ({
                  ...prev,
                  serviceItemId: siId || undefined,
                  serviceItemSubtaskId: stId || undefined,
                  costBreakdownLineId: line?.id ?? undefined,
                  estimatedHours:
                    autoHours && autoHours > 0 ? autoHours : prev.estimatedHours,
                  title: autoTitle ?? prev.title,
                }));
              }}
            />
            )
          )}

          {/* Title — auto-filled from the selected subtask, editable for custom tasks */}
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={
              isProjectTask && cbServiceItems.length > 0
                ? 'Pick a subtask above, or type a custom title...'
                : 'Task title...'
            }
            className="w-full text-[17px] font-semibold bg-transparent outline-none placeholder:text-muted-foreground text-foreground leading-snug"
            autoFocus
          />

          {/* Description */}
          <Textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Add a description..."
            className="resize-none text-sm border-dashed min-h-16 text-muted-foreground placeholder:text-muted-foreground"
            rows={2}
          />

          {/* Estimated hours */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              Estimated Hours
            </p>
            <input
              type="number"
              min={0}
              step={0.25}
              value={form.estimatedHours ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  estimatedHours: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                }))
              }
              placeholder="e.g. 2.5"
              className="w-36 h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="border-t border-dashed border-border/50" />

          {/* Task Type — filtered by the linked entity's project type */}
          {taskTypes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Task Type
                {linkedJobTypeId && (
                  <span className="ml-1.5 normal-case text-muted-foreground tracking-normal font-normal">
                    — filtered by project type
                  </span>
                )}
              </p>
              <Popover
                open={taskTypeOpen}
                onOpenChange={setTaskTypeOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
                      !selectedTaskType && 'text-muted-foreground',
                    )}>
                    <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">
                      {selectedTaskType
                        ? selectedTaskType.name
                        : 'Select task type...'}
                    </span>
                    {form.taskTypeId ? (
                      <X
                        className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm({ ...form, taskTypeId: '' });
                        }}
                      />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 overflow-hidden"
                  style={{ width: 'var(--radix-popover-trigger-width)' }}
                  align="start"
                  sideOffset={4}>
                  <div className="py-1 max-h-52 overflow-y-auto">
                    {taskTypes.map((tt) => (
                      <button
                        key={tt.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, taskTypeId: tt.id });
                          setTaskTypeOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50 text-left',
                          form.taskTypeId === tt.id && 'bg-muted/30',
                        )}>
                        <span className="flex-1 truncate">{tt.name}</span>
                        {form.taskTypeId === tt.id && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
              Priority
            </p>
            <div className="flex gap-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, priority: p.value })
                  }
                  className={cn(
                    'flex-1 h-7 rounded-md border text-[11px] font-semibold uppercase tracking-[0.05em] transition-all',
                    form.priority === p.value ? p.active : p.inactive,
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          </fieldset>

          {/* Status (edit mode only) — sits outside the disabled fieldset so
              read-only users assigned to the task can still mark it as done. */}
          {editingTask && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Status
              </p>
              <div className="flex gap-1.5">
                {STATUS_OPTIONS.filter((s) => {
                  if (s.value === 'IN_PROGRESS' || s.value === 'DONE') return allowDone;
                  return true;
                }).map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        status: s.value,
                        completionNote: s.value !== 'DONE' ? '' : form.completionNote,
                      })
                    }
                    className={cn(
                      'flex-1 h-7 rounded-md border text-[10px] font-semibold uppercase tracking-[0.04em] transition-all',
                      form.status === s.value ? s.active : s.inactive,
                    )}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Completion note — shown when editing task and switching to DONE */}
              {isMarkingDone && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                    Result / Completion Note
                    <span className="ml-1 text-destructive">*</span>
                  </p>
                  <Textarea
                    value={form.completionNote ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        completionNote: e.target.value,
                      })
                    }
                    placeholder="Describe the outcome or result..."
                    className="resize-none min-h-20 text-sm"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <fieldset
            disabled={readOnly}
            className="border-0 p-0 m-0 min-w-0 disabled:opacity-70">
          {/* Due Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Due Date
              </p>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-9 text-sm',
                      !form.dueDate && 'text-muted-foreground',
                    )}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    {form.dueDate
                      ? format(
                          new Date(form.dueDate + 'T00:00:00'),
                          'd MMM yyyy',
                        )
                      : 'Set date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      form.dueDate
                        ? new Date(form.dueDate + 'T00:00:00')
                        : undefined
                    }
                    onSelect={(date) => {
                      setForm({
                        ...form,
                        dueDate: date
                          ? format(date, 'yyyy-MM-dd')
                          : '',
                      });
                      setDueDateOpen(false);
                    }}
                    initialFocus
                  />
                  {form.dueDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => {
                          setForm({ ...form, dueDate: '' });
                          setDueDateOpen(false);
                        }}>
                        <X className="mr-1 h-3 w-3" />
                        Clear date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Due Time
              </p>
              <TimePicker
                value={form.dueTime ?? ''}
                onChange={(v) => setForm({ ...form, dueTime: v })}
              />
              {!form.dueTime && form.dueDate && (
                <p className="text-xs text-muted-foreground">
                  No time set — reminders will assume 9:00 AM.
                </p>
              )}
            </div>
          </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/60 bg-muted/20">
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {editingTask
              ? readOnly
                ? 'Viewing task'
                : 'Editing task'
              : 'New task'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* In read-only mode the only legal save is a status change
                (handled by canMarkDone). Hide Save entirely if there is no
                pending status change. */}
            {(() => {
              const pendingStatusChange =
                !!editingTask && form.status !== editingTask.status;
              if (readOnly && !pendingStatusChange) return null;
              return (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}>
                  {saving && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  {editingTask ? 'Update task' : 'Create task'}
                </Button>
              );
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
