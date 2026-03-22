'use client';

import { cn } from '@/lib/utils';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';
import { useCurrency } from '@/lib/context/currency-context';
import {
  DollarSign, Target, TrendingUp, Briefcase, AlertTriangle,
  CheckCircle2, XCircle, Zap, Users, Clock, type LucideIcon,
} from 'lucide-react';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
  isEditMode?: boolean;
}

const CURRENCY_METRICS = [
  'totalRevenue', 'monthlyRevenue', 'quarterlyRevenue', 'pipelineValue', 'avgDealSize',
];

const METRIC_ICON: Partial<Record<string, LucideIcon>> = {
  totalRevenue:     DollarSign,
  monthlyRevenue:   DollarSign,
  quarterlyRevenue: DollarSign,
  winRate:          Target,
  pipelineValue:    TrendingUp,
  avgDealSize:      DollarSign,
  activeProjects:   Briefcase,
  projectsAtRisk:   AlertTriangle,
  wonLeads:         CheckCircle2,
  lostLeads:        XCircle,
  totalLeads:       Zap,
  activeClients:    Users,
  avgTimeToClose:   Clock,
  avgTimeToQuote:   Clock,
};

const METRIC_SUBLABEL: Partial<Record<string, string>> = {
  totalRevenue:     'All time',
  monthlyRevenue:   'This month',
  quarterlyRevenue: 'This quarter',
  winRate:          'Lead close rate',
  pipelineValue:    'Active pipeline',
  avgDealSize:      'Per closed deal',
  activeProjects:   'In progress',
  projectsAtRisk:   'Need attention',
  wonLeads:         'Closed won',
  lostLeads:        'Closed lost',
  totalLeads:       'In pipeline',
  activeClients:    'Current clients',
  avgTimeToClose:   'Days avg.',
  avgTimeToQuote:   'Days avg.',
};

export function MetricCardWidget({ widget, metrics, isEditMode }: Props) {
  const { fmtFull } = useCurrency();
  const metric = widget.config.metric as string;
  const title = widget.config.title || metric;
  const Icon = METRIC_ICON[metric] ?? DollarSign;
  const sublabel = METRIC_SUBLABEL[metric] ?? '';
  const isAlert = metric === 'projectsAtRisk';
  const isDanger = metric === 'lostLeads';

  if (!metric) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 gap-1.5">
        <p className="text-[11px] text-muted-foreground text-center">No metric selected</p>
        <p className="text-[10px] text-muted-foreground text-center">Enter edit mode → click ⚙</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="relative h-full flex flex-col px-5 py-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">{title}</p>
        </div>
        <div className="h-7 w-24 bg-muted/50 rounded animate-pulse mb-1.5" />
        <div className="h-2.5 w-16 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  let value: string | number = '—';
  if (metric) {
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

  const valueColor = isDanger
    ? 'text-red-700'
    : isAlert
      ? 'text-amber-700'
      : 'text-foreground';

  return (
    <div className={cn(
      'relative h-full flex flex-col px-5 py-4',
      isAlert && 'bg-amber-50/60',
      isDanger && 'bg-red-50/40',
    )}>
      {/* Icon + label row — matches ClientStatsCards exactly */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn(
          'h-3 w-3 shrink-0',
          isAlert || isDanger ? 'text-amber-500' : 'text-muted-foreground',
        )} />
        <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">
          {title}
        </p>
      </div>

      {/* Value */}
      <p className={cn('text-[22px] font-bold tabular-nums leading-none mb-1', valueColor)}>
        {value}
      </p>

      {/* Sublabel */}
      <p className="text-[11px] text-muted-foreground">{sublabel}</p>

      {isEditMode && (
        <p className="text-[9px] text-muted-foreground mt-auto font-mono">{metric}</p>
      )}
    </div>
  );
}
