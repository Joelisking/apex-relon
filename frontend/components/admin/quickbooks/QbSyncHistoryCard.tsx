'use client';

import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SyncLog } from './qb-api';

interface Props {
  logs?: SyncLog[];
  isLoading: boolean;
}

function formatDate(d?: string) {
  return d ? new Date(d).toLocaleString() : '—';
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'success')
    return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
  if (status === 'error') return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function directionLabel(d: string) {
  return d === 'QB_TO_CRM' ? 'QB → CRM' : 'CRM → QB';
}

export function QbSyncHistoryCard({ logs, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Sync History
        </CardTitle>
        <CardDescription>Last 20 sync events</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading history…</p>
        ) : !logs?.length ? (
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
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono">
                    {directionLabel(log.direction)}
                  </TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="text-xs font-mono">{log.externalId ?? '—'}</TableCell>
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
  );
}
