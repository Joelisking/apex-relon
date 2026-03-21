'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Link2Off, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api/client';
import { qbFetch, QbStatus } from './qb-api';

interface Props {
  status?: QbStatus;
  statusLoading: boolean;
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '—';
}

export function QbConnectionCard({ status, statusLoading }: Props) {
  const queryClient = useQueryClient();

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

  return (
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disconnectMutation.isPending}
                  className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Link2Off className="h-4 w-4 mr-2" />
                  Disconnect QuickBooks
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will revoke the connection to <strong>{status.companyName}</strong>. Sync
                    will stop until you reconnect. Your sync history will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectMutation.mutate()}
                    className="bg-destructive text-white hover:bg-destructive/90">
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
  );
}
