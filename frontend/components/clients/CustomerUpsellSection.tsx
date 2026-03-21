'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UpsellStrategy } from '@/lib/types';

interface Props {
  upsellData: UpsellStrategy | null;
  loadingUpsell: boolean;
  canGenerateUpsell: boolean;
  onGenerateUpsell: () => void;
}

export function CustomerUpsellSection({
  upsellData,
  loadingUpsell,
  canGenerateUpsell,
  onGenerateUpsell,
}: Props) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          Growth Opportunities
        </h3>
        {canGenerateUpsell && !upsellData && (
          <Button
            size="sm"
            onClick={onGenerateUpsell}
            disabled={loadingUpsell}
            className="h-7 text-xs">
            {loadingUpsell ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Analyzing…
              </>
            ) : (
              'Generate Strategy'
            )}
          </Button>
        )}
      </div>

      {upsellData ? (
        <div className="space-y-3">
          <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200/60">
            <p className="text-xs font-semibold text-emerald-800 mb-1.5">Strategy</p>
            <p className="text-sm text-emerald-900/80">{upsellData.approach}</p>
            {upsellData.timing && (
              <p className="text-xs text-emerald-700 mt-1.5 font-medium">
                Timing: {upsellData.timing}
              </p>
            )}
          </div>
          {upsellData.opportunities && upsellData.opportunities.length > 0 && (
            <div className="space-y-2">
              {upsellData.opportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/40 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h6 className="text-sm font-semibold">{opp.service}</h6>
                    {opp.priority && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                          opp.priority === 'High'
                            ? 'bg-emerald-100 text-emerald-800'
                            : opp.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                        {opp.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opp.rationale}</p>
                  {opp.estimatedValue && (
                    <p className="text-xs font-medium mt-2 text-emerald-700">
                      Est. Value: {opp.estimatedValue}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 border-dashed py-8 text-center">
          <Sparkles className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground/50">No growth strategy yet</p>
          <p className="text-xs text-muted-foreground/40 mt-0.5">
            Click &quot;Generate Strategy&quot; to discover opportunities
          </p>
        </div>
      )}
    </section>
  );
}
