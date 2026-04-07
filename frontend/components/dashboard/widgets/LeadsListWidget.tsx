'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api/client';
import { ExternalLink, Inbox, Zap } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { Lead } from '@/lib/types';
import { useCurrency } from '@/lib/context/currency-context';
import { cn } from '@/lib/utils';

interface Props {
  widget: WidgetConfig;
}

// Map first letter to one of 8 distinct hues — consistent per name
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

function getAvatarColor(name: string) {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const STAGE_PILL_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
];

function getStagePillColor(stage: string): string {
  const code = stage.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return STAGE_PILL_COLORS[code % STAGE_PILL_COLORS.length];
}

export function LeadsListWidget({ widget }: Props) {
  const title = widget.config.title || 'Recent Prospective Projects';
  const { fmtFull } = useCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ['leads-widget'],
    queryFn: () => leadsApi.getAll(),
    staleTime: 2 * 60 * 1000,
  });

  const leads = (Array.isArray(data) ? data : []).slice(0, 8);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {title}
          </span>
        </div>
        <Link
          href="/leads"
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          View all <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex-1 divide-y divide-border/40">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-muted/50 rounded w-2/3" />
                <div className="h-2 bg-muted/30 rounded w-1/3" />
              </div>
              <div className="h-4 w-16 bg-muted/40 rounded-full" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2.5">
          <Inbox className="h-6 w-6 text-muted-foreground" />
          <p className="text-[11px] font-medium text-muted-foreground">No prospective projects yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-border/40">
          {leads.map((lead: Lead) => {
            const displayName = (lead.company || lead.name) ?? '?';
            const initials = displayName
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const avatarColor = getAvatarColor(displayName);
            const stageColor = getStagePillColor(lead.stage);

            return (
              <div
                key={lead.id}
                className="px-5 py-2.5 hover:bg-muted/20 transition-colors flex items-center gap-3">
                {/* Avatar */}
                <div className={cn(
                  'w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0',
                  avatarColor,
                )}>
                  {initials}
                </div>

                {/* Name + value */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">{displayName}</p>
                  {lead.expectedValue && (
                    <p className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      {fmtFull(lead.expectedValue)}
                    </p>
                  )}
                </div>

                {/* Stage pill */}
                <span className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold shrink-0',
                  stageColor,
                )}>
                  {lead.stage}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
