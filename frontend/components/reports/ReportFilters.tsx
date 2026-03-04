'use client';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { ReportFilters } from '@/lib/api/reports';
import { type DateRange } from 'react-day-picker';

interface ReportFiltersProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}

const PERIODS = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
] as const;

export function ReportFilters({
  filters,
  onChange,
}: ReportFiltersProps) {
  const isCustom = !!(filters.startDate || filters.endDate);

  function selectPeriod(period: ReportFilters['period']) {
    onChange({
      ...filters,
      period,
      startDate: undefined,
      endDate: undefined,
    });
  }

  const dateRangeValue: DateRange | undefined =
    filters.startDate || filters.endDate
      ? {
          from: filters.startDate
            ? new Date(filters.startDate)
            : undefined,
          to: filters.endDate ? new Date(filters.endDate) : undefined,
        }
      : undefined;

  function handleDateRangeChange(range: DateRange | undefined) {
    const startDate = range?.from
      ? range.from.toISOString().split('T')[0]
      : undefined;
    const endDate = range?.to
      ? range.to.toISOString().split('T')[0]
      : undefined;
    onChange({
      ...filters,
      startDate,
      endDate,
      period: startDate || endDate ? undefined : filters.period,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground mr-1">
        Period:
      </span>

      {PERIODS.map(({ value, label }) => (
        <Button
          key={value}
          variant={
            !isCustom && filters.period === value
              ? 'default'
              : 'outline'
          }
          onClick={() => selectPeriod(value)}
          size="sm">
          {label}
        </Button>
      ))}

      <span className="text-muted-foreground text-sm mx-1">|</span>

      <DateRangePicker
        value={dateRangeValue}
        onChange={handleDateRangeChange}
        placeholder="Custom date range"
        className="h-8 text-sm"
      />
    </div>
  );
}
