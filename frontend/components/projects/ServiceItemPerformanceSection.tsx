'use client';

import { cn } from '@/lib/utils';
import type { ServiceItemPerformance } from '@/lib/api/projects-client';

function fmtHours(n: number) {
  return `${n % 1 === 0 ? n : n.toFixed(1)}h`;
}

function pct(actual: number, budget: number) {
  if (budget <= 0) return 0;
  return Math.min(Math.round((actual / budget) * 100), 200);
}

interface RoleBarProps {
  role: string;
  budget: number;
  actual: number;
}

function RoleBar({ role, budget, actual }: RoleBarProps) {
  const percentage = pct(actual, budget);
  const over = budget > 0 && actual > budget;
  const unbudgeted = budget === 0 && actual > 0;
  const remaining = budget - actual;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium truncate mr-2">{role}</span>
        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          {budget > 0 ? (
            <>
              <span className="text-muted-foreground">
                {fmtHours(actual)} / {fmtHours(budget)}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium min-w-[3ch] text-right',
                  over
                    ? 'text-red-600'
                    : percentage >= 80
                      ? 'text-amber-600'
                      : 'text-emerald-600',
                )}
              >
                {percentage}%
              </span>
            </>
          ) : unbudgeted ? (
            <>
              <span className="text-red-600">{fmtHours(actual)} logged</span>
              <span className="text-[11px] font-medium text-red-600">unbudgeted</span>
            </>
          ) : (
            <span className="text-muted-foreground">{fmtHours(actual)} logged</span>
          )}
        </div>
      </div>

      {(budget > 0 || unbudgeted) && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              unbudgeted || over
                ? 'bg-red-500'
                : percentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500',
            )}
            style={{ width: unbudgeted ? '100%' : `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}

      {budget > 0 && (
        <p
          className={cn(
            'text-[11px]',
            over ? 'text-red-600' : 'text-muted-foreground',
          )}
        >
          {over
            ? `${fmtHours(Math.abs(remaining))} over budget`
            : remaining === 0
              ? 'Budget fully used'
              : `${fmtHours(remaining)} remaining`}
        </p>
      )}

      {unbudgeted && (
        <p className="text-[11px] text-red-600">No budget allocated for this role</p>
      )}
    </div>
  );
}

interface Props {
  rows: ServiceItemPerformance[];
}

export function ServiceItemPerformanceSection({ rows }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.06em]">
        Hours by Service Item
      </p>

      <div className="grid gap-3">
        {rows.map((row) => {
          const allRoles = Array.from(
            new Set([
              ...Object.keys(row.proposedByRole),
              ...Object.keys(row.actualByRole),
            ]),
          ).sort();

          const totalBudget = Object.values(row.proposedByRole).reduce(
            (s, v) => s + v,
            0,
          );
          const totalActual = Object.values(row.actualByRole).reduce(
            (s, v) => s + v,
            0,
          );

          return (
            <div
              key={row.serviceItemId}
              className="rounded-lg border border-border/50 px-4 py-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{row.serviceItemName}</p>
                <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                  <span>{fmtHours(totalActual)} / {fmtHours(totalBudget)}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {allRoles.map((role) => (
                  <RoleBar
                    key={role}
                    role={role}
                    budget={row.proposedByRole[role] ?? 0}
                    actual={row.actualByRole[role] ?? 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
