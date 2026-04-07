'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { quotesApi } from '@/lib/api/quotes-client';
import type { Quote } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

function QuoteBreakdown({ quote }: { quote: Quote }) {
  const showTax = quote.taxAmount > 0;
  const showDiscount = quote.discount > 0;

  return (
    <div className="px-3 pb-3 pt-1">
      {/* Line items */}
      {quote.lineItems.length > 0 && (
        <table className="w-full text-xs mb-2">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              <th className="text-left font-medium pb-1 pr-2">Description</th>
              <th className="text-right font-medium pb-1 px-2 w-10">Qty</th>
              <th className="text-right font-medium pb-1 px-2 w-20">Unit</th>
              <th className="text-right font-medium pb-1 pl-2 w-20">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {quote.lineItems.map((item, i) => (
              <tr key={item.id ?? i}>
                <td className="py-1 pr-2 text-foreground">{item.description}</td>
                <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                  {item.quantity}
                </td>
                <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.unitPrice, quote.currency)}
                </td>
                <td className="py-1 pl-2 text-right tabular-nums font-medium">
                  {formatCurrency(item.lineTotal, quote.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Totals footer */}
      <div className="border-t border-border/60 pt-2 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(quote.subtotal, quote.currency)}</span>
        </div>
        {showTax && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax ({quote.taxRate}%)</span>
            <span className="tabular-nums">{formatCurrency(quote.taxAmount, quote.currency)}</span>
          </div>
        )}
        {showDiscount && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Discount</span>
            <span className="tabular-nums text-red-600">
              -{formatCurrency(quote.discount, quote.currency)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border/60">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(quote.total, quote.currency)}</span>
        </div>
      </div>
    </div>
  );
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
  const entityId = leadId ?? clientId ?? projectId;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['entity-quotes', leadId, clientId, projectId],
    queryFn: async () => {
      const result = await quotesApi.getAll({ leadId, clientId, projectId });
      // Auto-expand the primary quote when in project context
      if (projectId && result.length > 0) {
        const primary =
          result.find((q: Quote) => q.status === 'ACCEPTED') ??
          result.find((q: Quote) => q.status === 'SENT') ??
          result[0];
        setExpandedIds(new Set([primary.id]));
      }
      return result;
    },
    enabled: !!entityId,
  });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          <Receipt className="h-3.5 w-3.5" />
          Quotes
          {quotes.length > 0 && (
            <span className="ml-0.5 text-muted-foreground">
              · {quotes.length}
            </span>
          )}
        </h3>
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
            const meta = STATUS_META[quote.status] ?? STATUS_META.DRAFT;
            const isExpanded = expandedIds.has(quote.id);

            return (
              <div
                key={quote.id}
                className="rounded-lg border border-border/50 bg-background overflow-hidden">
                {/* Summary row */}
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => toggleExpand(quote.id)}>
                  {isExpanded ? (
                    <ChevronDown className="shrink-0 h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="shrink-0 h-3 w-3 text-muted-foreground" />
                  )}

                  <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums w-14">
                    #{quote.quoteNumber}
                  </span>

                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-medium px-1.5 py-0 h-5 border',
                      meta.className,
                    )}>
                    {meta.label}
                  </Badge>

                  {quote.qbPaymentStatus === 'paid' && (
                    <Badge
                      variant="outline"
                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <BookOpen className="h-2.5 w-2.5" />
                      QB Paid
                    </Badge>
                  )}

                  <span className="flex-1 text-sm font-semibold tabular-nums text-right">
                    {formatCurrency(quote.total, quote.currency)}
                  </span>

                  {quote.validUntil && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Due {format(new Date(quote.validUntil), 'MMM d')}
                    </span>
                  )}
                </button>

                {/* Breakdown */}
                {isExpanded && <QuoteBreakdown quote={quote} />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
