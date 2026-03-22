'use client';

import { useState } from 'react';
import { Download, Loader2, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, formatCurrency, formatDate } from './quote-utils';
import { quotesApi } from '@/lib/api/quotes-client';
import { API_URL } from '@/lib/api/client';
import { toast } from 'sonner';
import type { Quote } from '@/lib/types';

interface QuoteViewDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuoteViewDialog({ quote, open, onOpenChange }: QuoteViewDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingToQb, setIsSendingToQb] = useState(false);

  const handleSendToQuickBooks = async () => {
    if (!quote) return;
    setIsSendingToQb(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
      const res = await fetch(`${API_URL}/quickbooks/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quoteId: quote.id, clientId: quote.clientId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to send to QuickBooks');
      }
      const data = await res.json();
      toast.success(`Invoice created in QuickBooks (ID: ${data.qbInvoiceId})`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create QuickBooks invoice');
    } finally {
      setIsSendingToQb(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    setIsDownloading(true);
    try {
      const blob = await quotesApi.downloadPdf(quote.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const quoteNumber = String(quote.quoteNumber).padStart(4, '0');
      const entityName =
        quote.project?.name ??
        quote.lead?.company ??
        quote.lead?.contactName ??
        quote.client?.name ??
        null;
      const safeName = entityName
        ? `-${entityName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
        : '';
      a.href = url;
      a.download = `quote-${quoteNumber}${safeName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        {quote && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>Quote Q-{String(quote.quoteNumber).padStart(4, '0')}</span>
                <Badge className={cn('text-[10px]', STATUS_COLORS[quote.status])}>
                  {quote.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="font-medium">
                    {quote.lead?.company || quote.client?.name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="font-medium">{quote.createdBy?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDate(quote.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid Until</p>
                  <p>{formatDate(quote.validUntil) || '—'}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60 mb-2">
                  Line Items
                </p>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                          Description
                        </th>
                        <th className="text-right px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-16">
                          Qty
                        </th>
                        <th className="text-right px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-28">
                          Unit Price
                        </th>
                        <th className="text-right px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 w-28">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.lineItems.map((li, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="px-3 py-1.5">{li.description}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{li.quantity}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCurrency(li.unitPrice, quote.currency)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                            {formatCurrency(li.lineTotal, quote.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">
                      {formatCurrency(quote.subtotal, quote.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({quote.taxRate}%)</span>
                    <span className="tabular-nums">
                      {formatCurrency(quote.taxAmount, quote.currency)}
                    </span>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span className="tabular-nums">
                        -{formatCurrency(quote.discount, quote.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-1">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatCurrency(quote.total, quote.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {quote.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.termsAndConditions && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="text-sm whitespace-pre-wrap">{quote.termsAndConditions}</p>
                </div>
              )}
            </div>
          </>
        )}
        {quote && (
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToQuickBooks}
              disabled={isSendingToQb || !!quote.qbInvoiceId}
              className="gap-1.5">
              {isSendingToQb ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              {quote.qbInvoiceId ? 'Sent to QuickBooks' : 'Send to QuickBooks'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="gap-1.5">
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
