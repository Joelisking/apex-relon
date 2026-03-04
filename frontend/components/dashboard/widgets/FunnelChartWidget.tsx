'use client';

import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { DashboardMetrics } from '@/lib/api/dashboard';

interface Props {
  widget: WidgetConfig;
  metrics?: DashboardMetrics;
}

export function FunnelChartWidget({ widget, metrics }: Props) {
  const title = widget.config.title || 'Pipeline Funnel';
  const stages = metrics?.funnelDropOff || [];
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 shrink-0 border-b border-border/40">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
          {title}
        </p>
      </div>

      {/* Funnel bars */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {stages.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 text-center py-6">
            No data
          </p>
        ) : (
          stages.map((stage, i) => {
            const pct = stage.count / maxCount;
            const opacity = Math.max(0.35, 1 - i * 0.15);
            return (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground/80 truncate max-w-[60%]">
                    {stage.stage}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {stage.dropOffRate > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">
                        &darr; {stage.dropOffRate.toFixed(0)}%
                      </span>
                    )}
                    <span className="text-[11px] font-semibold tabular-nums text-foreground">
                      {stage.count}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct * 100}%`,
                      backgroundColor: `hsl(var(--primary) / ${opacity})`,
                    }}
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
