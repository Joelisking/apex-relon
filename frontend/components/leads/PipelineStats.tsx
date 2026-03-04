'use client';

import {
  TrendingUp,
  Trophy,
  CheckCircle2,
  Layers,
  Activity,
} from 'lucide-react';
import type { Lead } from '@/lib/types';
import type { PipelineStage } from '@/lib/api/pipeline-client';
import { useCurrency } from '@/lib/context/currency-context';

interface PipelineStatsProps {
  leads: Lead[];
  stages?: PipelineStage[];
}

export function PipelineStats({
  leads,
  stages = [],
}: PipelineStatsProps) {
  const { fmt } = useCurrency();
  const prospectiveLeads = leads.filter(
    (l) => l.stage !== 'Won' && l.stage !== 'Lost',
  );

  const weightedPipelineValue = prospectiveLeads.reduce((acc, l) => {
    const stage = stages.find((s) => s.name === l.stage);
    const probability = stage?.probability ?? 0;
    return acc + ((l.expectedValue || 0) * probability) / 100;
  }, 0);

  const wonLeads = leads.filter((l) => l.stage === 'Won');
  const closedWonValue = wonLeads.reduce(
    (acc, l) => acc + (l.contractedValue ?? l.expectedValue ?? 0),
    0,
  );

  const stats = [
    {
      label: 'Pipeline Value',
      sublabel: 'Probability-weighted',
      value: fmt(weightedPipelineValue),
      icon: TrendingUp,
      highlight: true,
    },
    {
      label: 'Closed & Won',
      sublabel: 'Contracted value',
      value: fmt(closedWonValue),
      icon: Trophy,
      highlight: false,
    },
    {
      label: 'Total Prospects',
      sublabel: 'In current view',
      value: String(leads.length),
      icon: Layers,
      highlight: false,
    },
    {
      label: 'Deals Won',
      sublabel: 'In current view',
      value: String(wonLeads.length),
      icon: CheckCircle2,
      highlight: false,
    },
    {
      label: 'In Progress',
      sublabel: 'Active prospects',
      value: String(prospectiveLeads.length),
      icon: Activity,
      highlight: false,
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* gap-px + bg-border creates 1px separator lines between cells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border/60">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card px-5 py-4 relative">
              {/* Left accent strip for primary metric */}
              {stat.highlight && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium truncate">
                  {stat.label}
                </p>
              </div>

              <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                {stat.value}
              </p>

              <p className="text-[11px] text-muted-foreground/50">
                {stat.sublabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
