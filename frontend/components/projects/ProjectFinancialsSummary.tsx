'use client';

import { Fragment, useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { projectsApi, type ProjectProfitability, type ServiceItemPerformance } from '@/lib/api/projects-client';

interface ProjectFinancialsSummaryProps {
  projectId: string;
  contractedValue: number;
  invoicedValue?: number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtHours(h: number) {
  return h.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function ProjectFinancialsSummary({
  projectId,
  contractedValue,
  invoicedValue,
}: ProjectFinancialsSummaryProps) {
  const [data, setData] = useState<ProjectProfitability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi
      .getProfitability(projectId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading financials…
      </div>
    );
  }

  if (!data) return null;

  const margin = data.margin;
  const MarginIcon = margin >= 20 ? TrendingUp : margin >= 0 ? Minus : TrendingDown;
  const marginColor = margin >= 20 ? 'text-green-600' : margin >= 0 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      {/* Revenue & Cost summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/50 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Contracted</p>
          <p className="font-semibold text-sm">{fmt(contractedValue)}</p>
        </div>
        {invoicedValue != null && (
          <div className="rounded-lg border border-border/50 p-3 space-y-0.5">
            <p className="text-xs text-muted-foreground">Invoiced</p>
            <p className="font-semibold text-sm">{fmt(invoicedValue)}</p>
          </div>
        )}
        <div className="rounded-lg border border-border/50 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total Cost</p>
          <p className="font-semibold text-sm">{fmt(data.totalCost)}</p>
          {data.laborCost > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Labor {fmt(data.laborCost)} · Direct {fmt(data.directCost)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border/50 p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Gross Profit</p>
          <p className={`font-semibold text-sm ${data.grossProfit >= 0 ? '' : 'text-red-600'}`}>
            {fmt(data.grossProfit)}
          </p>
          <div className={`flex items-center gap-1 text-[11px] ${marginColor}`}>
            <MarginIcon className="h-3 w-3" />
            {margin.toFixed(1)}% margin
          </div>
        </div>
      </div>

      {/* Hours */}
      {(data.proposedHours > 0 || data.actualHours > 0) && (
        <div className="rounded-lg border border-border/50 p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">Hours</p>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Proposed </span>
              <span className="font-medium">{fmtHours(data.proposedHours)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Actual </span>
              <span className="font-medium">{fmtHours(data.actualHours)}</span>
            </div>
            {data.proposedHours > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Variance </span>
                <span className={`font-medium ${data.hoursVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {data.hoursVariance > 0 ? '+' : ''}{fmtHours(data.hoursVariance)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Labor by user */}
      {data.laborByUser.length > 0 && (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">Labor Breakdown</p>
          </div>
          <div className="divide-y divide-border/40">
            {data.laborByUser.map((u) => (
              <div key={u.userId} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{u.userName}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{fmtHours(u.hours)} hrs</span>
                  <span className="font-mono font-medium text-foreground">{fmt(u.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance: proposed vs actual per service item per role */}
      {data.serviceItemPerformance?.length > 0 && (
        <ServiceItemPerformanceTable rows={data.serviceItemPerformance} />
      )}
    </div>
  );
}

function ServiceItemPerformanceTable({ rows }: { rows: ServiceItemPerformance[] }) {
  // Collect all roles across all rows
  const roles = Array.from(
    new Set(
      rows.flatMap((r) => [
        ...Object.keys(r.proposedByRole),
        ...Object.keys(r.actualByRole),
      ]),
    ),
  ).sort();

  if (roles.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">
          Performance by Service Item
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/10">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Service Item</th>
              {roles.map((role) => (
                <th key={role} className="px-3 py-2 text-center font-medium text-muted-foreground" colSpan={2}>
                  {role}
                </th>
              ))}
            </tr>
            <tr className="border-b border-border/40 bg-muted/5">
              <th className="px-3 py-1.5" />
              {roles.map((role) => (
                <Fragment key={role}>
                  <th className="px-2 py-1.5 text-right font-normal text-muted-foreground w-16">
                    Budget
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal text-muted-foreground w-16">
                    Actual
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row) => (
              <tr key={row.serviceItemId} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{row.serviceItemName}</td>
                {roles.map((role) => {
                  const budget = row.proposedByRole[role] ?? 0;
                  const actual = row.actualByRole[role] ?? 0;
                  const over = budget > 0 && actual > budget;
                  return (
                    <Fragment key={role}>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {budget > 0 ? fmtHours(budget) : '—'}
                      </td>
                      <td className={`px-2 py-2 text-right tabular-nums ${over ? 'text-red-600 font-medium' : actual > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {actual > 0 ? fmtHours(actual) : '—'}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
