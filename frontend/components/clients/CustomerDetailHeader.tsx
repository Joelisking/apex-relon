'use client';

import { Heart, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types';

const STATUS_HEX: Record<string, string> = {
  Active: '#10b981',
  'At Risk': '#ef4444',
  Dormant: '#f59e0b',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100/70 text-emerald-900',
  'At Risk': 'bg-red-100/70 text-red-900',
  Dormant: 'bg-amber-100/70 text-amber-900',
};

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-400',
  'At Risk': 'bg-red-400',
  Dormant: 'bg-amber-400',
};

function getHealthHex(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

interface Props {
  client: Client;
  clientDisplayName: string;
  clientDisplaySubtitle: string | null;
  clientInitials: string;
  lifetimeRevenue: number;
  activitiesCount: number;
  projectsCount: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function CustomerDetailHeader({
  client,
  clientDisplayName,
  clientDisplaySubtitle,
  clientInitials,
  lifetimeRevenue,
  activitiesCount,
  projectsCount,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  const accentColor = STATUS_HEX[client.status] ?? '#6b7280';
  const statusColors = STATUS_COLORS[client.status] ?? 'bg-muted text-muted-foreground';
  const statusDot = STATUS_DOT[client.status] ?? 'bg-muted-foreground/30';

  const metricsItems = [
    {
      label: 'Lifetime Revenue',
      display: (
        <span className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
          ${(lifetimeRevenue / 1000).toFixed(0)}
          <span className="text-sm font-medium text-muted-foreground ml-0.5">k</span>
        </span>
      ),
    },
    ...(client.healthScore != null
      ? [
          {
            label: 'Health Score',
            display: (
              <span
                className="text-[20px] font-mono font-bold tabular-nums leading-none"
                style={{ color: getHealthHex(client.healthScore!) }}>
                {client.healthScore}
                <span className="text-sm font-medium text-muted-foreground ml-0.5">%</span>
              </span>
            ),
          },
        ]
      : []),
    {
      label: 'Activities',
      display: (
        <span className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
          {activitiesCount}
        </span>
      ),
    },
    {
      label: 'Projects',
      display: (
        <span className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
          {projectsCount}
        </span>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden mb-6">
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      {/* Identity + Actions */}
      <div className="relative px-6 py-5 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top left, ${accentColor}10, transparent 60%)`,
          }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-[15px]"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 0 3px ${accentColor}25`,
            }}>
            {clientInitials}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-semibold leading-tight text-foreground">
              {clientDisplayName}
            </h1>
            {(clientDisplaySubtitle || client.industry) && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {clientDisplaySubtitle || client.industry}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 ${statusColors}`}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
                {client.status}
              </span>
              {client.healthScore != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-muted text-muted-foreground">
                  <Heart className="h-2.5 w-2.5" />
                  {client.healthScore}%
                </span>
              )}
              {client.segment && (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground">
                  {client.segment}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 text-xs h-8">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div
        className="border-t border-border/40 bg-muted/20"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${metricsItems.length}, minmax(0, 1fr))`,
        }}>
        {metricsItems.map((m, i) => (
          <div
            key={m.label}
            className={`px-5 py-3.5 ${i > 0 ? 'border-l border-border/40' : ''}`}>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
              {m.label}
            </p>
            {m.display}
          </div>
        ))}
      </div>
    </div>
  );
}
