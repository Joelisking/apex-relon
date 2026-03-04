'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, RefreshCw } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import {
  dashboardApi,
  type ExecutiveSummaryResponse,
} from '@/lib/api/dashboard';

interface Props {
  widget: WidgetConfig;
  period?: 'week' | 'month' | 'quarter';
}

export function AIPanelWidget({ widget, period = 'month' }: Props) {
  const title = widget.config.title || 'AI Panel';
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] =
    useState<ExecutiveSummaryResponse | null>(null);
  const [error, setError] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await dashboardApi.getExecutiveSummary(period);
      setSummaryData(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-border/40 shrink-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
          {title}
        </p>
        {summaryData && (
          <button
            onClick={generate}
            disabled={loading}
            title="Regenerate"
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="px-5 pt-3 text-xs text-destructive">
          Failed to generate summary. Please try again.
        </p>
      )}

      {!summaryData ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          <div className="bg-linear-to-br from-primary/5 to-primary/8 rounded-xl p-5 flex flex-col items-center gap-3 w-full max-w-60">
            <BrainCircuit className="h-9 w-9 text-primary/30" />
            <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
              Generate an AI-powered executive summary of your business performance.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={generate}
              disabled={loading}
              className="text-xs w-full">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Summary'
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* Summary content */
        <div className="flex-1 overflow-auto px-5 py-3 space-y-3">
          {summaryData.summary.overview && (
            <div className="bg-muted/30 rounded-lg px-3 py-2.5">
              <p className="text-[12px] text-foreground/80 leading-relaxed">
                {summaryData.summary.overview}
              </p>
            </div>
          )}

          {summaryData.summary.whatNeedsAttention?.length > 0 && (
            <div>
              <div className="border-t border-border/40 pt-2 mt-1 mb-2">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium">
                  Needs Attention
                </p>
              </div>
              <ul className="space-y-1.5">
                {summaryData.summary.whatNeedsAttention.map((item, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-foreground/70 flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.25" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summaryData.summary.keyInsights?.length > 0 && (
            <div>
              <div className="border-t border-border/40 pt-2 mt-1 mb-2">
                <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium">
                  Key Insights
                </p>
              </div>
              <ul className="space-y-1.5">
                {summaryData.summary.keyInsights.map((item, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-foreground/70 flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.25" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
