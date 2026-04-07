'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { costBreakdownApi } from '@/lib/api/cost-breakdown-client';
import type { CostBreakdown } from '@/lib/types';
import CostBreakdownTable from './CostBreakdownTable';
import CostBreakdownStatsBar from './CostBreakdownStatsBar';

const PAGE_SIZE = 25;

export default function CostBreakdownView() {
  const router = useRouter();
  const [breakdowns, setBreakdowns] = useState<CostBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const fetchBreakdowns = useCallback(async () => {
    try {
      setLoading(true);
      const data = await costBreakdownApi.getAll();
      setBreakdowns(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch cost breakdowns', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakdowns();
  }, [fetchBreakdowns]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await costBreakdownApi.delete(id);
      fetchBreakdowns();
    } catch (err) {
      console.error('Failed to delete cost breakdown', err);
    }
  }, [fetchBreakdowns]);

  const allCount = breakdowns.length;
  const draftCount = breakdowns.filter((b) => b.status === 'DRAFT').length;
  const finalCount = breakdowns.filter((b) => b.status === 'FINAL').length;
  const totalHours = breakdowns.reduce((s, b) => s + b.totalEstimatedHours, 0);

  const filtered = useMemo(() => {
    let result = breakdowns;
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((b) => {
        const title = b.title.toLowerCase();
        const type = (b.serviceType?.name ?? '').toLowerCase();
        const linked = (b.project?.name ?? b.lead?.company ?? '').toLowerCase();
        return title.includes(q) || type.includes(q) || linked.includes(q);
      });
    }
    return result;
  }, [breakdowns, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-10 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Cost Breakdowns</h1>
          <p className="text-sm text-muted-foreground">
            Estimating documents for surveying projects
          </p>
        </div>
        <Button onClick={() => router.push('/cost-breakdown/new')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Breakdown
        </Button>
      </div>

      <CostBreakdownStatsBar
        total={allCount}
        draftCount={draftCount}
        finalCount={finalCount}
        totalHours={totalHours}
      />

      <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 shadow-sm">
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search breakdowns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 w-[200px] lg:w-[260px] bg-muted/50 border-0 focus-visible:ring-1 text-sm"
          />
        </div>
        <div className="h-5 w-px bg-border/60 shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-28 text-xs rounded-full border-0 bg-muted/70 text-muted-foreground hover:bg-muted focus:ring-1">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
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
          {filtered.length} breakdown{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <CostBreakdownTable breakdowns={paged} onDelete={handleDelete} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs tabular-nums px-2">{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
