'use client';

import { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export interface DatePresetFilterValue {
  preset: DatePreset;
  range: DateRange | undefined;
}

interface DatePresetFilterProps {
  value: DatePresetFilterValue;
  onChange: (value: DatePresetFilterValue) => void;
  label?: string;
  align?: 'start' | 'center' | 'end';
}

const PRESETS: { id: DatePreset; label: string; group?: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today', group: 'Short' },
  { id: 'yesterday', label: 'Yesterday', group: 'Short' },
  { id: 'last7', label: 'Last 7 days', group: 'Short' },
  { id: 'last30', label: 'Last 30 days', group: 'Short' },
  { id: 'last90', label: 'Last 90 days', group: 'Short' },
  { id: 'thisMonth', label: 'This month', group: 'Month' },
  { id: 'lastMonth', label: 'Last month', group: 'Month' },
  { id: 'thisQuarter', label: 'This quarter', group: 'Quarter' },
  { id: 'lastQuarter', label: 'Last quarter', group: 'Quarter' },
  { id: 'thisYear', label: 'This year', group: 'Year' },
  { id: 'lastYear', label: 'Last year', group: 'Year' },
  { id: 'custom', label: 'Custom range...' },
];

function computeRange(preset: DatePreset): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'all':
      return undefined;

    case 'today':
      return { from: today, to: today };

    case 'yesterday': {
      const d = new Date(today);
      d.setDate(today.getDate() - 1);
      return { from: d, to: d };
    }

    case 'last7': {
      const from = new Date(today);
      from.setDate(today.getDate() - 7);
      return { from, to: today };
    }

    case 'last30': {
      const from = new Date(today);
      from.setDate(today.getDate() - 30);
      return { from, to: today };
    }

    case 'last90': {
      const from = new Date(today);
      from.setDate(today.getDate() - 90);
      return { from, to: today };
    }

    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from, to };
    }

    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    }

    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3);
      const from = new Date(now.getFullYear(), q * 3, 1);
      const to = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { from, to };
    }

    case 'lastQuarter': {
      const q = Math.floor(now.getMonth() / 3);
      const prevQ = q === 0 ? 3 : q - 1;
      const year = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const from = new Date(year, prevQ * 3, 1);
      const to = new Date(year, prevQ * 3 + 3, 0);
      return { from, to };
    }

    case 'thisYear': {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      return { from, to };
    }

    case 'lastYear': {
      const y = now.getFullYear() - 1;
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    }

    default:
      return undefined;
  }
}

function formatLabel(value: DatePresetFilterValue, fallback: string): string {
  if (value.preset === 'all') return fallback;
  if (value.preset === 'custom') {
    const { from, to } = value.range ?? {};
    if (from && to) return `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`;
    if (from) return `From ${format(from, 'MMM d')}`;
    return 'Custom';
  }
  return PRESETS.find((p) => p.id === value.preset)?.label ?? fallback;
}

export const DATE_PRESET_ALL: DatePresetFilterValue = { preset: 'all', range: undefined };

export function DatePresetFilter({
  value,
  onChange,
  label = 'Date',
  align = 'start',
}: DatePresetFilterProps) {
  const [open, setOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(value.range);

  const isActive = value.preset !== 'all';
  const showCustomPicker = value.preset === 'custom';

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ preset: 'custom', range: customRange });
    } else {
      const range = computeRange(preset);
      onChange({ preset, range });
      setOpen(false);
    }
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    setCustomRange(range);
    onChange({ preset: 'custom', range });
  };

  const buttonLabel = formatLabel(value, label);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 h-7 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isActive
              ? 'bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15'
              : 'bg-muted/70 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground',
          )}>
          <CalendarIcon className="h-3 w-3 opacity-70" />
          {buttonLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 shadow-lg"
        align={align}
        style={{ width: showCustomPicker ? 'auto' : '200px' }}>
        <div className={cn('flex', showCustomPicker && 'divide-x divide-border')}>
          {/* Preset list */}
          <div className="py-1 min-w-[180px]">
            {PRESETS.map((preset, idx) => {
              const isSelected = value.preset === preset.id;
              const prevGroup = idx > 0 ? PRESETS[idx - 1].group : undefined;
              const showDivider = preset.group !== prevGroup && idx !== 0;
              return (
                <div key={preset.id}>
                  {showDivider && <div className="my-1 h-px bg-border" />}
                  <button
                    onClick={() => handlePreset(preset.id)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors text-left',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted',
                    )}>
                    <span className="w-3.5 shrink-0">
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    {preset.label}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Custom date picker */}
          {showCustomPicker && (
            <div className="p-2">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={handleCustomRange}
                numberOfMonths={2}
                initialFocus
              />
              {customRange?.from && (
                <div className="flex items-center justify-between border-t pt-2 mt-1 px-1">
                  <span className="text-xs text-muted-foreground">
                    {customRange.from && format(customRange.from, 'MMM d, yyyy')}
                    {customRange.to && ` – ${format(customRange.to, 'MMM d, yyyy')}`}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => {
                      setCustomRange(undefined);
                      handleCustomRange(undefined);
                    }}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
