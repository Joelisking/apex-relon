'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { qbFetch, QbStatus, SyncLog } from './quickbooks/qb-api';
import { QbConnectionCard } from './quickbooks/QbConnectionCard';
import { QbSyncActionsCard, SyncType } from './quickbooks/QbSyncActionsCard';
import { QbSyncHistoryCard } from './quickbooks/QbSyncHistoryCard';

export function QuickBooksView() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<QbStatus>({
    queryKey: ['qb-status'],
    queryFn: () => qbFetch<QbStatus>('/status'),
    refetchInterval: 30_000,
  });

  const { data: syncHistory, isLoading: historyLoading } = useQuery<SyncLog[]>({
    queryKey: ['qb-sync-history'],
    queryFn: () => qbFetch<SyncLog[]>('/sync/history?limit=20'),
    enabled: status?.connected,
  });

  const handleSync = async (type: SyncType) => {
    setIsSyncing(type);
    try {
      const result = await qbFetch<Record<string, number>>(`/sync/${type}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['qb-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      const msg =
        type === 'clients'
          ? `Synced: ${result.pulled} pulled, ${result.pushed} pushed`
          : type === 'payments'
          ? `Updated ${result.updated} payment(s)`
          : type === 'service-items'
          ? `Service items: ${result.pulled} pulled, ${result.synced} pushed, ${result.skipped} skipped`
          : `Expenses: ${result.created} created, ${result.skipped} skipped, ${result.errors} errors`;
      toast.success(msg);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QuickBooks Integration</h1>
        <p className="text-muted-foreground mt-1">
          Sync customers, generate invoices, and track payments via QuickBooks Online.
        </p>
      </div>

      <QbConnectionCard status={status} statusLoading={statusLoading} />

      {status?.connected && (
        <>
          <QbSyncActionsCard isSyncing={isSyncing} onSync={handleSync} />
          <QbSyncHistoryCard logs={syncHistory} isLoading={historyLoading} />
        </>
      )}
    </div>
  );
}
