'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { addendaApi } from '@/lib/api/addenda-client';
import { rolesApi, type RoleResponse } from '@/lib/api/roles-client';
import { serviceItemsApi } from '@/lib/api/client';
import type { ServiceItem } from '@/lib/types';
import { AddendumCard } from './addenda/AddendumCard';
import { CreateAddendumDialog } from './addenda/CreateAddendumDialog';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface AddendumTabProps {
  projectId: string;
}

export function AddendumTab({ projectId }: AddendumTabProps) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch addenda
  const { data: addenda = [], isLoading } = useQuery({
    queryKey: ['addenda', projectId],
    queryFn: () => addendaApi.getAll(projectId),
  });

  // Fetch roles catalog
  const { data: roles = [] } = useQuery<RoleResponse[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60_000,
  });

  // Fetch service items
  const { data: serviceItems = [] } = useQuery<ServiceItem[]>({
    queryKey: ['service-items'],
    queryFn: () => serviceItemsApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['addenda', projectId] });
  }, [queryClient, projectId]);

  const approvedTotal = addenda
    .filter((a) => a.status === 'APPROVED' || a.status === 'INVOICED')
    .reduce((s, a) => s + a.total, 0);

  const draftTotal = addenda
    .filter((a) => a.status === 'DRAFT')
    .reduce((s, a) => s + a.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Addenda
          </h3>
          {addenda.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {approvedTotal > 0 && (
                <span className="text-emerald-600">{fmt(approvedTotal)} approved/invoiced</span>
              )}
              {approvedTotal > 0 && draftTotal > 0 && <span className="mx-1">·</span>}
              {draftTotal > 0 && <span>{fmt(draftTotal)} draft pending</span>}
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New Addendum
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : addenda.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-10 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No addenda yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Create an addendum to track scope changes and additional work
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {addenda.map((addendum) => (
            <AddendumCard
              key={addendum.id}
              addendum={addendum}
              roles={roles}
              serviceItems={serviceItems}
              onRefresh={invalidate}
            />
          ))}
        </div>
      )}

      <CreateAddendumDialog
        projectId={projectId}
        roles={roles}
        serviceItems={serviceItems}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={invalidate}
      />
    </div>
  );
}
