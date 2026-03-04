'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import type { Project } from '@/lib/api/projects-client';

const STATUS_COLORS: Record<string, string> = {
  Planning: 'bg-blue-100 text-blue-700 border-blue-200',
  Active: 'bg-green-100 text-green-700 border-green-200',
  'On Hold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Completed: 'bg-gray-100 text-gray-700 border-gray-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
};

const RISK_COLORS: Record<string, string> = {
  'On Track': 'bg-green-100 text-green-700',
  'At Risk': 'bg-amber-100 text-amber-700',
  Blocked: 'bg-red-100 text-red-700',
};

export const projectColumns: ColumnDef<Project>[] = [
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
    header: 'Project',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.client && (
          <p className="text-xs text-muted-foreground">
            {row.original.client.name}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status] || ''}>
        {row.original.status}
      </Badge>
    ),
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'riskStatus',
    header: 'Risk',
    cell: ({ row }) => {
      const risk = row.original.riskStatus || 'On Track';
      return (
        <Badge className={RISK_COLORS[risk] || ''}>{risk}</Badge>
      );
    },
  },

  {
    accessorKey: 'contractedValue',
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Contracted Value"
      />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('contractedValue'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'estimatedRevenue',
    header: 'Est. Revenue',
    cell: ({ row }) =>
      row.original.estimatedRevenue
        ? `$${row.original.estimatedRevenue.toLocaleString()}`
        : '-',
  },
  {
    accessorKey: 'totalCost',
    header: 'Cost',
    cell: ({ row }) =>
      row.original.totalCost
        ? `$${row.original.totalCost.toLocaleString()}`
        : '-',
  },
  {
    accessorKey: 'projectManager',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Manager" />
    ),
    cell: ({ row }) => {
      const pm = row.original.projectManager;
      return (
        <div className="truncate max-w-37.">{pm?.name || '-'}</div>
      );
    },
  },
  {
    accessorKey: 'qs',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="QS" />
    ),
    cell: ({ row }) => {
      const qs = row.original.qs;
      return (
        <div className="truncate max-w-37.5">{qs?.name || '-'}</div>
      );
    },
  },
  {
    accessorKey: 'designer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Designer" />
    ),
    cell: ({ row }) => {
      const designer = row.original.designer;
      return (
        <div className="truncate max-w-37.5">
          {designer?.name || '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'estimatedDueDate',
    header: 'Due Date',
    cell: ({ row }) =>
      row.original.estimatedDueDate
        ? format(
            new Date(row.original.estimatedDueDate),
            'MMM d, yyyy',
          )
        : '-',
  },
];
