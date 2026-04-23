'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Loader2, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import { serviceItemsApi } from '@/lib/api/client';
import { toast } from 'sonner';
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
  onRenameServiceItem: (newName: string) => void;
  onRenameSubtask: (subtaskId: string, newName: string) => void;
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
  onRenameServiceItem,
  onRenameSubtask,
}: CardProps) {
  const [customInput, setCustomInput] = useState('');

  // Service item name inline editing
  const [editingSiName, setEditingSiName] = useState(false);
  const [siNameInput, setSiNameInput] = useState('');
  const [pendingSiRename, setPendingSiRename] = useState<{ old: string; newName: string } | null>(null);
  const [renamingSi, setRenamingSi] = useState(false);

  const attemptSiRename = () => {
    const trimmed = siNameInput.trim();
    setEditingSiName(false);
    if (!trimmed || trimmed === item.serviceItem.name) return;
    setPendingSiRename({ old: item.serviceItem.name, newName: trimmed });
  };

  const confirmSiRename = async () => {
    if (!pendingSiRename) return;
    setRenamingSi(true);
    try {
      await serviceItemsApi.update(item.serviceItem.id, { name: pendingSiRename.newName });
      onRenameServiceItem(pendingSiRename.newName);
    } catch {
      toast.error('Failed to rename service item');
    } finally {
      setPendingSiRename(null);
      setRenamingSi(false);
    }
  };

  // Subtask name inline editing
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [subtaskNameInput, setSubtaskNameInput] = useState('');
  const [pendingSubtaskRename, setPendingSubtaskRename] = useState<{ subtaskId: string; old: string; newName: string } | null>(null);
  const [renamingSubtask, setRenamingSubtask] = useState(false);

  const attemptSubtaskRename = (subtaskId: string, oldName: string) => {
    const trimmed = subtaskNameInput.trim();
    setEditingSubtaskId(null);
    if (!trimmed || trimmed === oldName) return;
    setPendingSubtaskRename({ subtaskId, old: oldName, newName: trimmed });
  };

  const confirmSubtaskRename = async () => {
    if (!pendingSubtaskRename) return;
    setRenamingSubtask(true);
    try {
      await serviceItemsApi.updateSubtask(item.serviceItem.id, pendingSubtaskRename.subtaskId, { name: pendingSubtaskRename.newName });
      onRenameSubtask(pendingSubtaskRename.subtaskId, pendingSubtaskRename.newName);
    } catch {
      toast.error('Failed to rename subtask');
    } finally {
      setPendingSubtaskRename(null);
      setRenamingSubtask(false);
    }
  };

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
        {editingSiName ? (
          <div className="flex items-center gap-1.5 flex-1 mr-2">
            <Input
              autoFocus
              value={siNameInput}
              onChange={(e) => setSiNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attemptSiRename();
                if (e.key === 'Escape') setEditingSiName(false);
              }}
              className="h-7 text-sm py-0 flex-1"
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
            <span className="text-sm font-medium text-foreground">{item.serviceItem.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground opacity-0 group-hover/siname:opacity-100 transition-opacity"
              onClick={() => { setSiNameInput(item.serviceItem.name); setEditingSiName(true); }}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
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
            <div key={st.id} className="flex items-center gap-2.5 group/subtask">
              <Checkbox
                checked={item.includedSubtaskIds.includes(st.id)}
                onCheckedChange={() => onToggleSubtask(st.id)}
              />
              {editingSubtaskId === st.id ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <Input
                    autoFocus
                    value={subtaskNameInput}
                    onChange={(e) => setSubtaskNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') attemptSubtaskRename(st.id, st.name);
                      if (e.key === 'Escape') setEditingSubtaskId(null);
                    }}
                    className="h-6 text-xs py-0 flex-1"
                  />
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-green-600 hover:text-green-700" onClick={() => attemptSubtaskRename(st.id, st.name)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground" onClick={() => setEditingSubtaskId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-sm text-foreground leading-none">{st.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-muted-foreground opacity-0 group-hover/subtask:opacity-100 transition-opacity"
                    onClick={() => { setSubtaskNameInput(st.name); setEditingSubtaskId(st.id); }}>
                    <Pencil className="h-2.5 w-2.5" />
                  </Button>
                </div>
              )}
            </div>
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

      {/* Rename service item alert */}
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

      {/* Rename subtask alert */}
      <AlertDialog open={!!pendingSubtaskRename} onOpenChange={(open) => { if (!open) setPendingSubtaskRename(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename subtask?</AlertDialogTitle>
            <AlertDialogDescription>
              Renaming <strong>&ldquo;{pendingSubtaskRename?.old}&rdquo;</strong> to <strong>&ldquo;{pendingSubtaskRename?.newName}&rdquo;</strong> will permanently update this subtask across all cost breakdowns and service item templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubtaskRename} disabled={renamingSubtask}>
              {renamingSubtask && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  allServiceItems: ServiceItem[];
  prePopulated: ServiceItem[];
  initialItems?: ConfiguredItem[];
  onBack: () => void;
  onConfirm: (config: CbConfig) => void;
  creating: boolean;
}

export default function CostBreakdownConfigureStep({
  allServiceItems,
  prePopulated,
  initialItems,
  onBack,
  onConfirm,
  creating,
}: Props) {
  const [items, setItems] = useState<ConfiguredItem[]>(() =>
    initialItems ??
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

  const renameServiceItem = (serviceItemId: string, newName: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.serviceItem.id !== serviceItemId
          ? i
          : { ...i, serviceItem: { ...i.serviceItem, name: newName } },
      ),
    );

  const renameSubtask = (serviceItemId: string, subtaskId: string, newName: string) =>
    setItems((prev) =>
      prev.map((i) =>
        i.serviceItem.id !== serviceItemId
          ? i
          : {
              ...i,
              serviceItem: {
                ...i.serviceItem,
                subtasks: i.serviceItem.subtasks.map((s) =>
                  s.id !== subtaskId ? s : { ...s, name: newName },
                ),
              },
            },
      ),
    );

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
              onRenameServiceItem={(newName) => renameServiceItem(item.serviceItem.id, newName)}
              onRenameSubtask={(subtaskId, newName) => renameSubtask(item.serviceItem.id, subtaskId, newName)}
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
