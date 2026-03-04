'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Clock,
  Activity,
  Briefcase,
  DollarSign,
  Info,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { ScoringInfoDialog } from './ScoringInfoDialog';

interface ClientMetrics {
  daysSinceLastContact: number;
  totalActivityCount: number;
  recentActivityCount: number;
  totalProjectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  totalRevenue: number;
  recentRevenue: number;
  avgProjectValue: number;
  engagementScore: number;
}

interface ClientHealthFlag {
  type:
    | 'NO_CONTACT'
    | 'DECLINING_ENGAGEMENT'
    | 'HIGH_VALUE_AT_RISK'
    | 'STRONG_RELATIONSHIP';
  severity: 'low' | 'medium' | 'high' | 'positive';
  message: string;
  icon: string;
}

interface ClientMetricsPanelProps {
  metrics?: ClientMetrics;
  healthFlags?: ClientHealthFlag[];
  suggestedActions?: string[];
}

// ── helpers ────────────────────────────────────────────────────────────────
function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toLocaleString();
}

function getEngagementMeta(score: number): {
  label: string;
  hex: string;
  colors: string;
  dot: string;
} {
  if (score >= 70)
    return {
      label: 'Strong',
      hex: '#10b981',
      colors: 'bg-emerald-100/70 text-emerald-900',
      dot: 'bg-emerald-400',
    };
  if (score >= 40)
    return {
      label: 'Moderate',
      hex: '#f59e0b',
      colors: 'bg-amber-100/70 text-amber-900',
      dot: 'bg-amber-400',
    };
  return {
    label: 'At Risk',
    hex: '#ef4444',
    colors: 'bg-red-100/70 text-red-900',
    dot: 'bg-red-400',
  };
}

function getSeverityMeta(severity: string): {
  colors: string;
  dot: string;
  icon: React.ElementType;
} {
  switch (severity) {
    case 'positive':
      return {
        colors: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-900',
        dot: 'bg-emerald-400',
        icon: CheckCircle2,
      };
    case 'high':
      return {
        colors: 'bg-red-50/80 border-red-200/60 text-red-900',
        dot: 'bg-red-400',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        colors: 'bg-amber-50/80 border-amber-200/60 text-amber-900',
        dot: 'bg-amber-400',
        icon: AlertTriangle,
      };
    default:
      return {
        colors: 'bg-muted/50 border-border/40 text-muted-foreground',
        dot: 'bg-muted-foreground/30',
        icon: TrendingDown,
      };
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ── component ──────────────────────────────────────────────────────────────
export function ClientMetricsPanel({
  metrics,
  healthFlags = [],
  suggestedActions = [],
}: ClientMetricsPanelProps) {
  const [scoringInfoOpen, setScoringInfoOpen] = useState(false);

  if (!metrics) return null;

  const eng = getEngagementMeta(metrics.engagementScore);

  const keyMetrics = [
    {
      label: 'Last Contact',
      sublabel: 'Days ago',
      value: `${metrics.daysSinceLastContact}d`,
      icon: Clock,
      alert: metrics.daysSinceLastContact > 30,
    },
    {
      label: 'Activities (30d)',
      sublabel: `${metrics.totalActivityCount} total`,
      value: String(metrics.recentActivityCount),
      icon: Activity,
      alert: false,
    },
    {
      label: 'Active Projects',
      sublabel: `${metrics.totalProjectCount} total`,
      value: String(metrics.activeProjectCount),
      icon: Briefcase,
      alert: false,
    },
    {
      label: 'Recent Revenue',
      sublabel: 'Last 12 months',
      value: `$${fmtK(metrics.recentRevenue)}`,
      icon: DollarSign,
      alert: false,
    },
    {
      label: 'Completed',
      sublabel: 'Projects finished',
      value: String(metrics.completedProjectCount),
      icon: CheckCircle2,
      alert: false,
    },
    {
      label: 'Avg Project Value',
      sublabel: 'Per project',
      value: `$${fmtK(metrics.avgProjectValue)}`,
      icon: TrendingUp,
      alert: false,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Engagement Score ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Engagement Score</SectionLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setScoringInfoOpen(true)}>
            <Info className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4">
            {/* Score row */}
            <div className="flex items-end justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[40px] font-bold tabular-nums leading-none"
                  style={{ color: eng.hex }}>
                  {metrics.engagementScore}
                </span>
                <span className="text-sm text-muted-foreground font-medium mb-1">/100</span>
              </div>

              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${eng.colors}`}>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${eng.dot}`} />
                {eng.label}
              </span>
            </div>

            {/* Progress bar */}
            <Progress value={metrics.engagementScore} className="h-1.5 mb-2" />

            <p className="text-[11px] text-muted-foreground">
              Based on recent contact, activity level, and active projects
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Metrics ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Key Metrics</SectionLabel>

        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/60">
            {keyMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  className={`px-4 py-3.5 ${m.alert ? 'bg-amber-50/60' : 'bg-card'}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon
                      className={`h-3 w-3 shrink-0 ${
                        m.alert ? 'text-amber-500' : 'text-muted-foreground'
                      }`}
                    />
                    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium truncate">
                      {m.label}
                    </p>
                  </div>
                  <p
                    className={`text-[20px] font-bold tabular-nums leading-none mb-0.5 ${
                      m.alert ? 'text-amber-700' : 'text-foreground'
                    }`}>
                    {m.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.sublabel}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Health Flags ─────────────────────────────────────────────── */}
      {healthFlags.length > 0 && (
        <section>
          <SectionLabel>Health Indicators</SectionLabel>
          <div className="space-y-2">
            {healthFlags.map((flag, index) => {
              const meta = getSeverityMeta(flag.severity);
              const FlagIcon = meta.icon;
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 ${meta.colors}`}>
                  <FlagIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p className="text-xs leading-snug flex-1">{flag.message}</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${meta.colors} border`}>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${meta.dot}`} />
                    {flag.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Suggested Actions ────────────────────────────────────────── */}
      {suggestedActions.length > 0 && (
        <section>
          <SectionLabel>Suggested Actions</SectionLabel>
          <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] divide-y divide-border/40 overflow-hidden">
            {suggestedActions.map((action, index) => (
              <div key={index} className="flex items-start gap-3 px-4 py-3 group">
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground transition-colors" />
                <p className="text-xs text-muted-foreground leading-snug">{action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <ScoringInfoDialog
        open={scoringInfoOpen}
        onOpenChange={setScoringInfoOpen}
      />
    </div>
  );
}
