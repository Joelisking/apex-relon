'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  UserPlus,
  Loader2,
  Users,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { CreateUserDialog } from './CreateUserDialog';
import { UpdateUserDialog } from './UpdateUserDialog';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTable } from '@/components/ui/data-table';
import { createUserColumns } from './columns-users';

interface AdminUsersViewProps {
  currentUser: {
    id: string;
    role: string;
    name: string;
  };
}

export default function AdminUsersView({
  currentUser,
}: AdminUsersViewProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getUsers(),
    staleTime: 2 * 60 * 1000,
  });
  const users = data?.users ?? [];
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [userToUpdate, setUserToUpdate] =
    useState<UserResponse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] =
    useState<UserResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await usersApi.deleteUser(userToDelete.id);
      toast.success('User deleted', {
        description: `${userToDelete.name} has been removed from the system.`,
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An error occurred while deleting the user.';
      toast.error('Failed to delete user', { description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeleteUser = (user: UserResponse) => {
    if (!['CEO', 'ADMIN'].includes(currentUser.role)) return false;
    if (user.id === currentUser.id) return false;
    if (user.role === 'CEO') return false;
    if (user.role === 'ADMIN' && currentUser.role !== 'CEO')
      return false;
    return true;
  };

  const canEditUser = (user: UserResponse) => {
    if (user.id === currentUser.id) return false;
    if (currentUser.role === 'CEO') return true;
    if (currentUser.role === 'ADMIN') {
      return ['BDM', 'SALES', 'DESIGNER', 'QS'].includes(user.role);
    }
    if (currentUser.role === 'BDM') {
      return (
        user.role === 'SALES' && user.managerId === currentUser.id
      );
    }
    return false;
  };

  const managers = users.filter((u) => u.role === 'BDM');
  const activeUsers = users.filter((u) => u.status === 'Active');

  const columns = useMemo(
    () =>
      createUserColumns({
        currentUserId: currentUser.id,
        canEditUser,
        canDeleteUser,
        onEdit: (user) => {
          setUserToUpdate(user);
          setUpdateDialogOpen(true);
        },
        onDelete: (user) => {
          setUserToDelete(user);
          setDeleteDialogOpen(true);
        },
      }),
    [currentUser.id, currentUser.role],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-display tracking-tight">
          User Management
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage system users and their roles
        </p>
      </div>

      {/* Stat strip */}
      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/60">
          {[
            {
              label: 'Total Users',
              sublabel: 'All accounts',
              value: users.length,
              icon: Users,
              highlight: true,
            },
            {
              label: 'Active Users',
              sublabel: 'Currently active',
              value: activeUsers.length,
              icon: CheckCircle2,
            },
            {
              label: 'Managers',
              sublabel: 'BDM role',
              value: managers.length,
              icon: ShieldCheck,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="relative bg-card px-5 py-4">
                {s.highlight && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                )}
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium">
                    {s.label}
                  </p>
                </div>
                <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground/50">
                  {s.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Users table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
            All Users
          </p>
          {hasPermission('users:create') && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Add User
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground/50">No users found</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={users}
            globalFilter
            exportFilename="users"
          />
        )}
      </div>

      <CreateUserDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onUserCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        currentUserRole={currentUser.role}
        managers={managers}
      />

      <UpdateUserDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        onUserUpdated={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
        user={userToUpdate}
        currentUserRole={currentUser.role}
        managers={managers}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{userToDelete?.name}</strong> (
              {userToDelete?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
