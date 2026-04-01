'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import type { UserResponse } from '@/lib/api/users-client';

const COLOR_CLASSES: Record<string, { bg: string; text: string; dot: string }> = {
  violet:  { bg: 'bg-violet-100/70',  text: 'text-violet-900',  dot: 'bg-violet-400'  },
  blue:    { bg: 'bg-blue-100/70',    text: 'text-blue-900',    dot: 'bg-blue-400'    },
  emerald: { bg: 'bg-emerald-100/70', text: 'text-emerald-900', dot: 'bg-emerald-400' },
  sky:     { bg: 'bg-sky-100/70',     text: 'text-sky-900',     dot: 'bg-sky-400'     },
  amber:   { bg: 'bg-amber-100/70',   text: 'text-amber-900',   dot: 'bg-amber-400'   },
  indigo:  { bg: 'bg-indigo-100/70',  text: 'text-indigo-900',  dot: 'bg-indigo-400'  },
  rose:    { bg: 'bg-rose-100/70',    text: 'text-rose-900',    dot: 'bg-rose-400'    },
  orange:  { bg: 'bg-orange-100/70',  text: 'text-orange-900',  dot: 'bg-orange-400'  },
  cyan:    { bg: 'bg-cyan-100/70',    text: 'text-cyan-900',    dot: 'bg-cyan-400'    },
};
const DEFAULT_COLOR = { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/30' };

function RolePill({ role, color }: { role: string; color?: string | null }) {
  const c = (color ? COLOR_CLASSES[color] : null) ?? DEFAULT_COLOR;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} />
      {role}
    </span>
  );
}

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface UserColumnsOptions {
  currentUserId: string;
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
}

export function createUserColumns({
  currentUserId,
  onEdit,
  onDelete,
}: UserColumnsOptions): ColumnDef<UserResponse>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
              style={{ fontSize: '9px' }}>
              {avatarInitials(user.name)}
            </div>
            <div>
              <span className="text-sm font-medium">{user.name}</span>
              {user.id === currentUserId && (
                <span className="ml-1.5 inline-flex items-center text-[10px] font-semibold rounded-full px-1.5 py-0.5 border text-muted-foreground bg-muted/60 border-border/50">
                  you
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue('email')}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <RolePill role={row.getValue('role') as string} color={row.original.roleColor} />
      ),
    },
    {
      id: 'team',
      accessorFn: (row) => row.teamName || row.team?.name || '-',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        const team = user.teamName || user.team?.name;
        return (
          <div>
            <span className="text-xs text-foreground">
              {team || (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
            {user.manager && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Reports to {user.manager.name}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              status === 'Active'
                ? 'bg-emerald-100/70 text-emerald-900'
                : 'bg-muted text-muted-foreground'
            }`}>
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === 'Active' ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`}
            />
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const user = row.original;
        const showEdit = user.canEdit;
        const showDelete = user.canDelete;

        if (!showEdit && !showDelete) {
          return (
            <div className="text-right">
              <span className="text-xs text-muted-foreground px-2">
                —
              </span>
            </div>
          );
        }

        return (
          <div
            className="flex justify-end gap-1"
            onClick={(e) => e.stopPropagation()}>
            {showEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(user)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete(user)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
