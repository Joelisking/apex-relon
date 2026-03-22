'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPLAY_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function buildMinutes(step: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < 60; i += step) result.push(i);
  return result;
}
const PERIODS = ['AM', 'PM'];
const ITEM_H = 36; // px — height of each row
const COL_H = 180; // px — visible height of each column (shows 5 items)
const PAD = (COL_H - ITEM_H) / 2; // 72px — centres first/last item when scrolled

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TimeState {
  h: number; // 1-12
  m: number; // 0, 5, 10 ... 55
  p: 'AM' | 'PM';
}

function parseTime(value: string): TimeState {
  const [hStr = '9', mStr = '0'] = value.split(':');
  const h24 = parseInt(hStr, 10);
  const m24 = parseInt(mStr, 10);
  const mRounded = Math.round(m24 / 5) * 5;
  return {
    h: h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24,
    m: mRounded >= 60 ? 55 : mRounded,
    p: h24 < 12 ? 'AM' : 'PM',
  };
}

function buildTime(h: number, m: number, p: 'AM' | 'PM'): string {
  const h24 = p === 'AM' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  const { h, m, p } = parseTime(value);
  return `${h}:${String(m).padStart(2, '0')} ${p}`;
}

function nowRounded(): string {
  const d = new Date();
  const h24 = d.getHours();
  const m = (Math.round(d.getMinutes() / 5) * 5) % 60;
  const p: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return buildTime(h12, m, p);
}

// ─── ScrollColumn ─────────────────────────────────────────────────────────────

interface ScrollColumnProps<T extends number | string> {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  format: (v: T) => string;
  open: boolean;
}

function ScrollColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  format: fmt,
  open,
}: ScrollColumnProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior) => {
      containerRef.current?.scrollTo({ top: idx * ITEM_H, behavior });
    },
    [],
  );

  // Scroll to selected item (instant) whenever picker opens
  useEffect(() => {
    if (!open) return;
    const idx = items.indexOf(selected);
    const timer = setTimeout(() => scrollToIndex(idx, 'auto'), 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClick = (item: T) => {
    onSelect(item);
    const idx = items.indexOf(item);
    scrollToIndex(idx, 'smooth');
  };

  return (
    <div
      ref={containerRef}
      style={{ height: COL_H, paddingTop: PAD, paddingBottom: PAD }}
      className="overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      onWheel={(e) => e.stopPropagation()}>
      {items.map((item) => {
        const isSel = item === selected;
        return (
          <button
            key={item}
            type="button"
            onClick={() => handleClick(item)}
            style={{ height: ITEM_H }}
            className={cn(
              'w-full flex items-center justify-center text-sm transition-all',
              isSel
                ? 'font-semibold text-primary bg-primary/10 rounded-lg ring-1 ring-inset ring-primary/20'
                : 'text-muted-foreground hover:text-foreground',
            )}>
            {fmt(item)}
          </button>
        );
      })}
    </div>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minuteStep?: number;
}

export function TimePicker({ value, onChange, minuteStep = 5 }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const minutes = buildMinutes(minuteStep);

  const { h, m, p } = value ? parseTime(value) : { h: 9, m: 0, p: 'AM' as const };
  // Snap m to nearest valid step
  const snappedM = minutes.includes(m) ? m : minutes.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a, minutes[0]);

  const setH = (newH: number) => onChange(buildTime(newH, snappedM, p));
  const setM = (newM: number) => onChange(buildTime(h, newM, p));
  const setP = (newP: string) => onChange(buildTime(h, snappedM, newP as 'AM' | 'PM'));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-9 w-full flex items-center gap-2 px-3 rounded-md border border-input bg-background text-sm text-left transition-colors hover:bg-muted/40',
            !value && 'text-muted-foreground',
          )}>
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 tabular-nums">
            {value ? formatDisplay(value) : 'Set time'}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onChange('');
                }
              }}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3 w-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden"
        style={{ width: 204 }}
        align="start"
        sideOffset={4}>

        {/* Live time display */}
        <div className="flex items-baseline justify-center gap-0.5 py-3 border-b border-border/60 bg-muted/20">
          <span className="text-2xl font-bold tabular-nums tracking-tight leading-none">
            {h}
          </span>
          <span className="text-xl font-bold text-muted-foreground/40 leading-none">
            :
          </span>
          <span className="text-2xl font-bold tabular-nums tracking-tight leading-none">
            {String(snappedM).padStart(2, '0')}
          </span>
          <span className="ml-1.5 text-xs font-semibold text-muted-foreground/70 self-center">
            {p}
          </span>
        </div>

        {/* Column labels */}
        <div className="grid grid-cols-3 border-b border-border/40 bg-muted/10">
          {['Hour', 'Min', 'Period'].map((label, i) => (
            <span
              key={label}
              className={cn(
                'py-1 text-center text-[9px] font-semibold uppercase tracking-[0.09em] text-muted-foreground/40',
                i === 1 && 'border-x border-border/30',
              )}>
              {label}
            </span>
          ))}
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-3 divide-x divide-border/30">
          <ScrollColumn
            items={DISPLAY_HOURS}
            selected={h}
            onSelect={setH}
            format={(v) => String(v)}
            open={open}
          />
          <ScrollColumn
            items={minutes}
            selected={snappedM}
            onSelect={setM}
            format={(v) => String(v).padStart(2, '0')}
            open={open}
          />
          <ScrollColumn
            items={PERIODS}
            selected={p}
            onSelect={setP}
            format={(v) => v}
            open={open}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/50 bg-muted/10">
          <button
            type="button"
            onClick={() => onChange(nowRounded())}
            className="text-[11px] font-semibold text-primary hover:text-primary/70 transition-colors">
            Now
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
