'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, X, Pencil, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import { serviceItemsApi } from '@/lib/api/client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItemSubtask, CostBreakdownRoleEstimate } from '@/lib/types';
import { getEffectiveRoleLabel, getCanonicalRoleLabel } from './role-label.util';
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
  roleDisplayNames?: Record<string, string> | null;
  onDisplayNameChange?: (roleString: string, newName: string) => Promise<void> | void;
  onAdd: (estimate: CostBreakdownRoleEstimate) => void;
  onUpdate: (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => void;
  onDelete: (estimate: CostBreakdownRoleEstimate) => void;
  onReplace?: (oldEstimate: CostBreakdownRoleEstimate, newEstimate: CostBreakdownRoleEstimate) => void;
  onRemove: () => void;
  onRename?: (newName: string) => void;
  disabled?: boolean;
}

export default function CostBreakdownSubtaskSection({
  subtask,
  lineId,
  estimates,
  roles,
  defaultRate,
  roleDisplayNames,
  onDisplayNameChange,
  onAdd,
  onUpdate,
  onDelete,
  onReplace,
  onRemove,
  onRename,
  disabled = false,
}: Props) {
  const [adding, setAdding] = useState(false);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [pendingRename, setPendingRename] = useState<{ old: string; newName: string } | null>(null);
  const [renaming, setRenaming] = useState(false);

  const startEditName = () => {
    setNameInput(subtask.name);
    setEditingName(true);
  };

  const attemptRename = () => {
    const trimmed = nameInput.trim();
    setEditingName(false);
    if (!trimmed || trimmed === subtask.name) return;
    setPendingRename({ old: subtask.name, newName: trimmed });
  };

  const confirmRename = async () => {
    if (!pendingRename) return;
    setRenaming(true);
    try {
      await serviceItemsApi.updateSubtask(subtask.serviceItemId, subtask.id, { name: pendingRename.newName });
      onRename?.(pendingRename.newName);
    } catch {
      toast.error('Failed to rename subtask');
    } finally {
      setPendingRename(null);
      setRenaming(false);
    }
  };
  const [newRole, setNewRole] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newRate, setNewRate] = useState(defaultRate != null ? String(defaultRate) : '');
  const [saving, setSaving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Roles already added to this subtask (by key or free-text value)
  const usedRoles = new Set(estimates.map((e) => e.role));
  // Available API roles not yet used (shown as datalist suggestions)
  const availableRoles = roles.filter((r) => !usedRoles.has(r.key) && !usedRoles.has(r.label));

  const handleSelectNewRole = useCallback(
    (role: string) => {
      setNewRole(role);
      const existing = role ? roleDisplayNames?.[role]?.trim() ?? '' : '';
      setNewDisplayName(existing);
    },
    [roleDisplayNames],
  );

  const handleAdd = useCallback(async () => {
    if (!newRole.trim() || !newHours) return;
    const hours = parseFloat(newHours);
    const rate = newRate ? parseFloat(newRate) : undefined;
    if (isNaN(hours) || hours < 0) return;

    setSaving(true);
    try {
      const roleString = newRole.trim();
      const created = await costBreakdownApi.upsertRoleEstimate(lineId, {
        subtaskId: subtask.id,
        role: roleString,
        estimatedHours: hours,
        hourlyRate: rate,
      });
      onAdd(created);
      // Persist breakdown-global display name if it differs from the current override
      if (onDisplayNameChange) {
        const currentOverride = roleDisplayNames?.[roleString]?.trim() ?? '';
        const nextOverride = newDisplayName.trim();
        if (nextOverride !== currentOverride) {
          await onDisplayNameChange(roleString, nextOverride);
        }
      }
      setNewRole('');
      setNewDisplayName('');
      setNewHours('');
      setNewRate(defaultRate != null ? String(defaultRate) : '');
      setAdding(false);
    } catch {
      toast.error('Failed to add role');
    } finally {
      setSaving(false);
    }
  }, [newRole, newDisplayName, newHours, newRate, lineId, subtask.id, defaultRate, onAdd, onDisplayNameChange, roleDisplayNames]);

  const subtaskTotal = estimates.reduce((s, e) => s + e.estimatedHours, 0);

  return (
    <div className="border-t border-border/30 first:border-t-0">
      {/* Subtask header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/25">
        {editingName ? (
          <div className="flex items-center gap-1.5 flex-1 mr-2">
            <Input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attemptRename();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="h-6 text-xs py-0 flex-1"
            />
            <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600 hover:text-green-700" onClick={attemptRename}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => setEditingName(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group/name">
            <span className="text-xs font-semibold text-foreground">{subtask.name}</span>
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity"
                onClick={startEditName}>
                <Pencil className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {subtaskTotal > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {subtaskTotal.toFixed(1)} hrs
            </span>
          )}
          {!disabled && (
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
          )}
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
              roleDisplayNames={roleDisplayNames}
              onDisplayNameChange={onDisplayNameChange}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onRoleChange={async (newRole) => {
                try {
                  await costBreakdownApi.deleteRoleEstimate(lineId, estimate.subtaskId, estimate.role);
                  const created = await costBreakdownApi.upsertRoleEstimate(lineId, {
                    subtaskId: estimate.subtaskId,
                    role: newRole,
                    estimatedHours: estimate.estimatedHours,
                    hourlyRate: estimate.hourlyRate ?? undefined,
                  });
                  onReplace?.(estimate, created);
                } catch {
                  toast.error('Failed to update role');
                }
              }}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Add form — hidden when breakdown is finalised */}
        {!disabled && adding ? (
          <div className="flex flex-col gap-1 px-4 py-2 bg-muted/10">
            <div className="flex items-center gap-2">
              <SearchableSelect
                value={newRole}
                onValueChange={handleSelectNewRole}
                options={availableRoles.map((r) => ({ value: r.label, label: r.label }))}
                placeholder="Role..."
                searchPlaceholder="Search roles..."
                emptyMessage="No roles available."
                className="h-7 w-36 text-xs"
              />
              <Input
                placeholder="Display as… (opt)"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                maxLength={60}
                disabled={!onDisplayNameChange}
                className="h-7 w-36 text-xs"
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
                onClick={() => {
                  setAdding(false);
                  setNewRole('');
                  setNewDisplayName('');
                }}>
                Cancel
              </Button>
            </div>
            {newRole && onDisplayNameChange && (
              <p className="text-[10px] text-muted-foreground pl-1">
                Display name applies to this role across the whole breakdown.
              </p>
            )}
          </div>
        ) : !disabled ? (
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
        ) : null}
      </div>

      <AlertDialog open={!!pendingRename} onOpenChange={(open) => { if (!open) setPendingRename(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              Renaming <strong>&ldquo;{pendingRename?.old}&rdquo;</strong> to <strong>&ldquo;{pendingRename?.newName}&rdquo;</strong> will permanently update this subtask across all cost breakdowns and service item templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRename} disabled={renaming}>
              {renaming && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              Don&apos;t show this again
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
  roleDisplayNames?: Record<string, string> | null;
  onDisplayNameChange?: (roleString: string, newName: string) => Promise<void> | void;
  onUpdate: (estimate: CostBreakdownRoleEstimate, hours: number, rate?: number) => void;
  onDelete: (estimate: CostBreakdownRoleEstimate) => void;
  onRoleChange?: (newRole: string) => Promise<void>;
  disabled?: boolean;
}

function EstimateRow({
  estimate,
  roles,
  lineId,
  roleDisplayNames,
  onDisplayNameChange,
  onUpdate,
  onDelete,
  onRoleChange,
  disabled = false,
}: RowProps) {
  const [hours, setHours] = useState(estimate.estimatedHours.toString());
  const [rate, setRate] = useState(estimate.hourlyRate?.toString() ?? '');

  const canonicalLabel = getCanonicalRoleLabel(estimate.role, roles);
  const displayLabel = getEffectiveRoleLabel(estimate.role, roles, roleDisplayNames);
  const hasOverride = displayLabel !== canonicalLabel;
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
    } catch (err) {
      console.error('[deleteRoleEstimate] failed', { lineId, subtaskId: estimate.subtaskId, role: estimate.role, err });
      toast.error('Failed to remove role');
    }
  }, [lineId, estimate, onDelete]);

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 group/estrow">
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <span className="text-xs truncate text-muted-foreground">
          {displayLabel}
          {hasOverride && (
            <span className="ml-1 text-[10px] text-muted-foreground/60">· {canonicalLabel}</span>
          )}
        </span>
        {!disabled && (
          <RoleDisplayNamePopover
            roleString={estimate.role}
            canonicalLabel={canonicalLabel}
            currentOverride={roleDisplayNames?.[estimate.role] ?? ''}
            onSave={onDisplayNameChange}
            roles={roles}
            onRoleChange={onRoleChange}
          />
        )}
      </div>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="0.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onBlur={handleBlur}
          disabled={disabled}
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
          disabled={disabled}
          className="h-6 w-16 text-xs text-right tabular-nums"
        />
        <span className="text-[11px] text-muted-foreground">/hr</span>
      </div>
      <span className="text-xs tabular-nums w-14 text-right text-muted-foreground">
        {cost != null ? formatCurrency(cost) : '—'}
      </span>
      {!disabled && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface RoleDisplayNamePopoverProps {
  roleString: string;
  canonicalLabel: string;
  currentOverride: string;
  onSave?: (roleString: string, newName: string) => Promise<void> | void;
  roles?: RoleResponse[];
  onRoleChange?: (newRole: string) => Promise<void>;
}

function RoleDisplayNamePopover({
  roleString,
  canonicalLabel,
  currentOverride,
  onSave,
  roles,
  onRoleChange,
}: RoleDisplayNamePopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(roleString);
  const [draft, setDraft] = useState(currentOverride);
  const [busy, setBusy] = useState(false);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setSelectedRole(roleString);
        setDraft(currentOverride);
      }
      setOpen(next);
    },
    [currentOverride, roleString],
  );

  const handleSave = useCallback(async () => {
    setBusy(true);
    try {
      if (selectedRole !== roleString && onRoleChange) {
        await onRoleChange(selectedRole);
      } else if (onSave) {
        await onSave(roleString, draft);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [onSave, onRoleChange, roleString, selectedRole, draft]);

  const roleOptions = roles?.map((r) => ({ value: r.label, label: r.label })) ?? [];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 text-muted-foreground opacity-0 group-hover/estrow:opacity-100 transition-opacity"
          title="Edit role"
          aria-label="Edit role">
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="space-y-2">
          {roles && onRoleChange && (
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <SearchableSelect
                value={selectedRole}
                onValueChange={setSelectedRole}
                options={roleOptions}
                placeholder="Select role..."
                searchPlaceholder="Search roles..."
                emptyMessage="No roles found."
                className="h-7 text-xs"
              />
            </div>
          )}
          {onSave && selectedRole === roleString && (
            <div className="space-y-1">
              <Label htmlFor={`role-display-${roleString}`} className="text-xs">
                Display name
              </Label>
              <Input
                id={`role-display-${roleString}`}
                autoFocus={!roles}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={canonicalLabel}
                maxLength={60}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setOpen(false);
                }}
                className="h-7 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Applies across the whole breakdown. Leave blank to use the original name.
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-1 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => setOpen(false)}
              disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" className="h-6 text-xs" onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
