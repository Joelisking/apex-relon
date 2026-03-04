'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import type { UserResponse } from '@/lib/api/users-client';

const ROLE_DOT: Record<string, string> = {
  CEO: 'bg-violet-400',
  ADMIN: 'bg-blue-400',
  BDM: 'bg-orange-400',
  SALES: 'bg-emerald-400',
  DESIGNER: 'bg-rose-400',
  QS: 'bg-cyan-400',
};

const ROLE_COLORS: Record<string, string> = {
  CEO: 'bg-violet-100/70 text-violet-900',
  ADMIN: 'bg-blue-100/70   text-blue-900',
  BDM: 'bg-orange-100/70  text-orange-900',
  SALES: 'bg-emerald-100/70 text-emerald-900',
  DESIGNER: 'bg-rose-100/70   text-rose-900',
  QS: 'bg-cyan-100/70   text-cyan-900',
};

function RolePill({ role }: { role: string }) {
  const colors =
    ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground';
  const dot = ROLE_DOT[role] ?? 'bg-muted-foreground/30';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
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
  canEditUser: (user: UserResponse) => boolean;
  canDeleteUser: (user: UserResponse) => boolean;
  onEdit: (user: UserResponse) => void;
  onDelete: (user: UserResponse) => void;
}

export function createUserColumns({
  currentUserId,
  canEditUser,
  canDeleteUser,
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
        <RolePill role={row.getValue('role') as string} />
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
                <span className="text-muted-foreground/50">—</span>
              )}
            </span>
            {user.manager && (
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
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
        const showEdit = canEditUser(user);
        const showDelete = canDeleteUser(user);

        if (!showEdit && !showDelete) {
          return (
            <div className="text-right">
              <span className="text-xs text-muted-foreground/30 px-2">
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
                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                onClick={() => onEdit(user)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            {showDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-red-600 hover:bg-red-50"
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
