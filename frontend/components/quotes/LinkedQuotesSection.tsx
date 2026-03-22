'use client';

import { useQuery } from '@tanstack/react-query';
import { Receipt, Plus, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { quotesApi } from '@/lib/api/quotes-client';
import type { Quote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_META: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    className: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground border-border/60',
  },
  SENT: {
    label: 'Sent',
    variant: 'secondary',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    variant: 'secondary',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'secondary',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  EXPIRED: {
    label: 'Expired',
    variant: 'secondary',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface LinkedQuotesSectionProps {
  leadId?: string;
  clientId?: string;
  projectId?: string;
}

export function LinkedQuotesSection({
  leadId,
  clientId,
  projectId,
}: LinkedQuotesSectionProps) {
  const router = useRouter();
  const entityId = leadId ?? clientId ?? projectId;

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['entity-quotes', leadId, clientId, projectId],
    queryFn: () => quotesApi.getAll({ leadId, clientId, projectId }),
    enabled: !!entityId,
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <Receipt className="h-3.5 w-3.5" />
          Quotes
          {quotes.length > 0 && (
            <span className="ml-0.5 text-muted-foreground/60">
              · {quotes.length}
            </span>
          )}
        </h3>
        {(leadId || projectId) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1 text-muted-foreground/60 hover:text-foreground ml-auto"
            onClick={() =>
              router.push(
                leadId
                  ? `/quotes/new?leadId=${leadId}`
                  : `/quotes/new?projectId=${projectId}`,
              )
            }>
            <Plus className="h-3 w-3" />
            New
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-2">
          Loading quotes…
        </p>
      ) : quotes.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          No quotes yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {quotes.map((quote: Quote) => {
            const meta =
              STATUS_META[quote.status] ?? STATUS_META.DRAFT;
            return (
              <div
                key={quote.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-background hover:bg-muted/30 transition-colors">
                {/* Quote number */}
                <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums w-14">
                  #{quote.quoteNumber}
                </span>

                {/* Status */}
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 text-[10px] font-medium px-1.5 py-0 h-5 border',
                    meta.className,
                  )}>
                  {meta.label}
                </Badge>

                {/* QB payment badge */}
                {quote.qbPaymentStatus === 'paid' && (
                  <Badge
                    variant="outline"
                    className="shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <BookOpen className="h-2.5 w-2.5" />
                    QB Paid
                  </Badge>
                )}

                {/* Total */}
                <span className="flex-1 text-sm font-semibold tabular-nums text-right">
                  {formatCurrency(quote.total, quote.currency)}
                </span>

                {/* Valid until */}
                {quote.validUntil && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Due {format(new Date(quote.validUntil), 'MMM d')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
