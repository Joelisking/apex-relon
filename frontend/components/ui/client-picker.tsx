'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, Building2, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ClientPickerClient {
  id: string;
  name: string;
  individualName?: string;
}

interface ClientPickerProps {
  clients: ClientPickerClient[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

function displayName(c: ClientPickerClient): string {
  return c.individualName ? `${c.name} (${c.individualName})` : c.name;
}

export function ClientPicker({
  clients,
  value,
  onChange,
  placeholder = 'Select a customer...',
  className,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedClient = clients.find((c) => c.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.individualName && c.individualName.toLowerCase().includes(q)),
    );
  }, [clients, query]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
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
            'h-9 w-full flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
            !selectedClient && 'text-muted-foreground',
            className,
          )}>
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {selectedClient ? displayName(selectedClient) : placeholder}
          </span>
          {value ? (
            <X
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden flex flex-col"
        style={{
          width: 'var(--radix-popover-trigger-width)',
          maxHeight: '260px',
        }}
        align="start"
        sideOffset={4}>
        <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <div
          className="overflow-y-auto flex-1 py-1"
          onWheel={(e) => e.stopPropagation()}>
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                value === c.id && 'bg-muted/30',
              )}>
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{displayName(c)}</span>
              {value === c.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No customers found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
