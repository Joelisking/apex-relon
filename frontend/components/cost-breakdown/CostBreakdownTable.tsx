'use client';

import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, FileText, Clock } from 'lucide-react';
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
import type { CostBreakdown } from '@/lib/types';

interface Props {
  breakdowns: CostBreakdown[];
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  FINAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function CostBreakdownTable({ breakdowns, onDelete }: Props) {
  const router = useRouter();

  if (breakdowns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No cost breakdowns found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2">
              Title
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2 hidden md:table-cell">
              Service Type
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2 hidden md:table-cell">
              Linked To
            </th>
            <th className="text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2">
              Est. Hours
            </th>
            <th className="text-right text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2 hidden lg:table-cell">
              Est. Cost
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2 hidden md:table-cell">
              Status
            </th>
            <th className="text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground px-3 py-2 hidden lg:table-cell">
              Created
            </th>
            <th className="w-10 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((b) => (
            <tr
              key={b.id}
              className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/cost-breakdown/${b.id}`)}>
              <td className="px-3 py-2.5">
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.lines.length} phase{b.lines.length !== 1 ? 's' : ''}</p>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{b.jobType?.name ?? '—'}</span>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <span className="text-sm text-muted-foreground">
                  {b.project?.name ?? b.lead?.company ?? '—'}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-sm font-semibold tabular-nums flex items-center justify-end gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {b.totalEstimatedHours.toFixed(1)}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right hidden lg:table-cell">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {b.totalEstimatedCost > 0 ? formatCurrency(b.totalEstimatedCost) : '—'}
                </span>
              </td>
              <td className="px-3 py-2.5 hidden md:table-cell">
                <Badge className={cn('text-[10px] font-medium', STATUS_COLORS[b.status] ?? '')}>
                  {b.status}
                </Badge>
              </td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <span className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</span>
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/cost-breakdown/${b.id}`)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete(b.id)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
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
