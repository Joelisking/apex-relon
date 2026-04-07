'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects-client';
import { serviceItemsApi } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import type { ProjectServiceItem } from '@/lib/types';

interface ProjectServiceItemsPanelProps {
  projectId: string;
  serviceTypeIds?: string[];
}

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

export function ProjectServiceItemsPanel({
  projectId,
  serviceTypeIds = [],
}: ProjectServiceItemsPanelProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('projects:edit');

  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { quantity?: string; unitPrice?: string }>
  >({});
  const [selectedServiceItemId, setSelectedServiceItemId] = useState('');

  const qk = ['project-service-items', projectId];

  const { data: links = [], isLoading } = useQuery<ProjectServiceItem[]>({
    queryKey: qk,
    queryFn: () => projectsApi.getServiceItems(projectId),
  });

  const { data: allServiceItems = [] } = useQuery({
    queryKey: ['service-items'],
    queryFn: () => serviceItemsApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const linkedIds = new Set(links.map((l) => l.serviceItemId));

  const availableItems = allServiceItems
    .filter((si) => si.isActive && !linkedIds.has(si.id))
    .filter((si) => {
      if (serviceTypeIds.length === 0) return true;
      return si.serviceTypeIds.some((id) => serviceTypeIds.includes(id));
    });

  const selectOptions = availableItems.map((si) => ({
    value: si.id,
    label: si.unit ? `${si.name} (${si.unit})` : si.name,
  }));

  const addMutation = useMutation({
    mutationFn: (serviceItemId: string) =>
      projectsApi.addServiceItem(projectId, { serviceItemId, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      setSelectedServiceItemId('');
      toast.success('Service item added');
    },
    onError: () => toast.error('Failed to add service item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      linkId,
      data,
    }: {
      linkId: string;
      data: { quantity?: number; unitPrice?: number | null };
    }) => projectsApi.updateServiceItem(projectId, linkId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk }),
    onError: () => toast.error('Failed to update service item'),
  });

  const removeMutation = useMutation({
    mutationFn: (linkId: string) => projectsApi.removeServiceItem(projectId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success('Service item removed');
    },
    onError: () => toast.error('Failed to remove service item'),
  });

  const clearPendingEdit = (linkId: string) => {
    setPendingEdits((prev) => {
      const next = { ...prev };
      delete next[linkId];
      return next;
    });
  };

  const handleQuantityBlur = (link: ProjectServiceItem) => {
    const raw = pendingEdits[link.id]?.quantity;
    if (raw === undefined) return;
    const parsed = parseFloat(raw);
    if (isNaN(parsed) || parsed <= 0) {
      clearPendingEdit(link.id);
      return;
    }
    updateMutation.mutate({ linkId: link.id, data: { quantity: parsed } });
    clearPendingEdit(link.id);
  };

  const handleUnitPriceBlur = (link: ProjectServiceItem) => {
    const raw = pendingEdits[link.id]?.unitPrice;
    if (raw === undefined) return;
    const parsed = raw === '' ? null : parseFloat(raw);
    if (parsed !== null && isNaN(parsed)) {
      clearPendingEdit(link.id);
      return;
    }
    updateMutation.mutate({ linkId: link.id, data: { unitPrice: parsed } });
    clearPendingEdit(link.id);
  };

  const estimatedTotal = links.reduce((sum, link) => {
    const price = link.unitPrice ?? link.serviceItem.defaultPrice ?? 0;
    return sum + link.quantity * price;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading service items...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No service items linked to this project.</p>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Unit</TableHead>
                <TableHead className="w-28">Quantity</TableHead>
                <TableHead className="w-36">Unit Price</TableHead>
                <TableHead className="w-32 text-right">Line Total</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const effectivePrice = link.unitPrice ?? link.serviceItem.defaultPrice ?? 0;
                const lineTotal = link.quantity * effectivePrice;
                const qtyVal =
                  pendingEdits[link.id]?.quantity ?? String(link.quantity);
                const priceVal =
                  pendingEdits[link.id]?.unitPrice ??
                  (link.unitPrice != null ? String(link.unitPrice) : '');

                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      {link.serviceItem.name}
                      {link.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{link.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {link.serviceItem.unit ?? '—'}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-7 text-xs w-20"
                          value={qtyVal}
                          onChange={(e) =>
                            setPendingEdits((prev) => ({
                              ...prev,
                              [link.id]: { ...prev[link.id], quantity: e.target.value },
                            }))
                          }
                          onBlur={() => handleQuantityBlur(link)}
                        />
                      ) : (
                        link.quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          placeholder={
                            link.serviceItem.defaultPrice != null
                              ? `default: ${link.serviceItem.defaultPrice}`
                              : 'none'
                          }
                          className="h-7 text-xs w-28"
                          value={priceVal}
                          onChange={(e) =>
                            setPendingEdits((prev) => ({
                              ...prev,
                              [link.id]: { ...prev[link.id], unitPrice: e.target.value },
                            }))
                          }
                          onBlur={() => handleUnitPriceBlur(link)}
                        />
                      ) : (
                        formatCurrency(effectivePrice)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(lineTotal)}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMutation.mutate(link.id)}
                          disabled={removeMutation.isPending}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end px-4 py-2 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground mr-4">Estimated Total</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 max-w-sm">
            <SearchableSelect
              value={selectedServiceItemId}
              onValueChange={setSelectedServiceItemId}
              options={selectOptions}
              placeholder="Add service item…"
              searchPlaceholder="Search service items…"
              emptyMessage={
                serviceTypeIds.length > 0
                  ? 'No matching service items for this project type.'
                  : 'No service items available.'
              }
            />
          </div>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={!selectedServiceItemId || addMutation.isPending}
            onClick={() => {
              if (selectedServiceItemId) addMutation.mutate(selectedServiceItemId);
            }}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
