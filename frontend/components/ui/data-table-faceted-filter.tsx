'use client';

import * as React from 'react';
import { Column } from '@tanstack/react-table';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);
  const isActive = selectedValues.size > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive
              ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15'
              : 'bg-muted/70 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground',
          )}>
          {title}
          {isActive ? (
            <>
              <Badge
                variant="secondary"
                className="ml-0.5 h-4 min-w-4 rounded-full px-1 text-[10px] font-semibold bg-primary/15 text-primary border-0">
                {selectedValues.size > 2 ? (
                  `${selectedValues.size}`
                ) : (
                  options
                    .filter((o) => selectedValues.has(o.value))
                    .map((o) => o.label)
                    .join(', ')
                    .slice(0, 18) + (selectedValues.size > 1 ? '' : '')
                )}
              </Badge>
            </>
          ) : (
            <ChevronDown className="h-3 w-3 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[210px] p-0 shadow-lg" align="start">
        <Command>
          <CommandInput
            placeholder={`Search ${title?.toLowerCase()}...`}
            className="h-9 text-sm"
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                const count = facets?.get(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined,
                      );
                    }}
                    className="flex items-center gap-2 text-sm">
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30 bg-transparent',
                      )}>
                      <Check className={cn('h-3 w-3', isSelected ? 'opacity-100' : 'opacity-0')} />
                    </div>
                    {option.icon && (
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1">{option.label}</span>
                    {count !== undefined && (
                      <span className="text-[11px] tabular-nums text-muted-foreground font-mono">
                        {count}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="justify-center text-center text-xs text-muted-foreground">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
