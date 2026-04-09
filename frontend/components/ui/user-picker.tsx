'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronDown, Search, User, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface UserPickerUser {
  id: string;
  name: string;
}

interface UserPickerProps {
  users: UserPickerUser[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowUnassigned?: boolean;
  unassignedLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function UserPicker({
  users,
  value,
  onChange,
  placeholder = 'Select person...',
  searchPlaceholder = 'Search...',
  allowUnassigned = false,
  unassignedLabel = 'Unassigned',
  disabled = false,
  className,
}: UserPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedUser = users.find((u) => u.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, query]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery('');
  }

  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(v) => {
        if (disabled) return;
        setOpen(v);
        if (!v) setQuery('');
      }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'h-9 w-full flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
            !selectedUser && 'text-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            className,
          )}>
          {selectedUser ? (
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {selectedUser.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 truncate">
            {selectedUser ? selectedUser.name : placeholder}
          </span>
          {value && !disabled ? (
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
        style={{ width: 'var(--radix-popover-trigger-width)', maxHeight: '260px' }}
        align="start"
        sideOffset={4}>
        {/* Search */}
        <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}>
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* List */}
        <div
          className="overflow-y-auto flex-1 py-1"
          onWheel={(e) => e.stopPropagation()}>
          {allowUnassigned && !query && (
            <button
              type="button"
              onClick={() => select('')}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                !value && 'bg-muted/30',
              )}>
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0">
                <User className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-muted-foreground">{unassignedLabel}</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>
          )}
          {filtered.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => select(u.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                value === u.id && 'bg-muted/30',
              )}>
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{u.name}</span>
              {value === u.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No users found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
