'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  /** Time string in HH:MM:SS format (24h internally) */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0');
}

function parse(time: string): [number, number, number] {
  const parts = time.split(':').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function to12(h24: number): { display: number; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let display = h24 % 12;
  if (display === 0) display = 12;
  return { display, period };
}

function to24(display12: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return display12 === 12 ? 0 : display12;
  return display12 === 12 ? 12 : display12 + 12;
}

function Segment({
  value,
  max,
  onChange,
  label,
  disabled,
  displayValue,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
  displayValue?: string;
}) {
  const increment = () => onChange(value >= max ? 0 : value + 1);
  const decrement = () => onChange(value <= 0 ? max : value - 1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) increment();
    else decrement();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      onChange(0);
      return;
    }
    onChange(clamp(parseInt(raw, 10), 0, max));
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-col items-center">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={increment}
          className="flex h-5 w-8 items-center justify-center rounded-t text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue ?? pad(value)}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onWheel={handleWheel}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-9 w-10 rounded border border-input bg-background text-center text-sm font-mono tabular-nums shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={decrement}
          className="flex h-5 w-8 items-center justify-center rounded-b text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: TimePickerProps) {
  const [h24, m, s] = parse(value);
  const { display: h12, period } = to12(h24);

  const emit = (hh: number, mm: number, ss: number) => {
    onChange(`${pad(hh)}:${pad(mm)}:${pad(ss)}`);
  };

  const handleHourChange = (newDisplay: number) => {
    // Clamp display value to 1-12 range
    const clamped = newDisplay <= 0 ? 12 : newDisplay > 12 ? 1 : newDisplay;
    emit(to24(clamped, period), m, s);
  };

  const togglePeriod = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    emit(to24(h12, newPeriod), m, s);
  };

  return (
    <div
      className={cn(
        'inline-flex items-end gap-1',
        className,
      )}
    >
      <Segment
        label="hr"
        value={h12}
        max={12}
        onChange={handleHourChange}
        disabled={disabled}
        displayValue={pad(h12)}
      />
      <span className="mb-2.5 text-sm font-medium text-muted-foreground">:</span>
      <Segment label="min" value={m} max={59} onChange={(v) => emit(h24, v, s)} disabled={disabled} />
      <span className="mb-2.5 text-sm font-medium text-muted-foreground">:</span>
      <Segment label="sec" value={s} max={59} onChange={(v) => emit(h24, m, v)} disabled={disabled} />
      {/* AM/PM toggle */}
      <div className="flex flex-col items-center gap-0.5 ml-1">
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          &nbsp;
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={togglePeriod}
          className={cn(
            'flex h-9 items-center justify-center rounded border border-input bg-background px-2 text-xs font-semibold shadow-sm transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            period === 'AM' ? 'text-blue-600' : 'text-amber-600',
          )}
        >
          {period}
        </button>
        {/* spacer for chevron alignment */}
        <div className="h-5" />
      </div>
    </div>
  );
}
