'use client';

import { Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types';

interface Props {
  client: Client;
  loadingHealth: boolean;
  loadingAutoUpdate: boolean;
  canGenerateHealth: boolean;
  onAutoUpdateStatus: () => void;
  onGenerateHealth: () => void;
}

export function CustomerHealthSection({
  client,
  loadingHealth,
  loadingAutoUpdate,
  canGenerateHealth,
  onAutoUpdateStatus,
  onGenerateHealth,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
          <Heart className="h-3 w-3" />
          Health Analysis
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAutoUpdateStatus}
            disabled={loadingAutoUpdate}
            className="h-7 text-xs">
            {loadingAutoUpdate ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Updating…
              </>
            ) : (
              'Auto-Update Status'
            )}
          </Button>
          {canGenerateHealth && (!client.aiHealthSummary || !client.healthScore) && (
            <Button
              size="sm"
              onClick={onGenerateHealth}
              disabled={loadingHealth}
              className="h-7 text-xs">
              {loadingHealth ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Analyzing…
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          )}
        </div>
      </div>

      {client.aiHealthSummary ? (
        <div className="p-4 bg-muted/40 rounded-lg border border-border/40">
          <p className="text-sm leading-relaxed text-muted-foreground">{client.aiHealthSummary}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 border-dashed py-8 text-center">
          <Heart className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/50">No health analysis yet</p>
          <p className="text-xs text-muted-foreground/40 mt-0.5">
            Click &quot;Generate Report&quot; to analyze this client
          </p>
        </div>
      )}
    </section>
  );
}
