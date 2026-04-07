'use client';

import { useState, useCallback, useRef } from 'react';
import { Briefcase, Wrench, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
}

export default function CostBreakdownLineCard({ line, roles, onChange }: Props) {
  const isField = line.serviceItem.description === 'Field';
  const [addingTask, setAddingTask] = useState(false);
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

  const sortedSubtasks = line.serviceItem.subtasks.slice().sort((a, b) => a.sortOrder - b.sortOrder);

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
          <span className="text-sm font-semibold">{line.serviceItem.name}</span>
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
      {sortedSubtasks.map((subtask) => (
        <CostBreakdownSubtaskSection
          key={subtask.id}
          subtask={subtask}
          lineId={line.id}
          estimates={line.roleEstimates.filter((e) => e.subtaskId === subtask.id)}
          roles={roles}
          defaultRate={line.serviceItem.defaultPrice}
          onAdd={handleAddEstimate}
          onUpdate={handleUpdateEstimate}
          onDelete={handleDeleteEstimate}
        />
      ))}

      {/* Add task footer */}
      <div className="border-t border-border/30 px-4 py-2">
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
      </div>
    </div>
  );
}
