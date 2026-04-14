'use client';

import { useState, useMemo } from 'react';
import { Check, Plus, X, Loader2, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DropdownOption } from '@/lib/types';

interface CreatableSelectProps {
  options: DropdownOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder: string;
  onOptionCreated: (label: string) => Promise<DropdownOption>;
  onOptionsChange: (options: DropdownOption[]) => void;
}

export function CreatableSelect({
  options,
  value,
  onChange,
  placeholder,
  onOptionCreated,
  onOptionsChange,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (label: string) => {
    onChange(label);
    setOpen(false);
  };

  const handleSave = async () => {
    if (!newLabel.trim()) return;
    setIsSaving(true);
    try {
      const created = await onOptionCreated(newLabel.trim());
      onOptionsChange([...options, created]);
      onChange(created.label);
      setIsAdding(false);
      setNewLabel('');
      setOpen(false);
    } catch {
      toast.error('Failed to add option');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setQuery('');
          setIsAdding(false);
          setNewLabel('');
        }
      }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-9 w-full flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
            !value && 'text-muted-foreground',
          )}>
          <span className="flex-1 truncate">{value ?? placeholder}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden flex flex-col"
        style={{
          width: 'var(--radix-popover-trigger-width)',
          maxHeight: '280px',
        }}
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
        sideOffset={4}>

        {/* Add new form */}
        {isAdding ? (
          <div className="p-2 flex gap-2 shrink-0">
            <Input
              autoFocus
              placeholder="Enter new option..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewLabel('');
                }
              }}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={handleSave}
              disabled={isSaving || !newLabel.trim()}>
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setIsAdding(false);
                setNewLabel('');
              }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          /* Search bar */
          <div className="flex items-center gap-2 px-3 h-9 border-b border-border/60 shrink-0">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')}>
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Options list */}
        {!isAdding && (
          <div
            className="overflow-y-auto flex-1 py-1"
            onWheel={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary font-medium transition-colors hover:bg-muted/50">
              <Plus className="h-3.5 w-3.5" />
              Add new...
            </button>

            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.label)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                <span className="flex-1 text-left">{opt.label}</span>
                {value === opt.label && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No matches
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
