'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ServiceSubtaskPicker } from '@/components/shared/ServiceSubtaskPicker';
import type { UpsertAddendumLineDto } from '@/lib/api/addenda-client';
import type { RoleResponse } from '@/lib/api/roles-client';
import type { ServiceItem } from '@/lib/types';

export type LineState = UpsertAddendumLineDto & { key: string };

export function blankLine(): LineState {
  return {
    key: crypto.randomUUID(),
    description: '',
    role: '',
    serviceItemId: '',
    serviceItemSubtaskId: '',
    estimatedHours: 0,
    billableRate: 0,
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── EditableLineRow ───────────────────────────────────────────────────────────

interface EditableLineRowProps {
  line: LineState;
  roles: RoleResponse[];
  serviceItems: ServiceItem[];
  onChange: (key: string, field: keyof UpsertAddendumLineDto, value: string | number) => void;
  onServiceItemChange: (key: string, serviceItemId: string, subtaskId: string) => void;
  onDelete: (key: string) => void;
}

function EditableLineRow({
  line,
  roles,
  serviceItems,
  onChange,
  onServiceItemChange,
  onDelete,
}: EditableLineRowProps) {
  const lineTotal = line.estimatedHours * line.billableRate;

  const roleOptions = roles.map((r) => ({ value: r.label, label: r.label }));

  const selectedItem = serviceItems.find((si) => si.id === line.serviceItemId);
  const selectedSubtask = selectedItem?.subtasks?.find(
    (st) => st.id === line.serviceItemSubtaskId,
  );
  const subtaskLabel = selectedItem
    ? selectedSubtask
      ? `${selectedItem.name} · ${selectedSubtask.name}`
      : selectedItem.name
    : null;

  return (
    <div className="space-y-2 rounded-md border border-border/40 bg-muted/10 p-3">
      {/* Row 1: Service Item/Subtask + Role */}
      <div className="grid grid-cols-[1fr_160px] gap-2 items-end">
        <ServiceSubtaskPicker
          serviceItems={serviceItems}
          serviceItemId={line.serviceItemId ?? ''}
          serviceItemSubtaskId={line.serviceItemSubtaskId ?? ''}
          onSelect={(siId, stId) => onServiceItemChange(line.key, siId, stId)}
          label="Service Item / Subtask"
          placeholder="Select service item / subtask…"
        />
        <div className="space-y-1.5">
          <Label className="text-xs">Role</Label>
          <SearchableSelect
            value={line.role ?? ''}
            onValueChange={(v) => onChange(line.key, 'role', v)}
            options={roleOptions}
            placeholder="Select role…"
            searchPlaceholder="Search roles…"
            emptyMessage="No roles found."
            className="h-9"
          />
        </div>
      </div>

      {/* Row 2: Description + Hours + Rate + Total + Delete */}
      <div className="grid grid-cols-[1fr_80px_90px_80px_32px] gap-2 items-center">
        <Input
          placeholder="Description / notes"
          value={line.description}
          onChange={(e) => onChange(line.key, 'description', e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          type="number"
          placeholder="Hrs"
          min="0"
          step="0.5"
          value={line.estimatedHours || ''}
          onChange={(e) => onChange(line.key, 'estimatedHours', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
        <Input
          type="number"
          placeholder="Rate"
          min="0"
          step="1"
          value={line.billableRate || ''}
          onChange={(e) => onChange(line.key, 'billableRate', parseFloat(e.target.value) || 0)}
          className="h-8 text-sm"
        />
        <span className="text-sm text-right tabular-nums">{fmt(lineTotal)}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={() => onDelete(line.key)}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Subtitle showing resolved service item for compact view */}
      {subtaskLabel && (
        <p className="text-[11px] text-muted-foreground pl-0.5">
          {subtaskLabel}
          {line.role && <span className="ml-1.5">· {line.role}</span>}
        </p>
      )}
    </div>
  );
}

// ─── LinesEditor ─────────────────────────────────────────────────────────────

interface LinesEditorProps {
  lines: LineState[];
  roles: RoleResponse[];
  serviceItems: ServiceItem[];
  onAdd: () => void;
  onChange: (key: string, field: keyof UpsertAddendumLineDto, value: string | number) => void;
  onServiceItemChange: (key: string, serviceItemId: string, subtaskId: string) => void;
  onDelete: (key: string) => void;
}

export function AddendumLinesEditor({
  lines,
  roles,
  serviceItems,
  onAdd,
  onChange,
  onServiceItemChange,
  onDelete,
}: LinesEditorProps) {
  const total = lines.reduce((s, l) => s + l.estimatedHours * l.billableRate, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Line Items</Label>
        <Button variant="ghost" size="sm" onClick={onAdd} className="h-7 gap-1 text-xs" type="button">
          <Plus className="h-3 w-3" /> Add Line
        </Button>
      </div>
      {lines.length > 0 ? (
        <div className="space-y-2">
          {lines.map((line) => (
            <EditableLineRow
              key={line.key}
              line={line}
              roles={roles}
              serviceItems={serviceItems}
              onChange={onChange}
              onServiceItemChange={onServiceItemChange}
              onDelete={onDelete}
            />
          ))}
          <div className="flex justify-end pt-2 border-t border-border/30">
            <span className="text-sm font-semibold tabular-nums">{fmt(total)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-sm text-muted-foreground">
          No line items — click &ldquo;Add Line&rdquo; to start
        </div>
      )}
    </div>
  );
}
