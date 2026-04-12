'use client';

import { useMemo, useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceItem } from '@/lib/types';

interface ServiceSubtaskPickerProps {
  serviceItems: ServiceItem[];
  serviceItemId: string;
  serviceItemSubtaskId: string;
  onSelect: (serviceItemId: string, serviceItemSubtaskId: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
}

export function ServiceSubtaskPicker({
  serviceItems,
  serviceItemId,
  serviceItemSubtaskId,
  onSelect,
  label = 'Service Item / Subtask',
  placeholder = 'Select service item / subtask (optional)',
  helperText,
}: ServiceSubtaskPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedItem = serviceItems.find((si) => si.id === serviceItemId);
  const selectedSubtask = selectedItem?.subtasks?.find(
    (st) => st.id === serviceItemSubtaskId,
  );

  const displayLabel = selectedItem
    ? selectedSubtask
      ? `${selectedItem.name} · ${selectedSubtask.name}`
      : selectedItem.name
    : null;

  // Filter items by search query — matches on service item name OR subtask name.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return serviceItems;
    return serviceItems
      .map((si) => {
        const siMatches = si.name.toLowerCase().includes(q);
        const matchingSubs = (si.subtasks ?? []).filter((st) =>
          st.name.toLowerCase().includes(q),
        );
        if (siMatches) {
          return si; // keep all subtasks when the parent matches
        }
        if (matchingSubs.length > 0) {
          return { ...si, subtasks: matchingSubs };
        }
        return null;
      })
      .filter((si): si is ServiceItem => si !== null);
  }, [serviceItems, query]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        {helperText && (
          <span className="text-xs text-muted-foreground">{helperText}</span>
        )}
      </div>
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery('');
        }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted/40',
              !displayLabel && 'text-muted-foreground',
            )}>
            <span className="line-clamp-1 text-left">
              {displayLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 overflow-hidden flex flex-col"
          style={{
            width: 'var(--radix-popover-trigger-width)',
            maxHeight: '320px',
          }}
          align="start"
          sideOffset={4}>
          {/* Search box */}
          <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div
            className="overflow-y-auto flex-1 min-h-0 py-1"
            onWheel={(e) => e.stopPropagation()}>
            {/* None option */}
            <button
              type="button"
              onClick={() => {
                onSelect('', '');
                setOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-muted/50',
                !serviceItemId && 'bg-muted/30',
              )}>
              <Check
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  !serviceItemId ? 'opacity-100 text-primary' : 'opacity-0',
                )}
              />
              <span className="text-muted-foreground">None</span>
            </button>

            {filtered.length === 0 && query && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No items found.
              </div>
            )}

            {filtered.map((si) => {
              const subs = si.subtasks ?? [];
              return (
                <div key={si.id} className="mt-0.5">
                  {/* Service item header (selectable if it has no subtasks) */}
                  {subs.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(si.id, '');
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-muted/50',
                        serviceItemId === si.id &&
                          !serviceItemSubtaskId &&
                          'bg-muted/30',
                      )}>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          serviceItemId === si.id && !serviceItemSubtaskId
                            ? 'opacity-100 text-primary'
                            : 'opacity-0',
                        )}
                      />
                      <span className="font-medium">{si.name}</span>
                    </button>
                  ) : (
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground bg-muted/20">
                      {si.name}
                    </div>
                  )}

                  {/* Subtasks */}
                  {subs.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        onSelect(si.id, st.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-sm text-left transition-colors hover:bg-muted/50',
                        serviceItemId === si.id &&
                          serviceItemSubtaskId === st.id &&
                          'bg-muted/30',
                      )}>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          serviceItemId === si.id &&
                            serviceItemSubtaskId === st.id
                            ? 'opacity-100 text-primary'
                            : 'opacity-0',
                        )}
                      />
                      <span className="text-muted-foreground mr-1">↳</span>
                      <span className="flex-1 truncate">{st.name}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
