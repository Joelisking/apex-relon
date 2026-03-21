'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DropdownOption } from '@/lib/types';

const ADD_NEW_SENTINEL = '__add_new__';

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
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleValueChange = (val: string) => {
    if (val === ADD_NEW_SENTINEL) {
      setIsAdding(true);
      return;
    }
    onChange(val);
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
    } catch {
      toast.error('Failed to add option');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewLabel('');
  };

  if (isAdding) {
    return (
      <div className="flex gap-2">
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
            if (e.key === 'Escape') handleCancel();
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
          onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select onValueChange={handleValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ADD_NEW_SENTINEL}>
          <span className="flex items-center gap-2 text-primary font-medium">
            <Plus className="h-3.5 w-3.5" />
            Add new...
          </span>
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.label}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
