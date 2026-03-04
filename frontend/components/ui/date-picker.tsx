'use client';

import * as React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon, ChevronDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  /** ISO date string YYYY-MM-DD */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  clearable = true,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const date = React.useMemo(() => {
    if (!value) return undefined;
    try {
      const d = parseISO(value + 'T00:00:00');
      return isValid(d) ? d : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  const handleSelect = (selected: Date | undefined) => {
    if (selected) {
      onChange(format(selected, 'yyyy-MM-dd'));
      setOpen(false);
    } else {
      onChange('');
    }
  };

  return (
    <div
      className={cn('relative flex w-full items-center', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            data-state={open ? 'open' : 'closed'}
            className={cn(
              'group inline-flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              open && 'border-ring ring-2 ring-ring ring-offset-2',
              date ? 'text-foreground' : 'text-muted-foreground',
              clearable && date ? 'pr-7' : 'pr-2',
            )}>
            <CalendarIcon
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors',
                date ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span className="flex-1 truncate text-left">
              {date ? format(date, 'MMM d, yyyy') : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 shadow-lg"
          align="start"
          sideOffset={6}>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            defaultMonth={date}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {clearable && date && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear date"
          className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }}>
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
