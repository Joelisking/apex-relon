'use client';

import {
  DollarSign,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type { Project } from '@/lib/api/projects-client';
import { useCurrency } from '@/lib/context/currency-context';

interface ProjectStatsProps {
  projects: Project[];
}

export function ProjectStats({ projects }: ProjectStatsProps) {
  const { fmt } = useCurrency();
  const activeProjects = projects.filter(
    (p) => p.status === 'Active',
  );
  const completedProjects = projects.filter(
    (p) => p.status === 'Completed',
  );
  const atRiskProjects = projects.filter(
    (p) => p.riskStatus === 'At Risk' || p.riskStatus === 'Blocked',
  );

  const totalContracted = projects.reduce(
    (acc, p) => acc + (p.contractedValue || 0),
    0,
  );
  const activeContracted = activeProjects.reduce(
    (acc, p) => acc + (p.contractedValue || 0),
    0,
  );

  const stats = [
    {
      label: 'Total Contracted',
      sublabel: 'All projects',
      value: fmt(totalContracted),
      icon: DollarSign,
      highlight: true,
      alert: false,
    },
    {
      label: 'Active Value',
      sublabel: 'In progress',
      value: fmt(activeContracted),
      icon: Zap,
      highlight: false,
      alert: false,
    },
    {
      label: 'Active Projects',
      sublabel: 'Currently running',
      value: String(activeProjects.length),
      icon: Layers,
      highlight: false,
      alert: false,
    },
    {
      label: 'Completed',
      sublabel: 'Finished projects',
      value: String(completedProjects.length),
      icon: CheckCircle2,
      highlight: false,
      alert: false,
    },
    {
      label: 'At Risk / Blocked',
      sublabel: 'Needs attention',
      value: String(atRiskProjects.length),
      icon: AlertTriangle,
      highlight: false,
      alert: atRiskProjects.length > 0,
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
              className={`relative px-5 py-4 ${
                stat.alert ? 'bg-amber-50/60' : 'bg-card'
              }`}>
              {/* Left accent strip for primary metric */}
              {stat.highlight && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
              )}

              <div className="flex items-center gap-1.5 mb-2">
                <Icon
                  className={`h-3 w-3 shrink-0 ${
                    stat.alert
                      ? 'text-amber-500'
                      : 'text-muted-foreground/40'
                  }`}
                />
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium truncate">
                  {stat.label}
                </p>
              </div>

              <p
                className={`text-[22px] font-bold tabular-nums leading-none mb-1 ${
                  stat.alert ? 'text-amber-700' : 'text-foreground'
                }`}>
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
