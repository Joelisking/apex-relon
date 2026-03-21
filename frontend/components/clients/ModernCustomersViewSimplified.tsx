'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Client } from '@/lib/types';
import { CreateCustomerDialog } from './CreateCustomerDialog';
import { CustomerStatsCards } from './CustomerStatsCards';
import { CustomerCard } from './CustomerCard';
import { CustomerDetailDialog } from './CustomerDetailDialog';
import { useAuth } from '@/contexts/auth-context';

interface ModernCustomersViewSimplifiedProps {
  clients: Client[];
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
}

export default function ModernCustomersViewSimplified({
  clients: initialClients,
  currentUser,
}: ModernCustomersViewSimplifiedProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleClientUpdated = () => {
    router.refresh();
  };

  const handleCloseDialog = () => {
    setSelectedClient(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Client Portfolio
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage and grow your client relationships
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

      {/* Create Client Dialog */}
      <CreateCustomerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Stats Cards */}
      <CustomerStatsCards clients={initialClients} />

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {initialClients.map((client) => (
          <CustomerCard
            key={client.id}
            client={client}
            onClick={() => setSelectedClient(client)}
          />
        ))}
      </div>

      {/* Client Detail Dialog */}
      <CustomerDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onClose={handleCloseDialog}
        currentUserId={currentUser.id}
        onClientUpdated={handleClientUpdated}
      />
    </div>
  );
}
