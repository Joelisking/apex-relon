'use client';

import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '@/lib/api/client';
import { Zap, ExternalLink, Inbox } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import type { Lead } from '@/lib/types';
import { useCurrency } from '@/lib/context/currency-context';
import { cn } from '@/lib/utils';

interface Props {
  widget: WidgetConfig;
}

const STAGE_COLORS: Record<string, string> = {
  Qualified: 'bg-blue-50 text-blue-700 border-blue-200',
  Proposal: 'bg-violet-50 text-violet-700 border-violet-200',
  Negotiation: 'bg-amber-50 text-amber-700 border-amber-200',
  'Closed Won': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function LeadsListWidget({ widget }: Props) {
  const title = widget.config.title || 'Recent Leads';
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
      <div className="px-5 py-3 flex items-center justify-between border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
            {title}
          </span>
        </div>
        <a
          href="/leads"
          className="text-[10px] text-muted-foreground/50 hover:text-foreground flex items-center gap-1 transition-colors">
          View all <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex-1 divide-y divide-border/40">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-muted/60 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-muted/60 rounded w-2/3" />
                <div className="h-2 bg-muted/40 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">No leads</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-border/40">
          {leads.map((lead: Lead) => {
            const initials = ((lead.company || lead.name) ?? '?')
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();
            const stageColor =
              STAGE_COLORS[lead.stage] ??
              'bg-muted text-muted-foreground border-border/60';
            return (
              <div
                key={lead.id}
                className="px-4 py-2.5 hover:bg-muted/30 transition-colors flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary/70 text-[10px] font-semibold flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">
                    {lead.company || lead.name}
                  </p>
                  {lead.expectedValue && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {fmtFull(lead.expectedValue)}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium shrink-0',
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
