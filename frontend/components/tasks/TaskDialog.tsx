'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  X,
  Loader2,
  Check,
  User,
  Search,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { tasksApi, type CreateTaskDto } from '@/lib/api/tasks-client';
import { settingsApi, API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { toast } from 'sonner';
import { type UserDirectoryItem } from '@/lib/api/users-client';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { Task, TaskType, CostBreakdownLine } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: Task | null;
  assignableUsers?: UserDirectoryItem[];
  currentUserId?: string;
  canAssign?: boolean;
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
  onSaved,
  defaultEntityType,
  defaultEntityId,
}: TaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<
    CreateTaskDto & { status?: string; completionNote?: string }
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

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignQuery, setAssignQuery] = useState('');
  const [taskTypeOpen, setTaskTypeOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  // Task types filtered by the linked entity's project type
  const [linkedJobTypeId, setLinkedJobTypeId] = useState<string | undefined>(undefined);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  // Service item picker (project tasks with CB)
  const isProjectTask = form.entityType === 'PROJECT' && !!form.entityId;
  const { data: cbLines = [] } = useQuery<CostBreakdownLine[]>({
    queryKey: ['project-cb-lines', form.entityId],
    queryFn: async () => {
      const token = getTokenFromClientCookies();
      const res = await fetch(`${API_URL}/cost-breakdowns?projectId=${form.entityId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      if (!res.ok) return [];
      const breakdowns = await res.json() as Array<{ lines: CostBreakdownLine[] }>;
      return breakdowns[0]?.lines ?? [];
    },
    enabled: isProjectTask,
    staleTime: 60_000,
  });

  // Whether the current user is allowed to set DONE in this dialog
  const allowDone = canMarkDone(editingTask, currentUserId);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLinkedJobTypeId(undefined);
      return;
    }
    setAssignOpen(false);
    setAssignQuery('');
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
        taskTypeId: editingTask.taskTypeId || '',
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

  const filteredAssignees = useMemo(() => {
    if (!assignQuery.trim()) return assignableUsers;
    const q = assignQuery.toLowerCase();
    return assignableUsers.filter((u) =>
      u.name.toLowerCase().includes(q),
    );
  }, [assignableUsers, assignQuery]);

  const selectedUser = assignableUsers.find(
    (u) => u.id === form.assignedToId,
  );

  const selectedTaskType = taskTypes.find((tt) => tt.id === form.taskTypeId);

  const isMarkingDone = form.status === 'DONE' && editingTask?.status !== 'DONE';

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (isMarkingDone && !form.completionNote?.trim()) return;
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
          {/* Title */}
          <input
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
            placeholder="Task title..."
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

          <div className="border-t border-dashed border-border/50" />

          {/* Entity Link — at top so task type can filter based on it */}
          <EntityLinkPicker
            entityType={form.entityType ?? ''}
            entityId={form.entityId ?? ''}
            onChange={(type, id, jobTypeId) => {
              setForm({ ...form, entityType: type, entityId: id, taskTypeId: '', serviceItemId: undefined, costBreakdownLineId: undefined, estimatedHours: undefined });
              setLinkedJobTypeId(jobTypeId);
            }}
          />

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

          {/* Service Item — only shown when linked to a project that has CB lines */}
          {isProjectTask && cbLines.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Service Item
                <span className="ml-1.5 normal-case text-muted-foreground tracking-normal font-normal">
                  — from cost breakdown
                </span>
              </p>
              <SearchableSelect
                value={form.serviceItemId ?? ''}
                onValueChange={(val) => {
                  const line = cbLines.find((l) => l.serviceItemId === val);
                  const autoHours = line
                    ? line.roleEstimates.reduce((s, re) => s + re.estimatedHours, 0)
                    : 0;
                  setForm((prev) => ({
                    ...prev,
                    serviceItemId: val || undefined,
                    costBreakdownLineId: line?.id || undefined,
                    estimatedHours: autoHours > 0 ? autoHours : prev.estimatedHours,
                  }));
                }}
                placeholder="Select service item (optional)"
                searchPlaceholder="Search service items…"
                emptyMessage="No service items found."
                options={[
                  { value: '', label: 'None' },
                  ...cbLines.map((l) => ({ value: l.serviceItemId, label: l.serviceItem.name })),
                ]}
              />
              {form.serviceItemId && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                    Estimated Hours
                  </p>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={form.estimatedHours ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="Auto-filled from cost breakdown"
                    className="w-36 h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          )}

          <div className="border-t border-dashed border-border/50" />

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

          {/* Status (edit mode only) */}
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

          {/* Assign To */}
          {canAssign && assignableUsers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
                Assign To
              </p>
              <Popover
                open={assignOpen}
                onOpenChange={(v) => {
                  setAssignOpen(v);
                  if (!v) setAssignQuery('');
                }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
                      !selectedUser && 'text-muted-foreground',
                    )}>
                    {selectedUser ? (
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <User className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="flex-1 truncate">
                      {selectedUser
                        ? `${selectedUser.name}${selectedUser.id === currentUserId ? ' (me)' : ''}`
                        : 'Assign to someone...'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 overflow-hidden flex flex-col"
                  style={{
                    width: 'var(--radix-popover-trigger-width)',
                    maxHeight: '260px',
                  }}
                  align="start"
                  sideOffset={4}>
                  <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={assignQuery}
                      onChange={(e) => setAssignQuery(e.target.value)}
                      placeholder="Search people..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {assignQuery && (
                      <button
                        type="button"
                        onClick={() => setAssignQuery('')}>
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <div
                    className="overflow-y-auto flex-1 py-1"
                    onWheel={(e) => e.stopPropagation()}>
                    {/* Unassigned */}
                    {!assignQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, assignedToId: '' });
                          setAssignOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                          !form.assignedToId && 'bg-muted/30',
                        )}>
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                        </div>
                        <span className="flex-1 text-muted-foreground">
                          Unassigned
                        </span>
                        {!form.assignedToId && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    )}
                    {filteredAssignees.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, assignedToId: u.id });
                          setAssignOpen(false);
                          setAssignQuery('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                          form.assignedToId === u.id && 'bg-muted/30',
                        )}>
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate">
                          {u.name}
                          {u.id === currentUserId ? ' (me)' : ''}
                        </span>
                        {form.assignedToId === u.id && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    {filteredAssignees.length === 0 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No users found
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/60 bg-muted/20">
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {editingTask ? 'Editing task' : 'New task'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={
                saving ||
                !form.title.trim() ||
                (isMarkingDone && !form.completionNote?.trim())
              }>
              {saving && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              {editingTask ? 'Update task' : 'Create task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
