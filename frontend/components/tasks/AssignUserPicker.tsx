'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, User, Search, X, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { UserDirectoryItem } from '@/lib/api/users-client';

interface AssignUserPickerProps {
  assignableUsers: UserDirectoryItem[];
  selectedUserId: string;
  currentUserId?: string;
  onSelect: (userId: string) => void;
  label?: string;
  helperText?: string;
}

export function AssignUserPicker({
  assignableUsers,
  selectedUserId,
  currentUserId,
  onSelect,
  label = 'Assign To',
  helperText,
}: AssignUserPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedUser = assignableUsers.find((u) => u.id === selectedUserId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assignableUsers;
    return assignableUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [assignableUsers, query]);

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
        {label}
        {helperText && (
          <span className="ml-1.5 normal-case text-muted-foreground tracking-normal font-normal">
            {helperText}
          </span>
        )}
      </p>
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
              'w-full flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
              !selectedUser && 'text-muted-foreground',
            )}>
            {selectedUser ? (
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <User className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="flex-1 truncate">
              {selectedUser
                ? `${selectedUser.name}${
                    selectedUser.id === currentUserId ? ' (me)' : ''
                  }`
                : 'Assign to someone...'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <div
            className="overflow-y-auto flex-1 min-h-0 py-1"
            onWheel={(e) => e.stopPropagation()}>
            {!query && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                  !selectedUserId && 'bg-muted/30',
                )}>
                <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center shrink-0">
                  <User className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-muted-foreground">Unassigned</span>
                {!selectedUserId && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                  selectedUserId === u.id && 'bg-muted/30',
                )}>
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate">
                  {u.name}
                  {u.id === currentUserId ? ' (me)' : ''}
                </span>
                {u.role && (
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                    {u.role}
                  </span>
                )}
                {selectedUserId === u.id && (
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
    </div>
  );
}
