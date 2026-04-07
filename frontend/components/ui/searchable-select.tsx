'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /**
   * Extra whitespace-separated terms included in the cmdk filter string
   * but not displayed (e.g. a job number that already appears in the label).
   */
  keywords?: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selected = options.find((o) => o.value === value);

  const commandFilter = (itemValue: string, search: string) => {
    if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1;
    return 0;
  };

  const triggerButton = (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => isMobile && setOpen(true)}
      className={cn(
        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        !selected && 'text-muted-foreground',
        className,
      )}
    >
      <span className="line-clamp-1 text-left">{selected ? selected.label : placeholder}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </button>
  );

  const commandContent = (
    <Command filter={commandFilter}>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={[option.label, option.keywords].filter(Boolean).join(' ')}
              onSelect={() => {
                onValueChange(option.value === value ? '' : option.value);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4 shrink-0',
                  value === option.value ? 'opacity-100' : 'opacity-0',
                )}
              />
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // On mobile: use a bottom sheet so the list renders above the keyboard
  // correctly. Radix Popover uses position:fixed which iOS repositions
  // to the top of the screen when the virtual keyboard is open.
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="h-[60dvh] flex flex-col gap-0 p-0 rounded-t-2xl"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{placeholder}</SheetTitle>
            </SheetHeader>
            <div className="shrink-0 mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
            <div className="flex-1 overflow-hidden mt-2">
              {commandContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // On desktop: use the existing popover behaviour
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        {commandContent}
      </PopoverContent>
    </Popover>
  );
}
