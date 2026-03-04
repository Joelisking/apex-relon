'use client';

import { cn } from '@/lib/utils';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { useCurrency } from '@/lib/context/currency-context';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
  isEditMode?: boolean;
}

const CURRENCY_METRICS = [
  'totalRevenue', 'monthlyRevenue', 'quarterlyRevenue',
  'pipelineValue', 'avgDealSize',
];

// Subtle gradient tint per metric — keeps the base card color, just adds a whisper of color
const METRIC_GRADIENT: Record<string, string> = {
  totalRevenue:     'from-emerald-500/[0.06] to-transparent',
  monthlyRevenue:   'from-emerald-500/[0.06] to-transparent',
  quarterlyRevenue: 'from-emerald-500/[0.06] to-transparent',
  winRate:          'from-blue-500/[0.07] to-transparent',
  pipelineValue:    'from-cyan-500/[0.06] to-transparent',
  avgDealSize:      'from-teal-500/[0.06] to-transparent',
  activeProjects:   'from-violet-500/[0.06] to-transparent',
  projectsAtRisk:   'from-amber-500/[0.09] to-transparent',
  wonLeads:         'from-emerald-500/[0.06] to-transparent',
  lostLeads:        'from-red-500/[0.07] to-transparent',
  avgTimeToClose:   'from-indigo-500/[0.06] to-transparent',
  avgTimeToQuote:   'from-indigo-500/[0.06] to-transparent',
};

const METRIC_VALUE_COLOR: Record<string, string> = {
  projectsAtRisk: 'text-amber-600',
  lostLeads:      'text-red-500',
};

export function MetricCardWidget({ widget, metrics, isEditMode }: Props) {
  const { fmtFull } = useCurrency();
  const metric = widget.config.metric as string;
  const title = widget.config.title || metric;

  // No metric configured — guide user to configure via the gear icon in edit mode
  if (!metric) {
    return (
      <div className="relative h-full flex flex-col items-center justify-center px-5 gap-1 overflow-hidden">
        <p className="text-[10px] text-muted-foreground/40 text-center leading-tight">
          No metric selected
        </p>
        <p className="text-[9px] text-muted-foreground/30 text-center">
          Enter edit mode and click the gear icon
        </p>
      </div>
    );
  }

  // Show skeleton while metrics haven't arrived yet
  if (!metrics) {
    return (
      <div className="relative h-full flex flex-col justify-between px-5 pt-[18px] pb-4 overflow-hidden">
        <p className="text-[10px] uppercase tracking-[0.09em] text-muted-foreground/50 font-medium leading-none">
          {title}
        </p>
        <div className="mt-auto h-9 w-24 rounded-md bg-muted/50 animate-pulse" />
      </div>
    );
  }

  let value: string | number = '—';

  if (metrics && metric) {
    const raw = metrics[metric as keyof DashboardMetrics];
    if (typeof raw === 'number') {
      if (CURRENCY_METRICS.includes(metric)) {
        value = fmtFull(raw);
      } else if (metric === 'winRate') {
        value = `${raw.toFixed(1)}%`;
      } else {
        value = raw.toLocaleString();
      }
    } else if (typeof raw === 'string') {
      value = raw;
    } else if (Array.isArray(raw)) {
      value = raw.length;
    }
  }

  const gradient = METRIC_GRADIENT[metric] ?? 'from-primary/[0.04] to-transparent';
  const valueColor = METRIC_VALUE_COLOR[metric] ?? 'text-foreground';

  return (
    <div
      className={cn(
        'relative h-full flex flex-col justify-between px-5 pt-[18px] pb-4 overflow-hidden',
        `bg-gradient-to-br ${gradient}`,
      )}>
      {/* Label */}
      <p className="text-[10px] uppercase tracking-[0.09em] text-muted-foreground/50 font-medium leading-none">
        {title}
      </p>

      {/* Value */}
      <div className="mt-auto">
        <p
          className={cn(
            'text-[2.15rem] font-bold tabular-nums leading-none tracking-tight',
            valueColor,
          )}>
          {value}
        </p>
        {isEditMode && (
          <p className="text-[9px] text-muted-foreground/25 mt-1.5 font-mono">
            {metric}
          </p>
        )}
      </div>
    </div>
  );
}
