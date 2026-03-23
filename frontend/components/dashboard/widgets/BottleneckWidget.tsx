'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Clock, FolderOpen, TrendingDown, User } from 'lucide-react';
import Link from 'next/link';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import { bottleneckApi, type BottleneckWidgetSummary } from '@/lib/api/bottleneck-client';
import { cn } from '@/lib/utils';

interface Props {
  widget: WidgetConfig;
}

function ScoreBadge({ score }: { score: number }) {
  const level = score >= 20 ? 'high' : score >= 8 ? 'medium' : 'low';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums',
        level === 'high' && 'bg-red-100 text-red-700',
        level === 'medium' && 'bg-amber-100 text-amber-700',
        level === 'low' && 'bg-yellow-100 text-yellow-700',
      )}>
      {score}
    </span>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
      danger && value > 0 ? 'bg-red-50 text-red-700' : 'bg-muted/60 text-muted-foreground',
    )}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="text-[11px] font-semibold tabular-nums">{value}</span>
      <span className="text-[10px]">{label}</span>
    </div>
  );
}

export function BottleneckWidget({ widget }: Props) {
  const title = widget.config.title || 'Bottleneck Analysis';

  const { data, isLoading, isError } = useQuery<BottleneckWidgetSummary>({
    queryKey: ['bottleneck-widget-summary'],
    queryFn: () => bottleneckApi.getWidgetSummary(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {title}
          </p>
        </div>
        <Link
          href="/analytics"
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          Full Report
          <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-[11px] text-muted-foreground">Failed to load bottleneck data.</p>
        </div>
      )}

      {data && (
        <div className="flex-1 overflow-auto px-5 py-3 space-y-4 min-h-0">
          {/* Stats row */}
          <div className="flex flex-wrap gap-2">
            <StatPill
              icon={FolderOpen}
              label="stuck projects"
              value={data.stuckProjectCount}
              danger
            />
            <StatPill
              icon={Clock}
              label="overdue tasks"
              value={data.overdueTaskCount}
              danger
            />
            <StatPill
              icon={TrendingDown}
              label="critical stages"
              value={data.criticalStages.length}
              danger
            />
          </div>

          {/* Top Blockers */}
          {data.topBlockers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-red-600">
                Top Blockers
              </p>
              <div className="space-y-1">
                {data.topBlockers.map((blocker) => (
                  <div
                    key={blocker.userId}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    <span className="text-[12px] font-medium text-foreground flex-1 truncate">
                      {blocker.userName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {blocker.overdueCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {blocker.overdueCount} overdue
                        </span>
                      )}
                      {blocker.stuckProjectsBlocking > 0 && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          {blocker.stuckProjectsBlocking} project{blocker.stuckProjectsBlocking !== 1 ? 's' : ''}
                        </span>
                      )}
                      <ScoreBadge score={blocker.blockerScore} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-green-50 border border-green-200">
              <span className="text-[11px] text-green-700 font-medium">No significant blockers — team is on track.</span>
            </div>
          )}

          {/* Critical Stages */}
          {data.criticalStages.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-600">
                Slow Pipeline Stages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.criticalStages.map((stage) => (
                  <span
                    key={stage.stage}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
                    {stage.stage}
                    <span className="text-amber-600">{stage.avgDays}d avg</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
