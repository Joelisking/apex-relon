'use client';

import { RefreshCw, Users, CreditCard, Receipt, Package, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type SyncType = 'clients' | 'payments' | 'expenses' | 'service-items';

interface Props {
  isSyncing: string | null;
  onSync: (type: SyncType) => void;
}

const SYNC_BUTTONS: { type: SyncType; label: string; Icon: React.ElementType }[] = [
  { type: 'clients', label: 'Sync Customers', Icon: Users },
  { type: 'payments', label: 'Sync Payments', Icon: CreditCard },
  { type: 'expenses', label: 'Sync Expenses', Icon: Receipt },
  { type: 'service-items', label: 'Sync Service Items', Icon: Package },
];

export function QbSyncActionsCard({ isSyncing, onSync }: Props) {
  return (
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
          {SYNC_BUTTONS.map(({ type, label, Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => onSync(type)}
              disabled={isSyncing !== null}>
              {isSyncing === type ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 mr-2" />
              )}
              {label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
