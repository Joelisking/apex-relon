'use client';

import { Users, DollarSign, Heart, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Client } from '@/lib/types';
import { useCurrency } from '@/lib/context/currency-context';

interface ClientStatsCardsProps {
  clients: Client[];
}

export function ClientStatsCards({ clients }: ClientStatsCardsProps) {
  const { fmt } = useCurrency();
  const totalRevenue = clients.reduce((acc, c) => acc + (c.lifetimeRevenue || 0), 0);
  const activeClients = clients.filter((c) => c.status === 'Active').length;
  const atRiskClients = clients.filter(
    (c) => c.status === 'At Risk' || c.status === 'Dormant',
  ).length;
  const withHealthScore = clients.filter((c) => c.healthScore != null);
  const avgHealthScore =
    withHealthScore.length > 0
      ? withHealthScore.reduce((acc, c) => acc + (c.healthScore || 0), 0) /
        withHealthScore.length
      : 0;

  const stats = [
    {
      label: 'Total Clients',
      sublabel: 'In portfolio',
      value: String(clients.length),
      icon: Users,
      highlight: true,
      alert: false,
    },
    {
      label: 'Lifetime Revenue',
      sublabel: 'All time',
      value: fmt(totalRevenue),
      icon: DollarSign,
      highlight: false,
      alert: false,
    },
    {
      label: 'Active Clients',
      sublabel: 'Currently active',
      value: String(activeClients),
      icon: CheckCircle2,
      highlight: false,
      alert: false,
    },
    {
      label: 'Avg Health Score',
      sublabel: withHealthScore.length > 0 ? `${withHealthScore.length} scored` : 'No scores yet',
      value: withHealthScore.length > 0 ? `${avgHealthScore.toFixed(0)}%` : '—',
      icon: Heart,
      highlight: false,
      alert: false,
    },
    {
      label: 'At Risk',
      sublabel: 'Needs attention',
      value: String(atRiskClients),
      icon: AlertTriangle,
      highlight: false,
      alert: atRiskClients > 0,
    },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border/60">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`relative px-5 py-4 ${stat.alert ? 'bg-amber-50/60' : 'bg-card'}`}>
              {stat.highlight && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
              )}
              <div className="flex items-center gap-1.5 mb-2">
                <Icon
                  className={`h-3 w-3 shrink-0 ${
                    stat.alert ? 'text-amber-500' : 'text-muted-foreground/40'
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
              <p className="text-[11px] text-muted-foreground/50">{stat.sublabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
