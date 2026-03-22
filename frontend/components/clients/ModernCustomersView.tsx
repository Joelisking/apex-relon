'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Client, User } from '@/lib/types';
import { CreateCustomerDialog } from './CreateCustomerDialog';
import { useAuth } from '@/contexts/auth-context';
import { CustomerStatsCards } from './CustomerStatsCards';
import { CustomerBulkActions } from './CustomerBulkActions';
import { DataTable } from '@/components/ui/data-table';
import { getClientColumns } from './columns';
import { api } from '@/lib/api/client';
import { useTenantSettings } from '@/lib/hooks/useTenantSettings';
import { toast } from 'sonner';

interface ModernCustomersViewProps {
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
}

export default function ModernCustomersView({ currentUser }: ModernCustomersViewProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const { clientDisplayMode } = useTenantSettings();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);

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

  const managers = allUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }));

  const handleClientUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const handleExport = () => {
    if (selectedClients.length === 0) return;
    const headers = ['Name', 'Status', 'Industry', 'Segment', 'Lifetime Revenue', 'Account Manager'];
    const rows = selectedClients.map((c) => [
      c.name || '',
      c.status || '',
      c.industry || '',
      c.segment || '',
      c.lifetimeRevenue ?? '',
      (c as unknown as { accountManager?: { name?: string } }).accountManager?.name || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedClients.length} customer${selectedClients.length !== 1 ? 's' : ''}`);
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
          <h1 className="text-3xl font-display tracking-tight">Customer Portfolio</h1>
          <p className="text-muted-foreground flex items-center gap-1.5">
            {clients.length} customer{clients.length !== 1 ? 's' : ''} in your portfolio
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </p>
        </div>
        {hasPermission('clients:create') && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      <CustomerStatsCards clients={clients} />

      {clients.length === 0 ? (
        <div className="rounded-xl border border-border/60 border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No customers found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first customer to get started
          </p>
        </div>
      ) : (
        <>
          <CustomerBulkActions
            selectedClients={selectedClients}
            managers={managers}
            onClearSelection={() => setSelectedClients([])}
            onExport={handleExport}
          />
          <DataTable
            columns={getClientColumns(clientDisplayMode)}
            data={clients}
            globalFilter
            onRowClick={(client) => router.push(`/clients/${client.id}`)}
            exportFilename="clients"
            onSelectionChange={setSelectedClients}
            filterConfigs={[
              {
                columnId: 'status',
                title: 'Status',
                options: [...new Set(clients.map((c) => c.status).filter(Boolean))].map((v) => ({ label: v!, value: v! })),
              },
              {
                columnId: 'segment',
                title: 'Company Type',
                options: [...new Set(clients.map((c) => c.segment).filter(Boolean))].map((v) => ({ label: v!, value: v! })),
              },
              {
                columnId: 'industry',
                title: 'Industry',
                options: [...new Set(clients.map((c) => c.industry).filter(Boolean))].map((v) => ({ label: v!, value: v! })),
              },
              {
                columnId: 'manager',
                title: 'Manager',
                options: [...new Set(clients.map((c) => c.accountManager?.name || 'Unassigned'))].map((v) => ({ label: v, value: v })),
              },
            ]}
          />
        </>
      )}

      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleClientUpdated}
      />

    </div>
  );
}
