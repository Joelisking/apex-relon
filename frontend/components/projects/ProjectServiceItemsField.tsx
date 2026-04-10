'use client';

import { useState, useMemo } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface LinkedServiceItem {
  /** For create: item.id. For edit: link.id (join table row). */
  removeKey: string;
  name: string;
  unit?: string | null;
}

interface ProjectServiceItemsFieldProps {
  linkedItems: LinkedServiceItem[];
  availableItems: Array<{ id: string; name: string; unit?: string | null }>;
  onAdd: (id: string) => void;
  onRemove: (key: string) => void;
  jobTypeFilterActive?: boolean;
}

export function ProjectServiceItemsField({
  linkedItems,
  availableItems,
  onAdd,
  onRemove,
  jobTypeFilterActive = false,
}: ProjectServiceItemsFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return availableItems;
    const q = query.toLowerCase();
    return availableItems.filter((si) => si.name.toLowerCase().includes(q));
  }, [availableItems, query]);

  const hasContent = linkedItems.length > 0 || availableItems.length > 0;
  if (!hasContent) return null;

  const placeholder = jobTypeFilterActive
    ? 'Add a service item for this type…'
    : 'Add a service item…';

  const emptyMessage = jobTypeFilterActive
    ? 'No service items match the selected job types.'
    : 'No active service items available.';

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium leading-none">Service Items</p>

      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery('');
        }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="min-h-9 w-full flex flex-wrap gap-1 items-center px-3 py-1.5 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40">
            {linkedItems.length === 0 ? (
              <span className="flex-1 text-muted-foreground">{placeholder}</span>
            ) : (
              linkedItems.map((item) => (
                <span
                  key={item.removeKey}
                  className="inline-flex items-center gap-1 rounded bg-secondary text-secondary-foreground px-1.5 py-0.5 text-xs font-medium">
                  {item.name}
                  {item.unit && (
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px] ml-0.5 border-border/60">
                      {item.unit}
                    </Badge>
                  )}
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.removeKey);
                    }}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer">
                    <X className="h-2.5 w-2.5" />
                  </span>
                </span>
              ))
            )}
            <ChevronDown className="h-4 w-4 opacity-50 ml-auto shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 overflow-hidden flex flex-col"
          style={{ width: 'var(--radix-popover-trigger-width)', maxHeight: '280px' }}
          align="start"
          sideOffset={4}
          onWheelCapture={(e) => e.stopPropagation()}>
          {/* Search */}
          <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search service items…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 py-1" onWheel={(e) => e.stopPropagation()}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map((si) => (
                <button
                  key={si.id}
                  type="button"
                  onClick={() => {
                    onAdd(si.id);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                  <span className="flex-1 text-left">{si.name}</span>
                  {si.unit && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{si.unit}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
