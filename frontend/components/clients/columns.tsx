'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import type { Client } from '@/lib/types';
import {
  getClientDisplayName,
  getClientSubtitle,
} from '@/lib/utils/client-display';

function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100/70 text-emerald-900',
  'at risk': 'bg-red-100/70    text-red-900',
  dormant: 'bg-amber-100/70  text-amber-900',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-400',
  'at risk': 'bg-red-400',
  dormant: 'bg-amber-400',
};

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

export function getClientColumns(
  clientDisplayMode: 'COMPANY' | 'CONTACT' = 'COMPANY',
): ColumnDef<Client>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => {
        const client = row.original;
        const displayName = getClientDisplayName(
          client,
          clientDisplayMode,
        );
        const subtitle = getClientSubtitle(client, clientDisplayMode);
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
              style={{ fontSize: '9px' }}>
              {avatarInitials(displayName)}
            </div>
            <div>
              <p className="text-sm font-medium">{displayName}</p>
              {subtitle ? (
                <p className="text-xs text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'industry',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Industry" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue('industry')}
        </span>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'segment',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company Type" />
      ),
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground">
          {row.getValue('segment')}
        </span>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const key = status.toLowerCase();
        const colors =
          STATUS_COLORS[key] ?? 'bg-muted text-muted-foreground';
        const dot = STATUS_DOT[key] ?? 'bg-muted-foreground/30';
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`}
            />
            {status}
          </span>
        );
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: 'healthScore',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Health" />
      ),
      cell: ({ row }) => {
        const score = row.getValue('healthScore') as number | null;
        if (score == null) {
          return (
            <span className="text-xs text-muted-foreground">
              —
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2 min-w-20">
            <Progress value={score} className="h-1.5 w-12" />
            <span
              className={`text-xs font-medium ${getHealthColor(score)}`}>
              {score}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lifetimeRevenue',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Revenue"
          className="justify-end"
        />
      ),
      cell: ({ row }) => {
        const revenue = row.getValue('lifetimeRevenue') as number;
        return (
          <div className="text-right font-medium tabular-nums text-sm">
            ${((revenue || 0) / 1000).toFixed(0)}k
          </div>
        );
      },
    },
    {
      id: 'manager',
      accessorFn: (row) => row.accountManager?.name || 'Unassigned',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Manager" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue('manager')}
        </span>
      ),
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
  ];
}

// Keep backward-compatible static export for any code that imports clientColumns directly
export const clientColumns = getClientColumns('COMPANY');
