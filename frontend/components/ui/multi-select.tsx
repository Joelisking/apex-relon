'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const toggle = (optionValue: string) => {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const remove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  };

  const selectedLabels = options.filter((o) => value.includes(o.value));

  const triggerButton = (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => isMobile && setOpen(true)}
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {selectedLabels.length === 0 ? (
        <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
      ) : (
        <span className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.map((o) => (
            <Badge key={o.value} variant="secondary" className="flex items-center gap-1 pr-1">
              {o.label}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => remove(o.value, e)}
                onKeyDown={(e) => e.key === 'Enter' && onValueChange(value.filter((v) => v !== o.value))}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            </Badge>
          ))}
        </span>
      )}
      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </button>
  );

  const commandContent = (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.label}
              onSelect={() => toggle(option.value)}
            >
              <Check
                className={cn(
                  'mr-2 h-4 w-4 shrink-0',
                  value.includes(option.value) ? 'opacity-100' : 'opacity-0',
                )}
              />
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[60dvh] flex flex-col gap-0 p-0 rounded-t-2xl">
            <SheetHeader className="sr-only">
              <SheetTitle>{placeholder}</SheetTitle>
            </SheetHeader>
            <div className="shrink-0 mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
            <div className="flex-1 overflow-hidden mt-2">{commandContent}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

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
