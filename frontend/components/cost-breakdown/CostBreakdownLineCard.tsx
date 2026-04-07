'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Briefcase, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { CostBreakdownLine, CostBreakdownRoleEstimate } from '@/lib/types';
import { toast } from 'sonner';

interface Props {
  line: CostBreakdownLine;
  roles: RoleResponse[];
  onChange: (updatedLine: CostBreakdownLine) => void;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function CostBreakdownLineCard({ line, roles, onChange }: Props) {
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newRate, setNewRate] = useState('');
  const [saving, setSaving] = useState(false);

  const phaseTotal = line.roleEstimates.reduce((s, r) => s + r.estimatedHours, 0);
  const phaseCost = line.roleEstimates.reduce(
    (s, r) => (r.hourlyRate != null ? s + r.estimatedHours * r.hourlyRate : s),
    0,
  );
  const hasMissingRates = line.roleEstimates.some((r) => r.hourlyRate == null);

  const officeField = line.serviceItem.description ?? 'Office';
  const tasks = line.serviceItem.subtasks.map((s) => s.name);
  const usedRoles = new Set(line.roleEstimates.map((r) => r.role));
  const availableRoles = roles.filter((r) => !usedRoles.has(r.key));

  const handleUpdateEstimate = useCallback(
    async (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => {
      try {
        await costBreakdownApi.upsertRoleEstimate(line.id, {
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
        toast.error('Failed to update hours');
      }
    },
    [line, onChange],
  );

  const handleDeleteEstimate = useCallback(
    async (estimate: CostBreakdownRoleEstimate) => {
      try {
        await costBreakdownApi.deleteRoleEstimate(line.id, estimate.role);
        onChange({
          ...line,
          roleEstimates: line.roleEstimates.filter((r) => r.id !== estimate.id),
        });
      } catch {
        toast.error('Failed to remove role');
      }
    },
    [line, onChange],
  );

  const handleAddRole = useCallback(async () => {
    if (!newRole || !newHours) return;
    const hours = parseFloat(newHours);
    const rate = newRate ? parseFloat(newRate) : undefined;
    if (isNaN(hours) || hours < 0) return;

    setSaving(true);
    try {
      const created = await costBreakdownApi.upsertRoleEstimate(line.id, {
        role: newRole,
        estimatedHours: hours,
        hourlyRate: rate,
      });
      onChange({
        ...line,
        roleEstimates: [...line.roleEstimates, created],
      });
      setNewRole('');
      setNewHours('');
      setNewRate('');
      setAddingRole(false);
    } catch {
      toast.error('Failed to add role');
    } finally {
      setSaving(false);
    }
  }, [newRole, newHours, newRate, line, onChange]);

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
        <div className="flex items-center gap-2">
          {officeField === 'Field' ? (
            <Wrench className="h-4 w-4 text-amber-600" />
          ) : (
            <Briefcase className="h-4 w-4 text-blue-600" />
          )}
          <span className="text-sm font-semibold">{line.serviceItem.name}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium px-1.5 py-0 h-4',
              officeField === 'Field'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200',
            )}>
            {officeField}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {phaseTotal.toFixed(1)} hrs
          {phaseCost > 0 && <span className="ml-2 text-foreground font-medium">{formatCurrency(phaseCost)}</span>}
        </div>
      </div>

      {/* Tasks reference */}
      {tasks.length > 0 && (
        <div className="px-4 py-2 bg-muted/10 border-b border-border/30">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">Tasks: </span>
            {tasks.join(' · ')}
          </p>
        </div>
      )}

      {/* Role estimates */}
      <div className="divide-y divide-border/30">
        {line.roleEstimates.length === 0 && !addingRole && (
          <div className="px-4 py-3 text-xs text-muted-foreground italic">
            No roles assigned — click + Add Role to estimate hours
          </div>
        )}

        {line.roleEstimates.map((estimate) => (
          <RoleEstimateRow
            key={estimate.id}
            estimate={estimate}
            roles={roles}
            onUpdate={handleUpdateEstimate}
            onDelete={handleDeleteEstimate}
          />
        ))}

        {addingRole && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="h-7 w-44 text-xs">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.id} value={r.key}>
                    {r.label}
                  </SelectItem>
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
            <Button size="sm" className="h-7 text-xs" onClick={handleAddRole} disabled={saving || !newRole || !newHours}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingRole(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-t border-border/30">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setAddingRole(true);
            if (line.serviceItem.defaultPrice != null) {
              setNewRate(line.serviceItem.defaultPrice.toString());
            }
          }}
          disabled={addingRole}>
          <Plus className="h-3 w-3" />
          Add Role
        </Button>
        {hasMissingRates && (
          <p className="text-[10px] text-amber-600">Some roles missing hourly rate</p>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  estimate: CostBreakdownRoleEstimate;
  roles: RoleResponse[];
  onUpdate: (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => void;
  onDelete: (estimate: CostBreakdownRoleEstimate) => void;
}

function RoleEstimateRow({ estimate, roles, onUpdate, onDelete }: RowProps) {
  const [hours, setHours] = useState(estimate.estimatedHours.toString());
  const [rate, setRate] = useState(estimate.hourlyRate?.toString() ?? '');

  const roleLabel = roles.find((r) => r.key === estimate.role)?.label ?? estimate.role;
  const cost = estimate.hourlyRate != null ? estimate.estimatedHours * estimate.hourlyRate : null;

  const handleBlur = () => {
    const h = parseFloat(hours);
    const r = rate ? parseFloat(rate) : undefined;
    if (!isNaN(h) && h >= 0) {
      onUpdate(estimate, h, r);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="text-sm flex-1 min-w-0 truncate">{roleLabel}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={handleBlur}
          className="h-7 w-20 text-xs text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground w-6">hrs</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <Input
          type="number"
          min="0"
          step="1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={handleBlur}
          placeholder="—"
          className="h-7 w-20 text-xs text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground w-6">/hr</span>
      </div>
      <span className="text-xs tabular-nums w-16 text-right text-muted-foreground">
        {cost != null ? formatCurrency(cost) : '—'}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(estimate)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
