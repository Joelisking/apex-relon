'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterDef {
  id: string;
  title: string;
  options: FilterOption[];
}

export type FilterValues = Record<string, string[]>;

interface FilterPillProps {
  filter: FilterDef;
  selected: string[];
  onChange: (values: string[]) => void;
}

function FilterPill({ filter, selected, onChange }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isActive = selected.length > 0;
  const activeLabel =
    selected.length > 2
      ? `${selected.length} selected`
      : selected.join(', ');

  const trigger = (
    <button
      onClick={() => isMobile && setOpen(true)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15'
          : 'bg-muted/70 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground',
      )}>
      {filter.title}
      {isActive ? (
        <Badge className="ml-0.5 h-4 min-w-4 max-w-28 truncate rounded-full px-1.5 text-[10px] font-semibold bg-primary/15 text-primary border-0">
          {activeLabel}
        </Badge>
      ) : (
        <ChevronDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  const commandContent = (
    <Command>
      <CommandInput
        placeholder={`Search ${filter.title.toLowerCase()}...`}
        className="h-9 text-sm"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {filter.options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  if (isSelected) {
                    onChange(selected.filter((v) => v !== option.value));
                  } else {
                    onChange([...selected, option.value]);
                  }
                }}
                className="flex items-center gap-2 text-sm">
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors shrink-0',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 bg-transparent',
                  )}>
                  <Check
                    className={cn(
                      'h-3 w-3',
                      isSelected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </div>
                <span className="flex-1">{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-[11px] tabular-nums text-muted-foreground font-mono">
                    {option.count}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {selected.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => onChange([])}
                className="justify-center text-center text-xs text-muted-foreground">
                Clear filter
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="h-[60dvh] flex flex-col gap-0 p-0 rounded-t-2xl"
          >
            <div className="shrink-0 mx-auto mt-3 h-1 w-10 rounded-full bg-border" />
            <SheetHeader className="shrink-0 px-4 py-3 border-b border-border/50 text-left">
              <SheetTitle className="text-sm">{filter.title}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden">
              {commandContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[210px] p-0 shadow-lg" align="start">
        {commandContent}
      </PopoverContent>
    </Popover>
  );
}

interface FilterBarProps {
  filters: FilterDef[];
  values: FilterValues;
  onChange: (id: string, values: string[]) => void;
  onClear: () => void;
  className?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  className,
}: FilterBarProps) {
  const hasActive = Object.values(values).some((v) => v.length > 0);
  const activeFilters = filters.filter((f) => (values[f.id]?.length ?? 0) > 0);

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
        <SlidersHorizontal className="h-3 w-3" />
        Filters
      </span>
      {filters.map((filter) => (
        <FilterPill
          key={filter.id}
          filter={filter}
          selected={values[filter.id] ?? []}
          onChange={(vals) => onChange(filter.id, vals)}
        />
      ))}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
          Clear
          {activeFilters.length > 0 && (
            <X className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}

/** Helper: check if a value passes a multi-select filter */
export function passesFilter(
  value: string | null | undefined,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  return selected.includes(value ?? '');
}
