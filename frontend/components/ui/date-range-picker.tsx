'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { type DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  align?: 'start' | 'center' | 'end';
  numberOfMonths?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled = false,
  className,
  align = 'start',
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hasValue = value?.from || value?.to;

  const label = React.useMemo(() => {
    if (!value?.from) return null;
    if (value.to) {
      return (
        <>
          {format(value.from, 'LLL d, y')}
          <span className="mx-1.5 text-muted-foreground">/</span>
          {format(value.to, 'LLL d, y')}
        </>
      );
    }
    return format(value.from, 'LLL d, y');
  }, [value]);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant="outline"
            disabled={disabled}
            data-empty={!hasValue}
            className={cn(
              'justify-start px-3 font-normal data-[empty=true]:text-muted-foreground',
              hasValue ? 'pr-8' : '',
            )}>
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {label ?? <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={align}
          sideOffset={6}>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={numberOfMonths}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear date range"
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
