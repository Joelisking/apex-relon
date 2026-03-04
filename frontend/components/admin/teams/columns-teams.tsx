'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Users } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import type { Team } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  Sales: 'bg-emerald-100/70 text-emerald-900',
  Design: 'bg-rose-100/70   text-rose-900',
  QS: 'bg-cyan-100/70   text-cyan-900',
};

const TYPE_DOT: Record<string, string> = {
  Sales: 'bg-emerald-400',
  Design: 'bg-rose-400',
  QS: 'bg-cyan-400',
};

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface TeamColumnsOptions {
  canManageTeams: boolean;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
}

export function createTeamColumns({
  canManageTeams,
  onEdit,
  onDelete,
}: TeamColumnsOptions): ColumnDef<Team>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div>
            <span className="text-sm font-medium">{team.name}</span>
            {team.description && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {team.description}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        const colors =
          TYPE_COLORS[type] ?? 'bg-muted text-muted-foreground';
        const dot = TYPE_DOT[type] ?? 'bg-muted-foreground/30';
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`}
            />
            {type}
          </span>
        );
      },
    },
    {
      id: 'manager',
      accessorFn: (row) => row.manager?.name || '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Manager" />
      ),
      cell: ({ row }) => {
        const team = row.original;
        if (!team.manager) {
          return (
            <span className="text-xs text-muted-foreground/40">
              —
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold shrink-0"
              style={{ fontSize: '7px' }}>
              {avatarInitials(team.manager.name)}
            </div>
            <span className="text-xs">{team.manager.name}</span>
          </div>
        );
      },
    },
    {
      id: 'members',
      accessorFn: (row) => row._count?.members || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      cell: ({ row }) => {
        const team = row.original;
        const count = team._count?.members || 0;
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3 text-muted-foreground/40" />
            {count}
          </div>
        );
      },
    },
    ...(canManageTeams
      ? [
          {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }: { row: { original: Team } }) => {
              const team = row.original;
              return (
                <div
                  className="flex justify-end gap-1"
                  onClick={(e: React.MouseEvent) =>
                    e.stopPropagation()
                  }>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                    onClick={() => onEdit(team)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onDelete(team)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            },
          } as ColumnDef<Team>,
        ]
      : []),
  ];
}
