'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, TrendingUp, Send, Trophy } from 'lucide-react';
import { formsApi } from '@/lib/api/forms-client';
import type { LeadForm } from '@/lib/types';

interface FormAnalyticsDialogProps {
  form: LeadForm | null;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function FormAnalyticsDialog({
  form,
  onOpenChange,
}: FormAnalyticsDialogProps) {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['form-analytics', form?.id],
    queryFn: () => formsApi.getAnalytics(form!.id),
    enabled: !!form,
    staleTime: 60 * 1000,
  });

  const maxCount = analytics
    ? Math.max(...analytics.dailySubmissions.map((d) => d.count), 1)
    : 1;

  const stats = analytics
    ? [
        {
          label: 'Total Submissions',
          sublabel: 'All time',
          value: String(analytics.totalSubmissions),
          icon: Send,
          highlight: true,
        },
        {
          label: 'Won Leads',
          sublabel: 'Converted from this form',
          value: String(analytics.wonLeads),
          icon: Trophy,
          highlight: false,
        },
        {
          label: 'Conversion Rate',
          sublabel: 'Submissions to won leads',
          value: `${analytics.conversionRate.toFixed(1)}%`,
          icon: TrendingUp,
          highlight: false,
        },
      ]
    : [];

  return (
    <Dialog open={!!form} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Form Analytics</DialogTitle>
          <DialogDescription>
            Performance data for &ldquo;{form?.name}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : analytics ? (
          <div className="space-y-6 mt-2">
            {/* Stats bar */}
            <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="grid grid-cols-3 gap-px bg-border/60">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="relative bg-card px-5 py-4">
                      {stat.highlight && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                      )}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/60 font-medium truncate">
                          {stat.label}
                        </p>
                      </div>
                      <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50">
                        {stat.sublabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily chart */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
                Submissions — Last 30 Days
              </p>
              {analytics.dailySubmissions.length === 0 ? (
                <div className="flex items-center justify-center h-24 rounded-lg border border-border/60 bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    No submissions in this period
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 min-w-max px-1 pb-2 h-28">
                    {analytics.dailySubmissions.map(({ date, count }) => (
                      <div
                        key={date}
                        className="flex flex-col items-center gap-1">
                        <div
                          className="w-5 bg-primary/25 hover:bg-primary/40 rounded-t transition-colors"
                          style={{
                            height: `${maxCount > 0 ? (count / maxCount) * 72 : 0}px`,
                            minHeight: count > 0 ? '4px' : '0px',
                          }}
                          title={`${count} on ${formatDate(date)}`}
                        />
                        <span
                          className="text-[9px] text-muted-foreground/50 leading-none"
                          style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                          }}>
                          {formatDate(date)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">
              No analytics data available
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
