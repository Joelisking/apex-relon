'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center items-center h-7 px-8',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'text-muted-foreground w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: cn(
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
          '[&:has([aria-selected])]:bg-accent',
          '[&:has([aria-selected].outside)]:bg-accent/50',
          '[&:has([aria-selected].day-range-end)]:rounded-r-md',
          props.mode === 'range'
            ? '[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
            : '[&:has([aria-selected])]:rounded-md',
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal aria-selected:opacity-100',
        ),
        range_start:
          'day-range-start rounded-l-md [&>button]:bg-primary/70 [&>button]:text-primary-foreground [&>button]:hover:bg-primary/80 [&>button]:hover:text-primary-foreground',
        range_end:
          'day-range-end rounded-r-md [&>button]:bg-primary/70 [&>button]:text-primary-foreground [&>button]:hover:bg-primary/80 [&>button]:hover:text-primary-foreground',
        range_middle:
          'aria-selected:bg-primary/10 aria-selected:text-foreground rounded-none',
        selected:
          '[&>button]:bg-primary/70 [&>button]:text-primary-foreground [&>button]:hover:bg-primary/80 [&>button]:hover:text-primary-foreground',
        today:
          '[&>button]:bg-accent [&>button]:text-accent-foreground',
        outside:
          'outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) => {
          const Icon =
            orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className={cn('size-4', rest.className)} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
