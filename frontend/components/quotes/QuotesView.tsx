'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export default function QuotesView() {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const canCreate = hasPermission('quotes:create');
  const canEdit = hasPermission('quotes:edit');
  const canDelete = hasPermission('quotes:delete');

  if (loading) return <QuotesLoadingSkeleton />;

  // Stats always reflect the full quote portfolio, not just the current filter.
  const draftCount = allQuotes.filter((q) => q.status === 'DRAFT').length;
  const sentCount = allQuotes.filter((q) => q.status === 'SENT').length;
  const acceptedTotal = allQuotes
    .filter((q) => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + q.total, 0);
  const totalValue = allQuotes.reduce((sum, q) => sum + q.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Quotes</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage proposals and quotes
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => router.push('/quotes/new')} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        )}
      </div>

      <QuoteStatsBar
        draftCount={draftCount}
        sentCount={sentCount}
        acceptedTotal={acceptedTotal}
        totalValue={totalValue}
      />

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-35 h-8 text-xs">
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
      </div>

      <QuotesTable
        quotes={quotes}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        onView={setViewingQuote}
        onAction={handleAction}
        onDelete={setDeleteId}
      />

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
