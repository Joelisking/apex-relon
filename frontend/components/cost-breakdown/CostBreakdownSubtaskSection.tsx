'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItemSubtask, CostBreakdownRoleEstimate } from '@/lib/types';
import { toast } from 'sonner';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  subtask: ServiceItemSubtask;
  lineId: string;
  estimates: CostBreakdownRoleEstimate[];
  roles: RoleResponse[];
  defaultRate?: number | null;
  onAdd: (estimate: CostBreakdownRoleEstimate) => void;
  onUpdate: (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => void;
  onDelete: (estimate: CostBreakdownRoleEstimate) => void;
}

export default function CostBreakdownSubtaskSection({
  subtask,
  lineId,
  estimates,
  roles,
  defaultRate,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newRate, setNewRate] = useState(defaultRate != null ? String(defaultRate) : '');
  const [saving, setSaving] = useState(false);

  const usedRoles = new Set(estimates.map((e) => e.role));
  const availableRoles = roles.filter((r) => !usedRoles.has(r.key));

  const handleAdd = useCallback(async () => {
    if (!newRole || !newHours) return;
    const hours = parseFloat(newHours);
    const rate = newRate ? parseFloat(newRate) : undefined;
    if (isNaN(hours) || hours < 0) return;

    setSaving(true);
    try {
      const created = await costBreakdownApi.upsertRoleEstimate(lineId, {
        subtaskId: subtask.id,
        role: newRole,
        estimatedHours: hours,
        hourlyRate: rate,
      });
      onAdd(created);
      setNewRole('');
      setNewHours('');
      setNewRate(defaultRate != null ? String(defaultRate) : '');
      setAdding(false);
    } catch {
      toast.error('Failed to add role');
    } finally {
      setSaving(false);
    }
  }, [newRole, newHours, newRate, lineId, subtask.id, defaultRate, onAdd]);

  const subtaskTotal = estimates.reduce((s, e) => s + e.estimatedHours, 0);

  return (
    <div className="border-t border-border/30 first:border-t-0">
      {/* Subtask header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/5">
        <span className="text-xs font-medium text-foreground/80">{subtask.name}</span>
        {subtaskTotal > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {subtaskTotal.toFixed(1)} hrs
          </span>
        )}
      </div>

      {/* Estimates */}
      <div className="divide-y divide-border/20">
        {estimates.map((estimate) => (
          <EstimateRow
            key={estimate.id}
            estimate={estimate}
            roles={roles}
            lineId={lineId}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}

        {estimates.length === 0 && !adding && (
          <div className="px-4 py-1.5 text-[11px] text-muted-foreground italic">
            No roles assigned
          </div>
        )}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/10">
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="Role..." />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((r) => (
                <SelectItem key={r.id} value={r.key}>{r.label}</SelectItem>
              ))}
              {availableRoles.length === 0 && (
                <SelectItem value="__none" disabled>All roles added</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="Hours"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            className="h-7 w-20 text-xs"
          />
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="Rate (opt)"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            className="h-7 w-24 text-xs"
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={saving || !newRole || !newHours}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3" />
            Add Role
          </Button>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  estimate: CostBreakdownRoleEstimate;
  roles: RoleResponse[];
  lineId: string;
  onUpdate: (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => void;
  onDelete: (estimate: CostBreakdownRoleEstimate) => void;
}

function EstimateRow({ estimate, roles, lineId, onUpdate, onDelete }: RowProps) {
  const [hours, setHours] = useState(estimate.estimatedHours.toString());
  const [rate, setRate] = useState(estimate.hourlyRate?.toString() ?? '');

  const roleLabel = roles.find((r) => r.key === estimate.role)?.label ?? estimate.role;
  const cost = estimate.hourlyRate != null ? estimate.estimatedHours * estimate.hourlyRate : null;

  const handleBlur = useCallback(() => {
    const h = parseFloat(hours);
    const r = rate ? parseFloat(rate) : undefined;
    if (!isNaN(h) && h >= 0) onUpdate(estimate, h, r);
  }, [hours, rate, estimate, onUpdate]);

  const handleDelete = useCallback(async () => {
    try {
      await costBreakdownApi.deleteRoleEstimate(lineId, estimate.subtaskId, estimate.role);
      onDelete(estimate);
    } catch {
      toast.error('Failed to remove role');
    }
  }, [lineId, estimate, onDelete]);

  return (
    <div className="flex items-center gap-3 px-4 py-1.5">
      <span className="text-xs flex-1 min-w-0 truncate text-muted-foreground">{roleLabel}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={handleBlur}
          className="h-6 w-16 text-xs text-right tabular-nums"
        />
        <span className="text-[11px] text-muted-foreground">hrs</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">$</span>
        <Input
          type="number"
          min="0"
          step="1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={handleBlur}
          placeholder="—"
          className="h-6 w-16 text-xs text-right tabular-nums"
        />
        <span className="text-[11px] text-muted-foreground">/hr</span>
      </div>
      <span className="text-xs tabular-nums w-14 text-right text-muted-foreground">
        {cost != null ? formatCurrency(cost) : '—'}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
