'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItemSubtask, CostBreakdownRoleEstimate } from '@/lib/types';
import { toast } from 'sonner';

const SKIP_REMOVE_KEY = 'cb.skipRemoveSubtask';

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
  onRemove: () => void;
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
  onRemove,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newRate, setNewRate] = useState(defaultRate != null ? String(defaultRate) : '');
  const [saving, setSaving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Roles already added to this subtask (by key or free-text value)
  const usedRoles = new Set(estimates.map((e) => e.role));
  // Available API roles not yet used (shown as datalist suggestions)
  const availableRoles = roles.filter((r) => !usedRoles.has(r.key) && !usedRoles.has(r.label));

  const handleAdd = useCallback(async () => {
    if (!newRole.trim() || !newHours) return;
    const hours = parseFloat(newHours);
    const rate = newRate ? parseFloat(newRate) : undefined;
    if (isNaN(hours) || hours < 0) return;

    setSaving(true);
    try {
      const created = await costBreakdownApi.upsertRoleEstimate(lineId, {
        subtaskId: subtask.id,
        role: newRole.trim(),
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
  const datalistId = `roles-${subtask.id}`;

  return (
    <div className="border-t border-border/30 first:border-t-0">
      {/* Subtask header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/25">
        <span className="text-xs font-semibold text-foreground">{subtask.name}</span>
        <div className="flex items-center gap-2">
          {subtaskTotal > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {subtaskTotal.toFixed(1)} hrs
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            title="Remove from breakdown"
            onClick={() => {
              if (localStorage.getItem(SKIP_REMOVE_KEY) === 'true') {
                onRemove();
              } else {
                setDontShowAgain(false);
                setShowRemoveDialog(true);
              }
            }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Estimates — indented with left accent */}
      <div className="ml-4 border-l border-border/40">
        {estimates.length === 0 && !adding && (
          <div className="px-4 py-1.5 text-[11px] text-red-400 italic">
            No roles assigned
          </div>
        )}

        <div className="divide-y divide-border/15">
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
        </div>

        {/* Add form */}
        {adding ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/10">
            <datalist id={datalistId}>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.label} />
              ))}
            </datalist>
            <Input
              list={datalistId}
              placeholder="Role..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setAdding(false);
              }}
              className="h-7 w-44 text-xs"
              autoFocus
            />
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Hours"
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-7 w-20 text-xs"
            />
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="Rate (opt)"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-7 w-24 text-xs"
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
              disabled={saving || !newRole.trim() || !newHours}>
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
          <div className="px-4 py-1.5">
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

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove task from breakdown?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{subtask.name}</strong> will be hidden from this cost breakdown. The task itself
              is not deleted and can still be seen in the service item settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-1 pb-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(v) => setDontShowAgain(v === true)}
            />
            <label htmlFor="dont-show-again" className="text-sm text-muted-foreground cursor-pointer select-none">
              Don't show this again
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (dontShowAgain) localStorage.setItem(SKIP_REMOVE_KEY, 'true');
                onRemove();
              }}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const roleLabel = roles.find((r) => r.key === estimate.role || r.label === estimate.role)?.label ?? estimate.role;
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
