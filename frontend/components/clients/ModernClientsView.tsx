'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Client, User } from '@/lib/types';
import { CreateClientDialog } from './CreateClientDialog';
import { useAuth } from '@/contexts/auth-context';
import { ClientStatsCards } from './ClientStatsCards';
import { ClientDetailDialog } from './ClientDetailDialog';
import { DataTable } from '@/components/ui/data-table';
import { getClientColumns } from './columns';
import { api } from '@/lib/api/client';
import { useTenantSettings } from '@/lib/hooks/useTenantSettings';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Manager {
  id: string;
  name: string;
  email: string;
  teamName?: string;
}

interface ModernClientsViewProps {
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
}

const CLIENT_STATUSES = ['Active', 'Inactive', 'At Risk'];

export default function ModernClientsView({
  currentUser,
}: ModernClientsViewProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { clientDisplayMode } = useTenantSettings();
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Bulk action state
  const [selectedClients, setSelectedClients] = useState<Client[]>(
    [],
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
    useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] =
    useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] =
    useState(false);
  const [bulkManagerDialogOpen, setBulkManagerDialogOpen] =
    useState(false);
  const [bulkManagerId, setBulkManagerId] = useState<string>('');
  const [isBulkAssigningManager, setIsBulkAssigningManager] =
    useState(false);

  const {
    data: clients = [],
    isLoading,
    isFetching,
  } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.clients.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.admin.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const managers: Manager[] = allUsers
    .filter((u) => u.role === 'BDM' || u.role === 'SALES')
    .map((u) => ({ ...u, teamName: u.teamName ?? undefined }));

  const handleClientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.clients.bulkDelete(selectedClients.map((c) => c.id));
      setSelectedClients([]);
      setBulkDeleteDialogOpen(false);
      toast.success(
        `${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''} deleted`,
      );
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      toast.error('Failed to delete some clients');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedClients.length === 0 || !bulkStatus) return;
    setIsBulkUpdatingStatus(true);
    try {
      await api.clients.bulkUpdate(
        selectedClients.map((c) => c.id),
        { status: bulkStatus },
      );
      setSelectedClients([]);
      setBulkStatusDialogOpen(false);
      setBulkStatus('');
      toast.success(
        `Status updated for ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`,
      );
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      toast.error('Failed to update status for some clients');
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

  const handleBulkAssignManager = async () => {
    if (selectedClients.length === 0 || !bulkManagerId) return;
    setIsBulkAssigningManager(true);
    try {
      await api.clients.bulkUpdate(
        selectedClients.map((c) => c.id),
        { accountManagerId: bulkManagerId },
      );
      setSelectedClients([]);
      setBulkManagerDialogOpen(false);
      setBulkManagerId('');
      toast.success(
        `Account manager assigned for ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`,
      );
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch {
      toast.error(
        'Failed to assign account manager for some clients',
      );
    } finally {
      setIsBulkAssigningManager(false);
    }
  };

  const handleExportClients = () => {
    if (selectedClients.length === 0) return;
    const headers = [
      'Name',
      'Status',
      'Industry',
      'Segment',
      'Lifetime Revenue',
      'Account Manager',
    ];
    const rows = selectedClients.map((c) => [
      c.name || '',
      c.status || '',
      c.industry || '',
      c.segment || '',
      c.lifetimeRevenue ?? '',
      (c as any).accountManager?.name || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`,
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">
            Client Portfolio
          </h1>
          <p className="text-muted-foreground flex items-center gap-1.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''}{' '}
            in your portfolio
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground/60" />
            )}
          </p>
        </div>
        {hasPermission('clients:create') && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        )}
      </div>

      {/* Stats */}
      <ClientStatsCards clients={clients} />

      {/* Clients Table */}
      {clients.length === 0 ? (
        <div className="rounded-xl border border-border/60 border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground/50">
            No clients found
          </p>
          <p className="text-xs text-muted-foreground/40 mt-1">
            Add your first client to get started
          </p>
        </div>
      ) : (
        <>
          {selectedClients.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/60 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedClients.length} selected
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setBulkStatusDialogOpen(true)}>
                  <ChevronDown className="h-3 w-3" />
                  Change Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setBulkManagerDialogOpen(true)}>
                  Assign Manager
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={handleExportClients}>
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => setBulkDeleteDialogOpen(true)}>
                  <Trash2 className="h-3 w-3" />
                  Delete selected
                </Button>
              </div>
            </div>
          )}
          <DataTable
            columns={getClientColumns(clientDisplayMode)}
            data={clients}
            globalFilter
            onRowClick={setSelectedClient}
            exportFilename="clients"
            onSelectionChange={setSelectedClients}
          />
        </>
      )}

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUser={currentUser}
        managers={managers}
        onCreated={handleClientUpdated}
      />

      {/* Client Detail Dialog */}
      <ClientDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        currentUserId={currentUser.id}
        accountManagers={managers}
        onClientUpdated={handleClientUpdated}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Selected Clients
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {selectedClients.length} client
                {selectedClients.length !== 1 ? 's' : ''}
              </strong>
              . All associated data will also be removed. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <AlertDialog
        open={bulkStatusDialogOpen}
        onOpenChange={(open) => {
          setBulkStatusDialogOpen(open);
          if (!open) setBulkStatus('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a status to apply to{' '}
              <strong>
                {selectedClients.length} selected client
                {selectedClients.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusChange}
              disabled={isBulkUpdatingStatus || !bulkStatus}>
              {isBulkUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Apply Status'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Manager Dialog */}
      <AlertDialog
        open={bulkManagerDialogOpen}
        onOpenChange={(open) => {
          setBulkManagerDialogOpen(open);
          if (!open) setBulkManagerId('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Assign Account Manager
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select an account manager to assign to{' '}
              <strong>
                {selectedClients.length} selected client
                {selectedClients.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select
              value={bulkManagerId}
              onValueChange={setBulkManagerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAssignManager}
              disabled={isBulkAssigningManager || !bulkManagerId}>
              {isBulkAssigningManager ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Manager'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
