'use client';

import { useState, useCallback, useRef } from 'react';
import { Briefcase, Wrench, Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { serviceItemsApi } from '@/lib/api/client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { CostBreakdownLine, CostBreakdownRoleEstimate } from '@/lib/types';
import CostBreakdownSubtaskSection from './CostBreakdownSubtaskSection';
import { toast } from 'sonner';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  line: CostBreakdownLine;
  roles: RoleResponse[];
  onChange: (updatedLine: CostBreakdownLine) => void;
  roleDisplayNames?: Record<string, string> | null;
  onDisplayNameChange?: (roleString: string, newName: string) => Promise<void> | void;
  disabled?: boolean;
}

export default function CostBreakdownLineCard({
  line,
  roles,
  onChange,
  roleDisplayNames,
  onDisplayNameChange,
  disabled = false,
}: Props) {
  const isField = line.serviceItem.description === 'Field';
  const [addingTask, setAddingTask] = useState(false);

  // Service item name inline editing
  const [editingSiName, setEditingSiName] = useState(false);
  const [siNameInput, setSiNameInput] = useState('');
  const [pendingSiRename, setPendingSiRename] = useState<{ old: string; newName: string } | null>(null);
  const [renamingSi, setRenamingSi] = useState(false);

  const startEditSiName = () => {
    setSiNameInput(line.serviceItem.name);
    setEditingSiName(true);
  };

  const attemptSiRename = () => {
    const trimmed = siNameInput.trim();
    setEditingSiName(false);
    if (!trimmed || trimmed === line.serviceItem.name) return;
    setPendingSiRename({ old: line.serviceItem.name, newName: trimmed });
  };

  const confirmSiRename = async () => {
    if (!pendingSiRename) return;
    setRenamingSi(true);
    try {
      await serviceItemsApi.update(line.serviceItemId, { name: pendingSiRename.newName });
      onChange({ ...line, serviceItem: { ...line.serviceItem, name: pendingSiRename.newName } });
    } catch {
      toast.error('Failed to rename service item');
    } finally {
      setPendingSiRename(null);
      setRenamingSi(false);
    }
  };
  const [newTaskName, setNewTaskName] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);

  const phaseTotal = line.roleEstimates.reduce((s, r) => s + r.estimatedHours, 0);
  const phaseCost = line.roleEstimates.reduce(
    (s, r) => (r.hourlyRate != null ? s + r.estimatedHours * r.hourlyRate : s),
    0,
  );
  const hasMissingRates = line.roleEstimates.some((r) => r.hourlyRate == null);

  const handleAddTask = useCallback(async () => {
    const name = newTaskName.trim();
    if (!name) return;
    setSavingTask(true);
    try {
      const created = await serviceItemsApi.createSubtask(line.serviceItemId, {
        name,
        sortOrder: line.serviceItem.subtasks.length,
      });
      onChange({
        ...line,
        serviceItem: {
          ...line.serviceItem,
          subtasks: [...line.serviceItem.subtasks, created],
        },
      });
      setNewTaskName('');
      setAddingTask(false);
    } catch {
      toast.error('Failed to add task');
    } finally {
      setSavingTask(false);
    }
  }, [newTaskName, line, onChange]);

  const handleRemoveSubtask = useCallback(
    async (subtaskId: string) => {
      const next = [...(line.excludedSubtaskIds ?? []), subtaskId];
      try {
        await costBreakdownApi.updateLine(line.id, { excludedSubtaskIds: next });
        onChange({ ...line, excludedSubtaskIds: next });
      } catch {
        toast.error('Failed to remove task');
      }
    },
    [line, onChange],
  );

  const handleAddEstimate = useCallback(
    (created: CostBreakdownRoleEstimate) => {
      onChange({ ...line, roleEstimates: [...line.roleEstimates, created] });
    },
    [line, onChange],
  );

  const handleUpdateEstimate = useCallback(
    async (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => {
      try {
        await costBreakdownApi.upsertRoleEstimate(line.id, {
          subtaskId: estimate.subtaskId,
          role: estimate.role,
          estimatedHours: hours,
          hourlyRate: rate,
        });
        onChange({
          ...line,
          roleEstimates: line.roleEstimates.map((r) =>
            r.id === estimate.id ? { ...r, estimatedHours: hours, hourlyRate: rate ?? null } : r,
          ),
        });
      } catch {
        // EstimateRow shows its own toast
      }
    },
    [line, onChange],
  );

  const handleDeleteEstimate = useCallback(
    (estimate: CostBreakdownRoleEstimate) => {
      onChange({
        ...line,
        roleEstimates: line.roleEstimates.filter((r) => r.id !== estimate.id),
      });
    },
    [line, onChange],
  );

  const handleReplaceEstimate = useCallback(
    (oldEstimate: CostBreakdownRoleEstimate, newEstimate: CostBreakdownRoleEstimate) => {
      onChange({
        ...line,
        roleEstimates: [
          ...line.roleEstimates.filter((r) => r.id !== oldEstimate.id),
          newEstimate,
        ],
      });
    },
    [line, onChange],
  );

  const excluded = new Set(line.excludedSubtaskIds ?? []);
  const visibleSubtasks = line.serviceItem.subtasks
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((s) => !excluded.has(s.id));

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
        <div className="flex items-center gap-2">
          {isField ? (
            <Wrench className="h-4 w-4 text-amber-600" />
          ) : (
            <Briefcase className="h-4 w-4 text-blue-600" />
          )}
          {editingSiName ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={siNameInput}
                onChange={(e) => setSiNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') attemptSiRename();
                  if (e.key === 'Escape') setEditingSiName(false);
                }}
                className="h-7 text-sm py-0 w-48"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={attemptSiRename}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditingSiName(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/siname">
              <span className="text-sm font-semibold">{line.serviceItem.name}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground opacity-0 group-hover/siname:opacity-100 transition-opacity"
                  onClick={startEditSiName}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium px-1.5 py-0 h-4',
              isField
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200',
            )}>
            {isField ? 'Field' : 'Office'}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {phaseTotal > 0 && <span>{phaseTotal.toFixed(1)} hrs</span>}
          {phaseCost > 0 && (
            <span className="ml-2 text-foreground font-medium">{formatCurrency(phaseCost)}</span>
          )}
          {hasMissingRates && phaseTotal > 0 && (
            <span className="ml-2 text-amber-600 text-[10px]">partial cost</span>
          )}
        </div>
      </div>

      {/* Subtask sections */}
      {visibleSubtasks.map((subtask) => (
        <CostBreakdownSubtaskSection
          key={subtask.id}
          subtask={subtask}
          lineId={line.id}
          estimates={line.roleEstimates.filter((e) => e.subtaskId === subtask.id)}
          roles={roles}
          defaultRate={line.serviceItem.defaultPrice}
          roleDisplayNames={roleDisplayNames}
          onDisplayNameChange={onDisplayNameChange}
          onAdd={handleAddEstimate}
          onUpdate={handleUpdateEstimate}
          onDelete={handleDeleteEstimate}
          onReplace={handleReplaceEstimate}
          onRemove={() => handleRemoveSubtask(subtask.id)}
          disabled={disabled}
          onRename={(newName) =>
            onChange({
              ...line,
              serviceItem: {
                ...line.serviceItem,
                subtasks: line.serviceItem.subtasks.map((s) =>
                  s.id === subtask.id ? { ...s, name: newName } : s,
                ),
              },
            })
          }
        />
      ))}

      {/* Add task footer — hidden when breakdown is finalised */}
      {!disabled && <div className="border-t border-border/30 px-4 py-2">
        {addingTask ? (
          <div className="flex items-center gap-2">
            <Input
              ref={taskInputRef}
              autoFocus
              placeholder="Task name..."
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') { setAddingTask(false); setNewTaskName(''); }
              }}
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleAddTask} disabled={savingTask || !newTaskName.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingTask(false); setNewTaskName(''); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] gap-1 border-dashed text-muted-foreground hover:text-foreground hover:border-border/80 w-full justify-center"
            onClick={() => setAddingTask(true)}>
            <Plus className="h-3 w-3" />
            Add Task
          </Button>
        )}
      </div>}

      <AlertDialog open={!!pendingSiRename} onOpenChange={(open) => { if (!open) setPendingSiRename(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename service item?</AlertDialogTitle>
            <AlertDialogDescription>
              Renaming <strong>&ldquo;{pendingSiRename?.old}&rdquo;</strong> to <strong>&ldquo;{pendingSiRename?.newName}&rdquo;</strong> will permanently update this service item across all cost breakdowns, quotes, and templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSiRename} disabled={renamingSi}>
              {renamingSi && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
