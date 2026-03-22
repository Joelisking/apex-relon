'use client';

import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
}

// Color per stage index — blue → violet → purple progression
const STAGE_COLORS = [
  { bar: 'bg-blue-500',   text: 'text-blue-600',   pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  { bar: 'bg-indigo-500', text: 'text-indigo-600',  pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { bar: 'bg-violet-500', text: 'text-violet-600',  pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  { bar: 'bg-purple-500', text: 'text-purple-600',  pill: 'bg-purple-50 text-purple-700 border-purple-200' },
  { bar: 'bg-fuchsia-500',text: 'text-fuchsia-600', pill: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  { bar: 'bg-pink-500',   text: 'text-pink-600',    pill: 'bg-pink-50 text-pink-700 border-pink-200' },
];

export function FunnelChartWidget({ widget, metrics }: Props) {
  const title = widget.config.title || 'Pipeline Funnel';
  const stages = metrics?.funnelDropOff || [];
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-1.5 shrink-0 border-b border-border/50">
        <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
        <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
          {title}
        </p>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3.5">
        {stages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-8">No pipeline data</p>
        ) : (
          stages.map((stage, i) => {
            const pct = stage.count / maxCount;
            const colors = STAGE_COLORS[i % STAGE_COLORS.length];
            return (
              <div key={stage.stage} className="space-y-1.5">
                {/* Row: stage name + drop-off badge + count */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-foreground truncate">
                    {stage.stage}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {stage.dropOffRate > 0 && (
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold',
                        colors.pill,
                      )}>
                        ↓ {stage.dropOffRate.toFixed(0)}%
                      </span>
                    )}
                    <span className={cn('text-[13px] font-black tabular-nums', colors.text)}>
                      {stage.count}
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
