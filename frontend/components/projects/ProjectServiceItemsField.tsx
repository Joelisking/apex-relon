'use client';

import { Badge } from '@/components/ui/badge';
import { UserPicker } from '@/components/ui/user-picker';
import { X } from 'lucide-react';

export interface LinkedServiceItem {
  /** For create: item.id. For edit: link.id (join table row). */
  removeKey: string;
  name: string;
  unit?: string | null;
}

interface ProjectServiceItemsFieldProps {
  linkedItems: LinkedServiceItem[];
  availableItems: Array<{ id: string; name: string; unit?: string | null }>;
  pickerValue: string;
  onAdd: (id: string) => void;
  onRemove: (key: string) => void;
  onPickerValueChange: (val: string) => void;
  serviceTypeFilterActive?: boolean;
}

export function ProjectServiceItemsField({
  linkedItems,
  availableItems,
  pickerValue,
  onAdd,
  onRemove,
  onPickerValueChange,
  serviceTypeFilterActive = false,
}: ProjectServiceItemsFieldProps) {
  const hasActive = linkedItems.length > 0 || availableItems.length > 0;
  if (!hasActive) return null;

  return (
    <div className="col-span-2 space-y-2">
      <p className="text-sm font-medium leading-none">Service Items</p>

      {linkedItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {linkedItems.map((item) => (
            <div
              key={item.removeKey}
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
              <span className="text-sm font-medium">{item.name}</span>
              {item.unit && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {item.unit}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => onRemove(item.removeKey)}
                className="ml-0.5 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableItems.length > 0 && (
        <UserPicker
          users={availableItems.map((si) => ({
            id: si.id,
            name: si.unit ? `${si.name} (${si.unit})` : si.name,
          }))}
          value={pickerValue}
          onChange={(val) => {
            onPickerValueChange('');
            if (val) onAdd(val);
          }}
          placeholder={
            serviceTypeFilterActive ? 'Add a service item for this type…' : 'Add a service item…'
          }
        />
      )}

      {availableItems.length === 0 && linkedItems.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {serviceTypeFilterActive
            ? 'No service items match the selected service types.'
            : 'No active service items available.'}
        </p>
      )}
    </div>
  );
}
