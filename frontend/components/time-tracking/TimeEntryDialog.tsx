'use client';

import { useEffect, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/tasks/TimePicker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  API_URL,
  getTokenFromClientCookies,
  serviceItemsApi,
} from '@/lib/api/client';
import {
  workCodesApi,
  groupWorkCodes,
  type WorkCode,
} from '@/lib/api/work-codes-client';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ServiceSubtaskPicker } from '@/components/shared/ServiceSubtaskPicker';
import { cn } from '@/lib/utils';
import type { ProjectServiceItem, ServiceItem } from '@/lib/types';

function getToken() {
  return getTokenFromClientCookies() ?? '';
}

async function ttFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}/time-tracking${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface TimeEntry {
  id: string;
  userId: string;
  submittedById?: string | null;
  submittedBy?: { id: string; name: string } | null;
  projectId?: string;
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  hourlyRate?: number;
  workCodeId?: string;
  serviceItemId?: string;
  serviceItemSubtaskId?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  jobNumber?: string | null;
  isIndot?: boolean;
  jobType?: { division?: { name: string } | null } | null;
}

interface TimeEntryDialogProps {
  open: boolean;
  entry?: TimeEntry | null;
  initialHours?: number;
  initialProjectId?: string;
  /** Pre-fill the date field when creating a new entry (YYYY-MM-DD) */
  initialDate?: string;
  /** When set, the entry is submitted on behalf of this user (proxy entry) */
  targetUser?: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function TimeEntryDialog({
  open,
  entry,
  initialHours,
  initialProjectId,
  initialDate,
  targetUser,
  onOpenChange,
  onSaved,
}: TimeEntryDialogProps) {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [inputMode, setInputMode] = useState<'times' | 'hours'>(
    'times',
  );
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [directHours, setDirectHours] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState<boolean | null>(null);
  const [workCodeId, setWorkCodeId] = useState('');
  const [isIndot, setIsIndot] = useState(false);
  const [serviceItemId, setServiceItemId] = useState('');
  const [serviceItemSubtaskId, setServiceItemSubtaskId] =
    useState('');

  // Compute hours from start/end times (supports HH:MM or HH:MM:SS)
  const computedHours = (() => {
    const sp = startTime.split(':').map(Number);
    const ep = endTime.split(':').map(Number);
    const startSec =
      (sp[0] ?? 0) * 3600 + (sp[1] ?? 0) * 60 + (sp[2] ?? 0);
    const endSec =
      (ep[0] ?? 0) * 3600 + (ep[1] ?? 0) * 60 + (ep[2] ?? 0);
    const diff = endSec - startSec;
    if (diff <= 0) return 0;
    return Math.round((diff / 3600) * 10000) / 10000;
  })();

  const effectiveHours =
    inputMode === 'times'
      ? computedHours
      : parseFloat(directHours) || 0;

  // Fetch projects (with service type category for engineering detection)
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['projects-simple'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/projects?limit=100`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : (data.projects ?? data.data ?? []);
    },
  });

  const selectedProject = projects.find((p) => p.id === projectId);
  const isEngineeringProject =
    selectedProject?.jobType?.division?.name === 'Engineering';

  // Fetch work codes — only when an engineering project is selected
  const { data: workCodes = [] } = useQuery<WorkCode[]>({
    queryKey: ['work-codes'],
    queryFn: () => workCodesApi.getAll(),
    enabled: isEngineeringProject,
  });
  const workCodeGroups = groupWorkCodes(workCodes);

  // Fetch service items (with subtasks embedded)
  const { data: serviceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['service-items-active'],
    queryFn: () => serviceItemsApi.getAll(),
  });

  // Fetch service items linked to the selected project
  const { data: projectServiceItems } = useQuery<
    ProjectServiceItem[]
  >({
    queryKey: ['project-service-items', projectId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/projects/${projectId}/service-items`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      return res.json();
    },
    enabled: !!projectId,
  });

  // If project has linked service items, restrict dropdown to those; otherwise show all
  const projectLinkedItems =
    projectId && projectServiceItems && projectServiceItems.length > 0
      ? projectServiceItems.map((psi) => psi.serviceItem)
      : null;

  const baseServiceItems = projectLinkedItems ?? serviceItems;
  const visibleServiceItems = isIndot
    ? baseServiceItems.filter((si) => si.isIndot)
    : baseServiceItems;

  // The selected service item (used for estimated cost display)
  const selectedItem = serviceItems.find(
    (si) => si.id === serviceItemId,
  );

  // Subtask budget: budget/logged/remaining when a project + subtask are selected
  const { data: subtaskBudget } = useQuery<{
    budgetHours: number;
    loggedHours: number;
    remainingHours: number;
    role: string | null;
  } | null>({
    queryKey: [
      'subtask-budget',
      projectId,
      serviceItemSubtaskId,
      targetUser?.id,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId,
        serviceItemSubtaskId,
      });
      if (targetUser?.id) params.set('targetUserId', targetUser.id);
      const res = await fetch(
        `${API_URL}/time-tracking/subtask-budget?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!projectId && !!serviceItemSubtaskId,
    staleTime: 30_000,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (entry) {
      // Editing an existing entry — use direct hours mode since we don't store start/end times
      setInputMode('hours');
      setDate(entry.date.split('T')[0]);
      setDirectHours(String(entry.hours));
      setStartTime('08:00');
      setEndTime('09:00');
      setProjectId(entry.projectId ?? '');
      setIsIndot(
        projects.find((p) => p.id === entry.projectId)?.isIndot ??
          false,
      );
      setDescription(entry.description ?? '');
      setBillable(entry.billable);
      setWorkCodeId(entry.workCodeId ?? '');
      setServiceItemId(entry.serviceItemId ?? '');
      setServiceItemSubtaskId(entry.serviceItemSubtaskId ?? '');
    } else {
      setInputMode('times');
      if (initialDate) {
        setDate(initialDate);
      } else {
        const today = new Date();
        setDate(
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        );
      }
      setStartTime('08:00');
      const ih = initialHours || 1;
      const endTotalMin = 8 * 60 + Math.round(ih * 60);
      const eh = Math.floor(endTotalMin / 60);
      const em = endTotalMin % 60;
      setEndTime(
        `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
      );
      setDirectHours('');
      setProjectId(initialProjectId ?? '');
      setDescription('');
      setBillable(null);
      setWorkCodeId('');
      setIsIndot(
        projects.find((p) => p.id === initialProjectId)?.isIndot ??
          false,
      );
      setServiceItemId('');
      setServiceItemSubtaskId('');
    }
  }, [
    entry,
    open,
    initialHours,
    initialProjectId,
    initialDate,
    projects,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Reset work code / service item / isIndot when project changes
  const handleProjectChange = (val: string) => {
    const newProjectId = val === '__none__' ? '' : val;
    setProjectId(newProjectId);
    const newProject = projects.find((p) => p.id === newProjectId);
    if (newProject?.jobType?.division?.name !== 'Engineering') {
      setWorkCodeId('');
    }
    const newIsIndot = newProject?.isIndot ?? false;
    if (newIsIndot !== isIndot) {
      setIsIndot(newIsIndot);
    }
    // Always clear service item when switching projects — the linked items list changes
    setServiceItemId('');
    setServiceItemSubtaskId('');
  };

  const handleIsIndotChange = (val: string) => {
    setIsIndot(val === 'yes');
    setProjectId('');
    setWorkCodeId('');
    setServiceItemId('');
    setServiceItemSubtaskId('');
  };

  const canSave =
    effectiveHours >= 0.25 &&
    effectiveHours <= 24 &&
    billable !== null &&
    (!isEngineeringProject || !!workCodeId);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        date,
        hours: effectiveHours,
        projectId: projectId || undefined,
        description: description || undefined,
        billable: billable!,
        workCodeId: workCodeId || undefined,
        serviceItemId: serviceItemId || undefined,
        serviceItemSubtaskId: serviceItemSubtaskId || undefined,
      };

      if (entry) {
        return ttFetch(`/entries/${entry.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        if (targetUser) payload.targetUserId = targetUser.id;
        return ttFetch('/entries', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(entry ? 'Entry updated' : 'Time logged');
      onSaved();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl flex flex-col max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {entry ? 'Edit Time Entry' : 'Log Time'}
          </DialogTitle>
          {targetUser && !entry && (
            <p className="text-sm text-muted-foreground mt-1">
              Logging on behalf of{' '}
              <span className="font-medium text-foreground">
                {targetUser.name}
              </span>
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              clearable={false}
            />
          </div>

          {/* Time input mode toggle */}
          <div className="flex gap-1 rounded-md border p-1 w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setInputMode('times')}
              className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded text-xs font-medium transition-colors text-center ${
                inputMode === 'times'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              Start / End Time
            </button>
            <button
              type="button"
              onClick={() => setInputMode('hours')}
              className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded text-xs font-medium transition-colors text-center ${
                inputMode === 'hours'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              Total Hours
            </button>
          </div>

          {inputMode === 'times' ? (
            <>
              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Start Time</Label>
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    minuteStep={1}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">End Time</Label>
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    minuteStep={1}
                  />
                </div>
              </div>

              {/* Duration display */}
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Duration:
                </span>
                {computedHours > 0 ? (
                  <span className="text-sm font-medium tabular-nums">
                    {(() => {
                      const totalMin = Math.round(computedHours * 60);
                      const hh = Math.floor(totalMin / 60);
                      const mm = totalMin % 60;
                      return `${hh}h ${mm}m (${computedHours.toFixed(2)} hrs)`;
                    })()}
                  </span>
                ) : (
                  <span className="text-sm text-destructive">
                    End time must be after start time
                  </span>
                )}
              </div>
            </>
          ) : (
            /* Direct hours input */
            <div className="space-y-1.5">
              <Label>
                Hours <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0.25}
                max={24}
                step={0.25}
                value={directHours}
                onChange={(e) => setDirectHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-36"
              />
              {directHours &&
                (parseFloat(directHours) < 0.25 ||
                  parseFloat(directHours) > 24) && (
                  <p className="text-xs text-destructive">
                    Must be between 0.25 and 24 hours
                  </p>
                )}
            </div>
          )}

          {/* INDOT toggle */}
          <div className="space-y-1.5">
            <Label>INDOT Project?</Label>
            <RadioGroup
              value={isIndot ? 'yes' : 'no'}
              onValueChange={handleIsIndotChange}
              className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="tt-indot-yes" />
                <Label htmlFor="tt-indot-yes">Yes</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="tt-indot-no" />
                <Label htmlFor="tt-indot-no">No</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Project</Label>
            <SearchableSelect
              value={projectId}
              onValueChange={handleProjectChange}
              placeholder="Select project (optional)"
              searchPlaceholder="Search by job number or name…"
              emptyMessage="No projects found."
              options={[
                { value: '__none__', label: 'None' },
                ...projects
                  .filter((p) =>
                    isIndot ? p.isIndot === true : !p.isIndot,
                  )
                  .map((p) => ({
                    value: p.id,
                    label: p.jobNumber
                      ? `${p.jobNumber} · ${p.name}`
                      : p.name,
                    keywords: p.jobNumber ?? undefined,
                  })),
              ]}
            />
          </div>

          {/* Work Code — required for engineering projects */}
          {isEngineeringProject && (
            <div className="space-y-1.5">
              <Label>
                Work Code <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={workCodeId}
                onValueChange={setWorkCodeId}
                placeholder="Select work code…"
                searchPlaceholder="Search by code or name…"
                emptyMessage="No work codes found."
                options={workCodeGroups.flatMap(
                  ({ mainTask, subtasks }) =>
                    subtasks.length > 0
                      ? subtasks.map((st) => ({
                          value: st.id,
                          label: `${st.code} – ${st.name}`,
                          keywords: String(mainTask.code),
                        }))
                      : [
                          {
                            value: mainTask.id,
                            label: `${mainTask.code} – ${mainTask.name}`,
                          },
                        ],
                )}
              />
              {!workCodeId && (
                <p className="text-xs text-muted-foreground">
                  Work code is required for engineering projects
                </p>
              )}
            </div>
          )}

          {/* Service Item + Subtask — grouped picker */}
          <ServiceSubtaskPicker
            serviceItems={visibleServiceItems}
            helperText={
              projectLinkedItems
                ? `(${projectLinkedItems.length} linked to project)`
                : undefined
            }
            serviceItemId={serviceItemId}
            serviceItemSubtaskId={serviceItemSubtaskId}
            onSelect={(siId, stId) => {
              setServiceItemId(siId);
              setServiceItemSubtaskId(stId);
            }}
          />

          {/* Subtask budget callout */}
          {subtaskBudget && subtaskBudget.budgetHours > 0 && (
            <div className="flex items-center gap-4 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <div>
                <span className="text-muted-foreground">Budget </span>
                <span className="font-semibold tabular-nums">
                  {subtaskBudget.budgetHours.toFixed(1)} hrs
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Logged </span>
                <span className="font-semibold tabular-nums">
                  {subtaskBudget.loggedHours.toFixed(1)} hrs
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Remaining{' '}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    subtaskBudget.remainingHours < 0
                      ? 'text-red-600'
                      : 'text-green-600',
                  )}>
                  {subtaskBudget.remainingHours >= 0 ? '' : '−'}
                  {Math.abs(subtaskBudget.remainingHours).toFixed(
                    1,
                  )}{' '}
                  hrs
                </span>
              </div>
            </div>
          )}

          {/* Cost estimate — shown when a priced service item is selected and hours are valid */}
          {selectedItem?.defaultPrice != null &&
            effectiveHours >= 0.25 && (
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  Estimated cost:
                </span>
                <span className="text-sm font-medium tabular-nums">
                  $
                  {(
                    selectedItem.defaultPrice * effectiveHours
                  ).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">
                  (${selectedItem.defaultPrice.toFixed(2)}/hr ×{' '}
                  {effectiveHours.toFixed(2)} hrs)
                </span>
              </div>
            )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={2}
            />
          </div>

          {/* Billable selection — nothing selected by default */}
          <div className="space-y-1.5">
            <Label>
              Billable <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={billable === true ? 'default' : 'outline'}
                className={`flex-1 sm:flex-none ${billable === true ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                onClick={() => setBillable(true)}>
                Billable
              </Button>
              <Button
                type="button"
                size="sm"
                variant={billable === false ? 'default' : 'outline'}
                className={`flex-1 sm:flex-none ${billable === false ? 'bg-slate-600 hover:bg-slate-700 text-white' : ''}`}
                onClick={() => setBillable(false)}>
                Non-billable
              </Button>
            </div>
            {billable === null && (
              <p className="text-xs text-muted-foreground">
                Please select whether this entry is billable
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-11 sm:h-9"
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="h-11 sm:h-9"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSave}>
            {saveMutation.isPending
              ? 'Saving…'
              : entry
                ? 'Update'
                : 'Log Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
