'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { quotesApi, quoteSettingsApi } from '@/lib/api/quotes-client';
import { useAuth } from '@/contexts/auth-context';
import type { Quote, QuoteSettings } from '@/lib/types';
import QuotesLoadingSkeleton from './QuotesLoadingSkeleton';
import QuoteStatsBar from './QuoteStatsBar';
import QuotesTable from './QuotesTable';
import QuoteViewDialog from './QuoteViewDialog';
import QuoteDeleteDialog from './QuoteDeleteDialog';
import { QuoteAcceptedLeadDialog } from './QuoteAcceptedLeadDialog';

const PAGE_SIZE = 25;

export default function QuotesView() {
  const { hasPermission } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [settings, setSettings] = useState<QuoteSettings | null>(null);
  const [pendingLeadAdvance, setPendingLeadAdvance] = useState<Quote | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const [filtered, all] = await Promise.all([
        quotesApi.getAll(statusFilter !== 'all' ? { status: statusFilter } : undefined),
        statusFilter !== 'all' ? quotesApi.getAll() : Promise.resolve(null),
      ]);
      setQuotes(filtered);
      if (all !== null) setAllQuotes(all);
      else setAllQuotes(filtered);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch quotes', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    quoteSettingsApi.get().then(setSettings).catch(console.error);
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleAction = async (quote: Quote, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await quotesApi.accept(quote.id);
        fetchQuotes();
        if (settings?.enableLeadIntegration && quote.leadId) {
          setPendingLeadAdvance(quote);
        }
      } else if (action === 'reject') {
        await quotesApi.reject(quote.id);
        fetchQuotes();
      }
    } catch (err) {
      console.error(`Failed to ${action} quote`, err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await quotesApi.delete(deleteId);
      setDeleteId(null);
      fetchQuotes();
    } catch (err) {
      console.error('Failed to delete quote', err);
    }
  };

  const canEdit = hasPermission('quotes:edit');
  const canDelete = hasPermission('quotes:delete');

  // Stats always reflect the full quote portfolio, not just the current filter.
  const draftCount = allQuotes.filter((q) => q.status === 'DRAFT').length;
  const sentCount = allQuotes.filter((q) => q.status === 'SENT').length;
  const acceptedTotal = allQuotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + q.total, 0);
  const totalValue = allQuotes.reduce((sum, q) => sum + q.total, 0);

  // Client-side search across quote number, recipient, company, project name
  const filteredBySearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) => {
      const num = `Q-${String(quote.quoteNumber).padStart(4, '0')}`.toLowerCase();
      const recipient = (
        quote.project?.name ||
        quote.lead?.company ||
        quote.client?.name ||
        ''
      ).toLowerCase();
      const contact = (
        quote.lead?.contactName ||
        quote.client?.email ||
        ''
      ).toLowerCase();
      return num.includes(q) || recipient.includes(q) || contact.includes(q);
    });
  }, [quotes, searchQuery]);

  if (loading) return <QuotesLoadingSkeleton />;

  const totalPages = Math.max(1, Math.ceil(filteredBySearch.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedQuotes = filteredBySearch.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Invoicing</h1>
          <p className="text-sm text-muted-foreground">
            Invoices synced from QuickBooks
          </p>
        </div>
      </div>

      <QuoteStatsBar
        draftCount={draftCount}
        sentCount={sentCount}
        acceptedTotal={acceptedTotal}
        totalValue={totalValue}
      />

      {/* Filter rail */}
      <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 shadow-sm">
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 w-[200px] lg:w-[260px] bg-muted/50 border-0 focus-visible:ring-1 text-sm"
          />
        </div>
        <div className="h-5 w-px bg-border/60 shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-36 text-xs rounded-full border-0 bg-muted/70 text-muted-foreground hover:bg-muted focus:ring-1">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 ml-auto">
            Clear
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredBySearch.length} quote{filteredBySearch.length !== 1 ? 's' : ''}
        </span>
      </div>

      <QuotesTable
        quotes={pagedQuotes}
        canEdit={canEdit}
        canDelete={canDelete}
        onView={setViewingQuote}
        onAction={handleAction}
        onDelete={setDeleteId}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredBySearch.length)} of {filteredBySearch.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <QuoteViewDialog
        quote={viewingQuote}
        open={!!viewingQuote}
        onOpenChange={(open) => !open && setViewingQuote(null)}
      />

      <QuoteDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
      />

      <QuoteAcceptedLeadDialog
        quote={pendingLeadAdvance}
        open={!!pendingLeadAdvance}
        onClose={() => setPendingLeadAdvance(null)}
      />
    </div>
  );
}
