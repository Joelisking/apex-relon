'use client';

import { useState } from 'react';
import { X, Plus, Check, Loader2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { DropdownOption } from '@/lib/types';

interface MultiCreatableSelectProps {
  options: DropdownOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  onOptionCreated: (label: string) => Promise<DropdownOption>;
  onOptionsChange: (options: DropdownOption[]) => void;
}

export function MultiCreatableSelect({
  options,
  value,
  onChange,
  placeholder,
  onOptionCreated,
  onOptionsChange,
}: MultiCreatableSelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (label: string) => {
    if (value.includes(label)) return;
    onChange([...value, label]);
  };

  const handleRemove = (label: string) => {
    onChange(value.filter((v) => v !== label));
  };

  const handleSave = async () => {
    if (!newLabel.trim()) return;
    setIsSaving(true);
    try {
      const created = await onOptionCreated(newLabel.trim());
      onOptionsChange([...options, created]);
      handleSelect(created.label);
      setIsAdding(false);
      setNewLabel('');
    } catch {
      toast.error('Failed to add option');
    } finally {
      setIsSaving(false);
    }
  };

  const available = options.filter((o) => !value.includes(o.label));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 pr-1">
              {v}
              <button
                type="button"
                onClick={() => handleRemove(v)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Enter county name..."
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
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || !newLabel.trim()}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              setIsAdding(false);
              setNewLabel('');
            }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between font-normal text-muted-foreground">
              {value.length === 0 ? placeholder : `Add more counties...`}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto">
            <DropdownMenuItem
              onSelect={() => setIsAdding(true)}
              className="text-primary font-medium">
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add new...
            </DropdownMenuItem>
            {available.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onSelect={() => handleSelect(opt.label)}>
                {opt.label}
              </DropdownMenuItem>
            ))}
            {available.length === 0 && !isAdding && (
              <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                All counties selected
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
