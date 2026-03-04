'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Target, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  forecastApi,
  type ForecastSummary,
  type ForecastMonth,
} from '@/lib/api/forecast-client';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function accuracyColor(pct: number): string {
  if (pct >= 100) return 'text-emerald-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-destructive';
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-border/60 bg-card shadow-md px-3 py-2 text-[12px]"
      style={{ minWidth: 160 }}>
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block w-2 h-2 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">
            {formatCurrency(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Y-axis formatter ───────────────────────────────────────────────────────

function yAxisFormatter(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ForecastPanel() {
  const queryClient = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery<ForecastSummary>({
    queryKey: ['forecast-summary'],
    queryFn: () => forecastApi.getSummary(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthly = [], isLoading: monthlyLoading } = useQuery<ForecastMonth[]>({
    queryKey: ['forecast-monthly'],
    queryFn: () => forecastApi.getMonthly(6),
    staleTime: 5 * 60 * 1000,
  });

  // ── Inline "This Month Target" edit state ─────────────────────────────────
  const [editingThisMonth, setEditingThisMonth] = useState(false);
  const [thisMonthDraft, setThisMonthDraft] = useState('');
  const [savingThisMonth, setSavingThisMonth] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const handleThisMonthEditStart = () => {
    setThisMonthDraft(String(summary?.thisMonthTarget ?? 0));
    setEditingThisMonth(true);
  };

  const handleThisMonthSave = async () => {
    const amount = parseFloat(thisMonthDraft);
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid target amount');
      return;
    }
    setSavingThisMonth(true);
    try {
      await forecastApi.upsertTarget({
        month: currentMonth,
        year: currentYear,
        targetAmount: amount,
      });
      await queryClient.invalidateQueries({ queryKey: ['forecast-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['forecast-monthly'] });
      await queryClient.invalidateQueries({ queryKey: ['forecast-targets'] });
      toast.success('Monthly target updated');
      setEditingThisMonth(false);
    } catch {
      toast.error('Failed to save target');
    } finally {
      setSavingThisMonth(false);
    }
  };

  // ── Bulk target editor state ───────────────────────────────────────────────
  const [showTargetEditor, setShowTargetEditor] = useState(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, string>>({});
  const [savingTargets, setSavingTargets] = useState(false);

  const handleOpenTargetEditor = () => {
    // Pre-fill from monthly data
    const initial: Record<string, string> = {};
    monthly.forEach((m) => {
      initial[`${m.year}-${m.month}`] = String(m.target);
    });
    setEditingTargets(initial);
    setShowTargetEditor(true);
  };

  const handleTargetChange = (key: string, val: string) => {
    setEditingTargets((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveAllTargets = async () => {
    setSavingTargets(true);
    try {
      const saves = monthly.map((m) => {
        const key = `${m.year}-${m.month}`;
        const raw = editingTargets[key] ?? '0';
        const amount = parseFloat(raw);
        if (isNaN(amount) || amount < 0) return null;
        // Only save if changed
        if (amount === m.target) return null;
        return forecastApi.upsertTarget({
          month: m.month,
          year: m.year,
          targetAmount: amount,
        });
      }).filter(Boolean);

      if (saves.length === 0) {
        toast.info('No changes to save');
        setShowTargetEditor(false);
        setSavingTargets(false);
        return;
      }

      await Promise.all(saves);
      await queryClient.invalidateQueries({ queryKey: ['forecast-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['forecast-monthly'] });
      await queryClient.invalidateQueries({ queryKey: ['forecast-targets'] });
      toast.success('Targets saved');
      setShowTargetEditor(false);
    } catch {
      toast.error('Failed to save targets');
    } finally {
      setSavingTargets(false);
    }
  };

  const isLoading = summaryLoading || monthlyLoading;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-border/40">
          <Skeleton className="h-4 w-36" />
        </div>
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card px-5 py-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="px-5 py-5">
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // ── Stats bar data ────────────────────────────────────────────────────────
  const accuracy = summary?.forecastAccuracy ?? 0;
  const hasAccuracy = accuracy > 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground/60" />
          <span className="text-sm font-semibold">Revenue Forecast</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/60">
        {/* Weighted Pipeline */}
        <div className="relative bg-card px-5 py-4">
          <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-blue-400/60 rounded-r-full" />
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium mb-1">
            Weighted Pipeline
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
            {formatCurrency(summary?.weightedPipeline ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            probability-adjusted
          </p>
        </div>

        {/* This Month Target — inline edit */}
        <div className="relative bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium mb-1">
            This Month Target
          </p>
          {editingThisMonth ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Input
                className="h-7 w-28 text-sm tabular-nums"
                type="number"
                min={0}
                value={thisMonthDraft}
                onChange={(e) => setThisMonthDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleThisMonthSave();
                  if (e.key === 'Escape') setEditingThisMonth(false);
                }}
                autoFocus
                disabled={savingThisMonth}
              />
              <button
                onClick={() => void handleThisMonthSave()}
                disabled={savingThisMonth}
                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                aria-label="Save target">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setEditingThisMonth(false)}
                disabled={savingThisMonth}
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                aria-label="Cancel">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {(summary?.thisMonthTarget ?? 0) === 0 ? (
                <p className="text-[18px] font-bold tabular-nums leading-none text-muted-foreground/50">
                  Not set
                </p>
              ) : (
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
                  {formatCurrency(summary?.thisMonthTarget ?? 0)}
                </p>
              )}
              <button
                onClick={handleThisMonthEditStart}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                aria-label="Edit this month target">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Won This Month */}
        <div className="relative bg-card px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium mb-1">
            Won This Month
          </p>
          <p className="text-[22px] font-bold tabular-nums leading-none text-emerald-600">
            {formatCurrency(summary?.wonThisMonth ?? 0)}
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            closed deals
          </p>
        </div>

        {/* Forecast Accuracy */}
        <div
          className={cn(
            'relative bg-card px-5 py-4',
            hasAccuracy && accuracy < 70 && 'bg-amber-50/60',
          )}>
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium mb-1">
            Forecast Accuracy
          </p>
          {hasAccuracy ? (
            <>
              <p
                className={cn(
                  'text-[22px] font-bold tabular-nums leading-none',
                  accuracyColor(accuracy),
                )}>
                {accuracy.toFixed(0)}%
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                vs last month target
              </p>
            </>
          ) : (
            <p className="text-[18px] font-bold tabular-nums leading-none text-muted-foreground/50">
              N/A
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pt-5 pb-2">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly} barCategoryGap="28%" barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.90 0.008 80)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="oklch(0.50 0.01 50)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="oklch(0.50 0.01 50)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={yAxisFormatter}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="square"
              iconSize={8}
            />
            <Bar dataKey="target" name="Target" fill="#93c5fd" radius={[3, 3, 0, 0]} />
            <Bar dataKey="weighted" name="Weighted" fill="#fbbf24" radius={[3, 3, 0, 0]} />
            <Bar dataKey="won" name="Won" fill="#34d399" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Set monthly targets toggle */}
      <div className="px-5 pb-5">
        <button
          onClick={() => (showTargetEditor ? setShowTargetEditor(false) : handleOpenTargetEditor())}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">
          {showTargetEditor ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Set monthly targets
        </button>

        {showTargetEditor && (
          <div className="mt-3 rounded-lg border border-border/60 overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium">
                Monthly Targets
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {monthly.map((m) => {
                  const key = `${m.year}-${m.month}`;
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium">
                        {m.label}
                      </label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-sm tabular-nums"
                        value={editingTargets[key] ?? '0'}
                        onChange={(e) => handleTargetChange(key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => void handleSaveAllTargets()}
                  disabled={savingTargets}
                  className="h-8 text-xs">
                  {savingTargets ? 'Saving...' : 'Save Targets'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTargetEditor(false)}
                  disabled={savingTargets}
                  className="h-8 text-xs text-muted-foreground">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
