'use client';

import { useRouter } from 'next/navigation';
import {
  MoreHorizontal,
  Pencil,
  Download,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Plus,
  FileText,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, formatCurrency, formatDate } from './quote-utils';
import type { Quote } from '@/lib/types';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';
import { toast } from 'sonner';

interface QuotesTableProps {
  quotes: Quote[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (quote: Quote) => void;
  onAction: (quote: Quote, action: 'accept' | 'reject') => void;
  onDelete: (quoteId: string) => void;
}

export default function QuotesTable({
  quotes,
  canCreate,
  canEdit,
  canDelete,
  onView,
  onAction,
  onDelete,
}: QuotesTableProps) {
  const router = useRouter();

  const handleSendToQb = async (quoteId: string) => {
    try {
      const token = getTokenFromClientCookies() ?? '';
      const res = await fetch(`${API_URL}/quickbooks/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quoteId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Failed to send to QuickBooks');
      }
      toast.success('Invoice created in QuickBooks');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to send to QuickBooks');
    }
  };

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">No quotes found</p>
        {canCreate && (
          <Button
            onClick={() => router.push('/quotes/new')}
            variant="outline"
            size="sm"
            className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create your first quote
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
              #
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
              Recipient
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2 hidden md:table-cell">
              Status
            </th>
            <th className="text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2">
              Total
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2 hidden md:table-cell">
              Date
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60 px-3 py-2 hidden lg:table-cell">
              Valid Until
            </th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr
              key={quote.id}
              className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onView(quote)}>
              <td className="px-3 py-2.5">
                <span className="text-sm font-medium">
                  Q-{String(quote.quoteNumber).padStart(4, '0')}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <p className="text-sm font-medium">
                  {quote.project?.name || quote.lead?.company || quote.client?.name || '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quote.project
                    ? quote.client?.name || ''
                    : quote.lead?.contactName || quote.client?.email || ''}
                </p>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <div className="flex items-center gap-1.5">
                  <Badge
                    className={cn('text-[10px] font-medium', STATUS_COLORS[quote.status])}>
                    {quote.status}
                  </Badge>
                  {quote.qbPaymentStatus === 'paid' && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <BookOpen className="h-2.5 w-2.5" />
                      QB Paid
                    </Badge>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(quote.total, quote.currency)}
                </span>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className="text-xs text-muted-foreground">
                  {formatDate(quote.createdAt)}
                </span>
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">
                  {formatDate(quote.validUntil)}
                </span>
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(quote)}>
                      <Eye className="mr-2 h-3.5 w-3.5" />
                      View
                    </DropdownMenuItem>
                    {canEdit && quote.status === 'DRAFT' && (
                      <DropdownMenuItem
                        onClick={() => router.push(`/quotes/${quote.id}/edit`)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push(`/quotes/${quote.id}/edit`)}>
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Preview / Print
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleSendToQb(quote.id)}
                      disabled={!!quote.qbInvoiceId}>
                      <BookOpen className="mr-2 h-3.5 w-3.5 text-green-600" />
                      {quote.qbInvoiceId ? 'Sent to QuickBooks' : 'Send to QuickBooks'}
                    </DropdownMenuItem>
                    {canEdit && quote.status === 'SENT' && (
                      <>
                        <DropdownMenuItem onClick={() => onAction(quote, 'accept')}>
                          <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-green-600" />
                          Mark Accepted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAction(quote, 'reject')}>
                          <XCircle className="mr-2 h-3.5 w-3.5 text-red-600" />
                          Mark Rejected
                        </DropdownMenuItem>
                      </>
                    )}
                    {canDelete && quote.status === 'DRAFT' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(quote.id)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
