'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Lead } from '@/lib/types';

export const columns: ColumnDef<Lead>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {lead.contactName || lead.name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'company',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
  },
  {
    accessorKey: 'expectedValue',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expected Value" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('expectedValue')) || 0;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stage',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stage" />
    ),
    cell: ({ row }) => {
      const stage = row.getValue('stage') as string;
      return <Badge variant="outline">{stage}</Badge>;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'owner',
    accessorFn: (row) => row.assignedTo?.name || 'Unassigned',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Owner" />
    ),
    cell: ({ row }) => {
      const ownerName = row.original.assignedTo?.name || 'Unassigned';
      return (
        <span className="text-sm text-muted-foreground">
          {ownerName}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'metrics.daysSinceLastContact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Activity" />
    ),
    cell: ({ row }) => {
      const days = row.original.metrics?.daysSinceLastContact;
      if (days === undefined)
        return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {days} days ago
        </span>
      );
    },
  },
  {
    id: 'source',
    accessorFn: (row) => row.source || '',
    header: 'Source',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source || '—'}</span>,
  },
  {
    id: 'urgency',
    accessorFn: (row) => row.urgency || '',
    header: 'Urgency',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.urgency || '—'}</span>,
  },
  {
    id: 'county',
    accessorFn: (row) => (Array.isArray(row.county) ? row.county.join(', ') : row.county || ''),
    header: 'County',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{Array.isArray(row.original.county) ? row.original.county.join(', ') : row.original.county || '—'}</span>,
  },
  {
    id: 'serviceType',
    accessorFn: (row) => row.serviceType?.name || '',
    header: 'Service Type',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.serviceType?.name || '—'}</span>,
  },
  {
    id: 'aiRiskLevel',
    accessorFn: (row) => row.aiRiskLevel || '',
    header: 'AI Risk',
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.aiRiskLevel || '—'}</span>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(lead.id)}>
              Copy Lead ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
