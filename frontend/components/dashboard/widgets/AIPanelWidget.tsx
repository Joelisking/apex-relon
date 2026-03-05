'use client';

import { useState } from 'react';
import { BrainCircuit, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import { dashboardApi, type ExecutiveSummaryResponse } from '@/lib/api/dashboard';
import { cn } from '@/lib/utils';

interface Props {
  widget: WidgetConfig;
  period?: 'week' | 'month' | 'quarter';
}

export function AIPanelWidget({ widget, period = 'month' }: Props) {
  const title = widget.config.title || 'AI Insights';
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<ExecutiveSummaryResponse | null>(null);
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
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <BrainCircuit className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {title}
          </p>
        </div>
        {summaryData && (
          <button
            onClick={generate}
            disabled={loading}
            title="Regenerate"
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40">
            {loading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <RefreshCw className="h-3 w-3" />
            }
          </button>
        )}
      </div>

      {error && (
        <p className="mx-5 mt-3 px-3 py-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg">
          Failed to generate. Please try again.
        </p>
      )}

      {!summaryData ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
            <BrainCircuit className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[12px] font-semibold text-foreground">AI Executive Brief</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-48">
              Generate a real-time summary of your business performance.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all',
              'bg-purple-600 text-white hover:bg-purple-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}>
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Generate Brief
              </>
            )}
          </button>
        </div>
      ) : (
        /* Summary content */
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {summaryData.summary.overview && (
            <p className="text-[12px] text-foreground leading-relaxed">
              {summaryData.summary.overview}
            </p>
          )}

          {summaryData.summary.whatNeedsAttention?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-600">
                Needs Attention
              </p>
              <ul className="space-y-2">
                {summaryData.summary.whatNeedsAttention.map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-[5px]" />
                    <span className="text-[11px] text-foreground leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summaryData.summary.keyInsights?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-purple-600">
                Key Insights
              </p>
              <ul className="space-y-2">
                {summaryData.summary.keyInsights.map((item, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-[5px]" />
                    <span className="text-[11px] text-foreground leading-relaxed">{item}</span>
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
