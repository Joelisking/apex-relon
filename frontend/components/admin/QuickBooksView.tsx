'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Link2,
  Link2Off,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Users,
  FileText,
  CreditCard,
  Receipt,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

async function qbFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/quickbooks${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

interface QbStatus {
  connected: boolean;
  companyName?: string;
  lastSyncAt?: string;
  realmId?: string;
}

interface SyncLog {
  id: string;
  direction: string;
  entityType: string;
  externalId?: string;
  internalId?: string;
  status: string;
  errorMessage?: string;
  syncedAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  const disconnectMutation = useMutation({
    mutationFn: () => qbFetch('/disconnect', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      toast.success('QuickBooks disconnected');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleConnect = () => {
    window.location.href = `${API_URL}/quickbooks/connect`;
  };

  const handleSync = async (type: 'clients' | 'payments' | 'expenses') => {
    setIsSyncing(type);
    try {
      const result = await qbFetch<any>(`/sync/${type}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['qb-sync-history'] });
      queryClient.invalidateQueries({ queryKey: ['qb-status'] });
      const msg =
        type === 'clients'
          ? `Synced: ${result.pulled} pulled, ${result.pushed} pushed`
          : type === 'payments'
          ? `Updated ${result.updated} payment(s)`
          : `Expenses: ${result.created} created, ${result.skipped} skipped, ${result.errors} errors`;
      toast.success(msg);
    } catch (e: any) {
      toast.error(e.message ?? 'Sync failed');
    } finally {
      setIsSyncing(null);
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleString() : '—';

  const statusBadge = (s: string) => {
    if (s === 'success') return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
    if (s === 'error') return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  const directionLabel = (d: string) =>
    d === 'QB_TO_CRM' ? '← QB → CRM' : '→ CRM → QB';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QuickBooks Integration</h1>
        <p className="text-muted-foreground mt-1">
          Sync clients, generate invoices, and track payments via QuickBooks Online.
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {status?.connected ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Checking connection…</p>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">{status.companyName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Realm ID</p>
                  <p className="font-mono text-xs">{status.realmId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Synced</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(status.lastSyncAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Link2Off className="h-4 w-4 mr-2" />
                Disconnect QuickBooks
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your QuickBooks Online account to enable bidirectional sync.
              </p>
              <Button onClick={handleConnect}>
                <Link2 className="h-4 w-4 mr-2" />
                Connect QuickBooks Online
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {status?.connected && (
        <>
          {/* Sync Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Manual Sync
              </CardTitle>
              <CardDescription>
                Trigger a sync between Apex CRM and QuickBooks Online.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync('clients')}
                  disabled={isSyncing !== null}>
                  {isSyncing === 'clients' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Sync Clients
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync('payments')}
                  disabled={isSyncing !== null}>
                  {isSyncing === 'payments' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Sync Payments
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync('expenses')}
                  disabled={isSyncing !== null}>
                  {isSyncing === 'expenses' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Receipt className="h-4 w-4 mr-2" />
                  )}
                  Sync Expenses
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sync History
              </CardTitle>
              <CardDescription>Last 20 sync events</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {historyLoading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading history…</p>
              ) : !syncHistory?.length ? (
                <p className="p-4 text-sm text-muted-foreground">No sync events yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Direction</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>QB ID</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncHistory.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono">
                          {directionLabel(log.direction)}
                        </TableCell>
                        <TableCell>{log.entityType}</TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.externalId ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(log.syncedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  );
}
