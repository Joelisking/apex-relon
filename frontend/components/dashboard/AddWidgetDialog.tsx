'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { WidgetType, WidgetConfig } from '@/lib/types/dashboard-layout';
import { WIDGET_TYPE_LABELS, AVAILABLE_METRICS, WIDGET_PERMISSION_MAP, METRIC_PERMISSION_MAP } from '@/lib/types/dashboard-layout';

// Metrics that make sense as a single-number card
const METRIC_CARD_METRICS = AVAILABLE_METRICS.filter((m) =>
  [
    'totalRevenue', 'monthlyRevenue', 'quarterlyRevenue',
    'pipelineValue', 'totalLeads', 'wonLeads', 'lostLeads',
    'winRate', 'avgDealSize', 'activeClients',
    'totalProjects', 'activeProjects', 'projectsAtRisk',
  ].includes(m.value),
);
import {
  BarChart2,
  TrendingUp,
  Filter,
  ListTodo,
  Users,
  BrainCircuit,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface WidgetMeta {
  icon: React.ReactNode;
  description: string;
  iconColor: string;
  selectedBg: string;
  selectedBorder: string;
  hoverBorder: string;
}

const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  MetricCard: {
    icon: <Layers className="h-4.5 w-4.5" />,
    description: 'A single key metric shown large',
    iconColor: 'text-blue-500',
    selectedBg: 'bg-blue-50/70',
    selectedBorder: 'border-blue-300/80',
    hoverBorder: 'hover:border-blue-200',
  },
  AreaChart: {
    icon: <TrendingUp className="h-4.5 w-4.5" />,
    description: 'Trend over time as a filled area',
    iconColor: 'text-emerald-500',
    selectedBg: 'bg-emerald-50/70',
    selectedBorder: 'border-emerald-300/80',
    hoverBorder: 'hover:border-emerald-200',
  },
  BarChart: {
    icon: <BarChart2 className="h-4.5 w-4.5" />,
    description: 'Compare values across categories',
    iconColor: 'text-violet-500',
    selectedBg: 'bg-violet-50/70',
    selectedBorder: 'border-violet-300/80',
    hoverBorder: 'hover:border-violet-200',
  },
  FunnelChart: {
    icon: <Filter className="h-4.5 w-4.5" />,
    description: 'Pipeline stages and conversion',
    iconColor: 'text-amber-500',
    selectedBg: 'bg-amber-50/70',
    selectedBorder: 'border-amber-300/80',
    hoverBorder: 'hover:border-amber-200',
  },
  TaskList: {
    icon: <ListTodo className="h-4.5 w-4.5" />,
    description: 'Urgent and overdue tasks',
    iconColor: 'text-orange-500',
    selectedBg: 'bg-orange-50/70',
    selectedBorder: 'border-orange-300/80',
    hoverBorder: 'hover:border-orange-200',
  },
  LeadsList: {
    icon: <Users className="h-4.5 w-4.5" />,
    description: 'Latest leads with stage and value',
    iconColor: 'text-cyan-500',
    selectedBg: 'bg-cyan-50/70',
    selectedBorder: 'border-cyan-300/80',
    hoverBorder: 'hover:border-cyan-200',
  },
  AIPanel: {
    icon: <BrainCircuit className="h-4.5 w-4.5" />,
    description: 'AI-powered pipeline insights',
    iconColor: 'text-purple-500',
    selectedBg: 'bg-purple-50/70',
    selectedBorder: 'border-purple-300/80',
    hoverBorder: 'hover:border-purple-200',
  },
  BottleneckWidget: {
    icon: <AlertTriangle className="h-4.5 w-4.5" />,
    description: 'Team blockers, stuck projects, and slow pipeline stages',
    iconColor: 'text-red-500',
    selectedBg: 'bg-red-50/70',
    selectedBorder: 'border-red-300/80',
    hoverBorder: 'hover:border-red-200',
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (widget: WidgetConfig) => void;
  existingCount: number;
  hasPermission?: (p: string) => boolean;
}

export function AddWidgetDialog({ open, onClose, onAdd, existingCount, hasPermission = () => true }: Props) {
  const [selected, setSelected] = useState<WidgetType | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('');

  const handleAdd = () => {
    if (!selected) return;
    if (selected === 'MetricCard' && !selectedMetric) return;
    const id = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const metricMeta = METRIC_CARD_METRICS.find((m) => m.value === selectedMetric);
    const widget: WidgetConfig = {
      id,
      type: selected,
      position: { x: 0, y: Math.floor(existingCount / 4) },
      size: selected === 'MetricCard' ? { w: 3, h: 1 } : { w: 6, h: 2 },
      config: {
        title: selected === 'MetricCard' && metricMeta ? metricMeta.label : WIDGET_TYPE_LABELS[selected],
        ...(selectedMetric ? { metric: selectedMetric } : {}),
      },
    };
    onAdd(widget);
    setSelected(null);
    setSelectedMetric('');
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    setSelectedMetric('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add Widget</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a widget type to add to your dashboard
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5 mt-1">
          {(Object.keys(WIDGET_META) as WidgetType[]).filter((type) => {
            const perms = WIDGET_PERMISSION_MAP[type] ?? [];
            return perms.every((p) => hasPermission(p));
          }).map((type) => {
            const meta = WIDGET_META[type];
            const isSelected = selected === type;
            return (
              <button
                key={type}
                onClick={() => setSelected(type)}
                className={cn(
                  'group relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150',
                  isSelected
                    ? cn('shadow-sm', meta.selectedBg, meta.selectedBorder)
                    : cn('border-border/50 hover:bg-muted/20', meta.hoverBorder),
                )}>
                {/* Icon */}
                <div
                  className={cn(
                    'shrink-0 mt-0.5 transition-colors',
                    isSelected
                      ? meta.iconColor
                      : 'text-muted-foreground group-hover:text-muted-foreground',
                  )}>
                  {meta.icon}
                </div>

                {/* Text */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight transition-colors',
                      isSelected
                        ? 'text-foreground'
                        : 'text-muted-foreground group-hover:text-foreground',
                    )}>
                    {WIDGET_TYPE_LABELS[type]}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {meta.description}
                  </p>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div
                    className={cn(
                      'absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center',
                      meta.iconColor.replace('text-', 'bg-').replace(/\/\d+$/, ''),
                      'bg-opacity-15',
                    )}>
                    <svg
                      viewBox="0 0 12 12"
                      className={cn('w-2.5 h-2.5', meta.iconColor)}>
                      <path
                        d="M2.5 6L5 8.5 9.5 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Metric picker — only shown when MetricCard is selected */}
        {selected === 'MetricCard' && (
          <div className="mt-1 space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Which metric?
            </p>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
              {METRIC_CARD_METRICS.filter((m) => {
                const perms = METRIC_PERMISSION_MAP[m.value] ?? [];
                return perms.every((p) => hasPermission(p));
              }).map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMetric(m.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-left text-xs transition-all',
                    selectedMetric === m.value
                      ? 'bg-blue-50/70 border-blue-300/80 text-foreground font-medium'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-blue-200 hover:bg-muted/20',
                  )}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 mt-2">
          <button
            onClick={handleAdd}
            disabled={!selected || (selected === 'MetricCard' && !selectedMetric)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
              'bg-foreground text-background hover:bg-foreground/90',
              'disabled:opacity-30 disabled:cursor-not-allowed',
            )}>
            Add Widget
          </button>
          <button
            onClick={handleClose}
            className="flex-1 py-2 rounded-lg text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/30 transition-all">
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
