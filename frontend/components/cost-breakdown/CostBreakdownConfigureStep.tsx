'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { ServiceItem } from '@/lib/types';

// ── Transient UI types — not persisted to API, passed back via onConfirm ──────

export type ConfiguredItem = {
  serviceItem: ServiceItem;
  includedSubtaskIds: string[];
  customSubtasks: string[];
};

export type CbConfig = {
  items: ConfiguredItem[];
};

// ── Sub-component: one service item card ──────────────────────────────────────

interface CardProps {
  item: ConfiguredItem;
  index: number;
  total: number;
  onRemove: () => void;
  onToggleSubtask: (subtaskId: string) => void;
  onAddCustomSubtask: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ServiceItemConfigCard({
  item,
  index,
  total,
  onRemove,
  onToggleSubtask,
  onAddCustomSubtask,
  onMoveUp,
  onMoveDown,
}: CardProps) {
  const [customInput, setCustomInput] = useState('');

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onAddCustomSubtask(trimmed);
    setCustomInput('');
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-4 space-y-3">
      {/* Card header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{item.serviceItem.name}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove service item">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Existing subtasks */}
      {item.serviceItem.subtasks.length > 0 && (
        <div className="space-y-2 pl-1">
          {item.serviceItem.subtasks.map((st) => (
            <label
              key={st.id}
              className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={item.includedSubtaskIds.includes(st.id)}
                onCheckedChange={() => onToggleSubtask(st.id)}
              />
              <span className="text-sm text-foreground leading-none">{st.name}</span>
            </label>
          ))}
        </div>
      )}

      {/* Custom subtasks already added */}
      {item.customSubtasks.length > 0 && (
        <div className="space-y-1.5 pl-1">
          {item.customSubtasks.map((name) => (
            <div key={name} className="flex items-center gap-2.5 pl-6">
              <span className="text-sm text-muted-foreground italic">{name}</span>
              <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">custom</span>
            </div>
          ))}
        </div>
      )}

      {/* Add custom subtask */}
      <div className="flex items-center gap-2 pt-0.5">
        <Input
          placeholder="Add custom subtask…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  allServiceItems: ServiceItem[];
  prePopulated: ServiceItem[];
  onBack: () => void;
  onConfirm: (config: CbConfig) => void;
  creating: boolean;
}

export default function CostBreakdownConfigureStep({
  allServiceItems,
  prePopulated,
  onBack,
  onConfirm,
  creating,
}: Props) {
  const [items, setItems] = useState<ConfiguredItem[]>(() =>
    prePopulated.map((si) => ({
      serviceItem: si,
      includedSubtaskIds: si.subtasks.map((s) => s.id),
      customSubtasks: [],
    })),
  );
  const [addPickerValue, setAddPickerValue] = useState('');

  // Options for "add service item" picker — exclude already-listed items
  const usedIds = new Set(items.map((i) => i.serviceItem.id));
  const addableOptions = allServiceItems
    .filter((si) => !usedIds.has(si.id))
    .map((si) => ({ value: si.id, label: si.name }));

  // ── Mutation helpers ────────────────────────────────────────────────────────

  const removeItem = (serviceItemId: string) =>
    setItems((prev) => prev.filter((i) => i.serviceItem.id !== serviceItemId));

  const toggleSubtask = (serviceItemId: string, subtaskId: string) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.serviceItem.id !== serviceItemId) return i;
        const has = i.includedSubtaskIds.includes(subtaskId);
        return {
          ...i,
          includedSubtaskIds: has
            ? i.includedSubtaskIds.filter((id) => id !== subtaskId)
            : [...i.includedSubtaskIds, subtaskId],
        };
      }),
    );

  const addCustomSubtask = (serviceItemId: string, name: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.serviceItem.id !== serviceItemId
          ? i
          : { ...i, customSubtasks: [...i.customSubtasks, name] },
      ),
    );

  const addServiceItem = (id: string) => {
    const si = allServiceItems.find((s) => s.id === id);
    if (!si) return;
    setItems((prev) => [
      ...prev,
      {
        serviceItem: si,
        includedSubtaskIds: si.subtasks.map((s) => s.id),
        customSubtasks: [],
      },
    ]);
    setAddPickerValue('');
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const next = [...items];
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setItems(next);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display tracking-tight">Configure Items</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and adjust the service items that will be added to this cost breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={creating}>
            ← Back
          </Button>
          <Button
            onClick={() => onConfirm({ items })}
            disabled={creating || items.length === 0}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Cost Breakdown
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/10">
          <p className="text-sm text-muted-foreground">No service items selected.</p>
          <p className="text-xs text-muted-foreground mt-1">Add items from the catalog below.</p>
        </div>
      )}

      {/* Item cards */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <ServiceItemConfigCard
              key={item.serviceItem.id}
              item={item}
              index={index}
              total={items.length}
              onRemove={() => removeItem(item.serviceItem.id)}
              onToggleSubtask={(sid) => toggleSubtask(item.serviceItem.id, sid)}
              onAddCustomSubtask={(name) => addCustomSubtask(item.serviceItem.id, name)}
              onMoveUp={() => moveItem(index, 'up')}
              onMoveDown={() => moveItem(index, 'down')}
            />
          ))}
        </div>
      )}

      {/* Add service item from catalog */}
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-3">
        <p className="text-xs text-muted-foreground mb-2">Add a service item from the catalog</p>
        <SearchableSelect
          value={addPickerValue}
          onValueChange={addServiceItem}
          options={addableOptions}
          placeholder="Search service items…"
          searchPlaceholder="Search service items…"
          emptyMessage="No more service items available."
        />
        <p className="text-[11px] text-muted-foreground mt-2">
          Custom subtasks will be permanently saved to the service item for future use.
        </p>
      </div>
    </div>
  );
}
