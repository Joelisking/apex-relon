'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CalendarComboboxOption {
  id: string;
  label: string;
  searchValue: string;
}

interface CalendarComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: CalendarComboboxOption[];
  placeholder: string;
  width?: string;
}

export function CalendarCombobox({
  value,
  onChange,
  options,
  placeholder,
  width = 'w-[180px]',
}: CalendarComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('h-7 justify-between text-xs font-normal px-2.5', width)}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: '240px' }} align="start">
        <Command>
          <CommandInput placeholder="Search…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
              No results found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-3.5 w-3.5',
                    value === null ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {placeholder}
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.searchValue}
                  onSelect={() => {
                    onChange(opt.id === value ? null : opt.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5',
                      value === opt.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
