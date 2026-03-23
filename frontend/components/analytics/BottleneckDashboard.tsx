'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  RefreshCw,
  Clock,
  FolderOpen,
  Zap,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { API_URL, getTokenFromClientCookies } from '@/lib/api/client';

// ─── API ──────────────────────────────────────────────────────────────────────

async function analyticsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getTokenFromClientCookies() ?? '';
  const res = await fetch(`${API_URL}/analytics/bottleneck${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageDwell {
  stage: string;
  avgDays: number;
  medianDays: number;
  maxDays: number;
  count: number;
  isCritical: boolean;
}

interface TaskVelocity {
  userId: string;
  userName: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface OverdueResult {
  userId: string;
  userName: string;
  overdueCount: number;
  avgDaysOverdue: number;
  oldestTaskDays: number;
}

interface StuckProject {
  id: string;
  name: string;
  clientName: string;
  status: string;
  daysSinceUpdate: number;
}

interface AiReport {
  content: string;
  generatedAt: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ rate, size = 36 }: { rate: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (rate / 100) * circ;
  const color = rate >= 75 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444';
  const initials = '';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
        className="text-border" strokeWidth="2" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth="2" strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

function PersonInitials({ name, rate }: { name: string; rate: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const bg = rate >= 75 ? 'bg-emerald-100 text-emerald-800' : rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
  return (
    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0', bg)}>
      {initials}
    </div>
  );
}

function AnimatedBar({ pct, critical }: { pct: number; critical?: boolean }) {
  return (
    <div className="h-1.5 rounded-full bg-border/60 overflow-hidden flex-1">
      <div
        className={cn('h-full rounded-full bar-fill', critical ? 'bg-red-500' : 'bg-indigo-500')}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

function StalenessBar({ days }: { days: number }) {
  const pct = Math.min((days / 60) * 100, 100);
  const color = days > 30 ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="h-1 rounded-full bg-border/50 overflow-hidden w-16">
      <div className={cn('h-full rounded-full bar-fill', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Rich markdown renderer for the AI report
function RichMarkdown({ content }: { content: string }) {
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>,
    );
  };

  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      nodes.push(
        <div key={i} className="flex items-center gap-3 mt-7 mb-3 first:mt-0">
          <div className="w-1 h-5 rounded-full bg-indigo-500 shrink-0" />
          <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{line.slice(3)}</h2>
        </div>,
      );
    } else if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} className="text-[13px] font-semibold text-foreground mt-4 mb-1.5">{line.slice(4)}</h3>,
      );
    } else if (line.match(/^-\s/)) {
      nodes.push(
        <div key={i} className="flex gap-2.5 items-start py-0.5">
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0 mt-[7px]" />
          <p className="text-[13px] text-foreground/80 leading-relaxed">{renderInline(line.slice(2))}</p>
        </div>,
      );
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1];
      nodes.push(
        <div key={i} className="flex gap-3 items-start py-0.5">
          <span className="text-[11px] font-mono font-semibold text-indigo-500 shrink-0 mt-[3px] w-4">{num}.</span>
          <p className="text-[13px] text-foreground/80 leading-relaxed">{renderInline(line.replace(/^\d+\.\s/, ''))}</p>
        </div>,
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1.5" />);
    } else {
      nodes.push(
        <p key={i} className="text-[13px] text-foreground/80 leading-relaxed">{renderInline(line)}</p>,
      );
    }
  }

  return <div className="space-y-0.5">{nodes}</div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BottleneckDashboard() {
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: stageDwell = [], isLoading: dwellLoading } = useQuery<StageDwell[]>({
    queryKey: ['bottleneck-stage-dwell'],
    queryFn: () => analyticsFetch<StageDwell[]>('/stage-dwell'),
  });

  const { data: taskVelocity = [], isLoading: velocityLoading } = useQuery<TaskVelocity[]>({
    queryKey: ['bottleneck-task-velocity'],
    queryFn: () => analyticsFetch<TaskVelocity[]>('/task-velocity'),
  });

  const { data: overdue = [], isLoading: overdueLoading } = useQuery<OverdueResult[]>({
    queryKey: ['bottleneck-overdue'],
    queryFn: () => analyticsFetch<OverdueResult[]>('/overdue'),
  });

  const { data: stuckProjects = [], isLoading: stuckLoading } = useQuery<StuckProject[]>({
    queryKey: ['bottleneck-stuck'],
    queryFn: () => analyticsFetch<StuckProject[]>('/stuck-projects'),
  });

  const { data: aiReport, refetch: refetchReport } = useQuery<AiReport | null>({
    queryKey: ['bottleneck-ai-report'],
    queryFn: () => analyticsFetch<AiReport | null>('/ai-report/latest'),
  });

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await analyticsFetch('/ai-report', { method: 'POST' });
      await refetchReport();
      toast.success('AI bottleneck report generated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const isDataLoading = dwellLoading || velocityLoading || overdueLoading || stuckLoading;

  const criticalStages = stageDwell.filter((s) => s.isCritical);
  const totalOverdue = overdue.reduce((s, u) => s + u.overdueCount, 0);
  const avgCompletion =
    taskVelocity.length > 0
      ? Math.round(taskVelocity.reduce((s, u) => s + u.completionRate, 0) / taskVelocity.length)
      : 0;
  const maxDwellDays = Math.max(...stageDwell.map((s) => s.avgDays), 1);
  const isHealthy = criticalStages.length === 0 && totalOverdue === 0 && stuckProjects.length === 0;
  const totalIssues = criticalStages.length + stuckProjects.length + (totalOverdue > 0 ? 1 : 0);

  return (
    <>
      <style>{`
        @keyframes fillBar {
          from { width: 0% !important; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bar-fill { animation: fillBar 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-up  { animation: fadeUp 0.5s ease both; }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="fade-up flex items-start justify-between gap-4" style={{ animationDelay: '0ms' }}>
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              {isDataLoading ? (
                <span className="inline-flex h-2 w-2 rounded-full bg-muted-foreground/30 animate-pulse" />
              ) : (
                <span className={cn(
                  'inline-flex h-2 w-2 rounded-full',
                  isHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse',
                )} />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {isDataLoading
                  ? 'Loading…'
                  : isHealthy
                    ? 'All systems on track'
                    : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} detected`}
              </span>
            </div>
            <h1 className="text-4xl font-display tracking-tight text-foreground">
              Bottleneck Analysis
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Operational delay intelligence for Apex Consulting & Surveying.
            </p>
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all mt-1',
              'bg-foreground text-background hover:bg-foreground/90',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            )}>
            {generatingReport
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
              : <><Bot className="h-3.5 w-3.5" />Generate AI Report</>
            }
          </button>
        </div>

        {/* ── Critical Alert ──────────────────────────────────────────────────── */}
        {criticalStages.length > 0 && (
          <div className="fade-up flex items-start gap-3 bg-red-50 border border-red-200/80 rounded-2xl px-5 py-4"
            style={{ animationDelay: '60ms' }}>
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-800">
                {criticalStages.length} critical pipeline stage{criticalStages.length !== 1 ? 's' : ''} detected
              </p>
              <p className="text-[12px] text-red-700/80 mt-0.5">
                {criticalStages.map((s) => `${s.stage} (${s.avgDays}d avg)`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
        <div className="fade-up grid grid-cols-4 gap-px bg-border/40 rounded-2xl overflow-hidden border border-border/40"
          style={{ animationDelay: '80ms' }}>
          {[
            {
              label: 'Critical Stages',
              value: criticalStages.length,
              sub: criticalStages.length === 0 ? 'All stages healthy' : `${criticalStages.map(s => s.stage).slice(0, 2).join(', ')}`,
              color: criticalStages.length > 0 ? 'text-red-600' : 'text-emerald-600',
              icon: AlertTriangle,
            },
            {
              label: 'Overdue Tasks',
              value: totalOverdue,
              sub: totalOverdue === 0 ? 'No overdue tasks' : `Across ${overdue.length} team member${overdue.length !== 1 ? 's' : ''}`,
              color: totalOverdue > 0 ? 'text-amber-600' : 'text-emerald-600',
              icon: Clock,
            },
            {
              label: 'Stuck Projects',
              value: stuckProjects.length,
              sub: stuckProjects.length === 0 ? 'All projects active' : `${stuckProjects[0]?.name ?? ''}${stuckProjects.length > 1 ? ` +${stuckProjects.length - 1} more` : ''}`,
              color: stuckProjects.length > 0 ? 'text-orange-600' : 'text-emerald-600',
              icon: FolderOpen,
            },
            {
              label: 'Avg Completion',
              value: `${avgCompletion}%`,
              sub: `Across ${taskVelocity.length} team member${taskVelocity.length !== 1 ? 's' : ''}`,
              color: avgCompletion >= 75 ? 'text-emerald-600' : avgCompletion >= 50 ? 'text-amber-600' : 'text-red-600',
              icon: Zap,
            },
          ].map(({ label, value, sub, color, icon: Icon }) => (
            <div key={label} className="bg-card px-6 py-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Icon className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
              </div>
              <p className={cn('text-4xl font-mono font-bold leading-none mb-1.5', color)}>{value}</p>
              <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Stage Dwell + Task Velocity ─────────────────────────────────────── */}
        <div className="fade-up grid grid-cols-2 gap-6" style={{ animationDelay: '120ms' }}>

          {/* Stage Dwell */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">Stage Dwell Time</h2>
              <span className="ml-auto text-[10px] text-muted-foreground font-medium">avg days in stage</span>
            </div>
            <div className="px-6 py-5">
              {dwellLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : stageDwell.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-4">No stage history data yet.</p>
              ) : (
                <div className="space-y-4">
                  {stageDwell.slice(0, 8).map((s) => (
                    <div key={s.stage}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {s.isCritical && (
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          <span className="text-[12px] font-medium text-foreground">{s.stage}</span>
                          {s.isCritical && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">critical</span>
                          )}
                        </div>
                        <span className="text-[12px] font-mono font-semibold text-foreground/70">
                          {s.avgDays}d
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AnimatedBar pct={(s.avgDays / maxDwellDays) * 100} critical={s.isCritical} />
                        <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">
                          {s.count} lead{s.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Task Velocity */}
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">Task Velocity</h2>
              <span className="ml-auto text-[10px] text-muted-foreground font-medium">last 30 days</span>
            </div>
            <div className="divide-y divide-border/40">
              {velocityLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground px-6 py-5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : taskVelocity.length === 0 ? (
                <p className="text-[12px] text-muted-foreground px-6 py-5">No task data yet.</p>
              ) : (
                taskVelocity.slice(0, 7).map((u) => (
                  <div key={u.userId} className="px-6 py-3 flex items-center gap-3">
                    <div className="relative shrink-0">
                      <PersonInitials name={u.userName} rate={u.completionRate} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-foreground truncate">{u.userName}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {u.overdue > 0 && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                              {u.overdue} overdue
                            </span>
                          )}
                          <span className={cn(
                            'text-[12px] font-mono font-bold',
                            u.completionRate >= 75 ? 'text-emerald-600' : u.completionRate >= 50 ? 'text-amber-600' : 'text-red-600',
                          )}>
                            {u.completionRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AnimatedBar pct={u.completionRate} critical={u.completionRate < 50} />
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {u.completed}/{u.assigned}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Overdue Breakdown ──────────────────────────────────────────────── */}
        {overdue.length > 0 && (
          <div className="fade-up rounded-2xl border border-amber-200/60 bg-amber-50/40 overflow-hidden"
            style={{ animationDelay: '160ms' }}>
            <div className="px-6 py-4 border-b border-amber-200/60 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <h2 className="text-[13px] font-semibold text-foreground">Overdue Task Breakdown</h2>
              <span className="ml-auto text-[10px] text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                {totalOverdue} total overdue
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-amber-200/40">
              {overdue.map((u) => (
                <div key={u.userId} className="bg-card/80 px-6 py-4 flex items-center gap-3">
                  <PersonInitials name={u.userName} rate={0} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">{u.userName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      avg <span className="font-mono font-semibold text-amber-700">{u.avgDaysOverdue}d</span> late ·
                      oldest <span className="font-mono font-semibold text-red-700">{u.oldestTaskDays}d</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-mono font-bold text-amber-700">{u.overdueCount}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">tasks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stuck Projects ─────────────────────────────────────────────────── */}
        {stuckProjects.length > 0 && (
          <div className="fade-up rounded-2xl border border-border/40 bg-card overflow-hidden"
            style={{ animationDelay: '200ms' }}>
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-[13px] font-semibold text-foreground">Stuck Projects</h2>
              <span className="ml-auto text-[10px] text-muted-foreground">no activity for 14+ days</span>
            </div>
            <div className="divide-y divide-border/40">
              {stuckProjects.slice(0, 8).map((p) => (
                <div key={p.id} className="px-6 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.clientName}</p>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                    {p.status}
                  </span>
                  <div className="flex flex-col items-end gap-1 shrink-0 w-20">
                    <span className={cn(
                      'text-[13px] font-mono font-bold',
                      p.daysSinceUpdate > 30 ? 'text-red-600' : 'text-amber-600',
                    )}>
                      {p.daysSinceUpdate}d
                    </span>
                    <StalenessBar days={p.daysSinceUpdate} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Report ──────────────────────────────────────────────────────── */}
        <div className="fade-up rounded-2xl border border-border/40 bg-card overflow-hidden"
          style={{ animationDelay: '240ms' }}>
          <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-[13px] font-semibold text-foreground">AI Bottleneck Analysis</h2>
              {aiReport && (
                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(aiReport.generatedAt).toLocaleString()}
                </p>
              )}
            </div>
            {aiReport && (
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                title="Regenerate report"
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40">
                {generatingReport
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5" />
                }
              </button>
            )}
          </div>

          <div className="px-6 py-6">
            {aiReport ? (
              <RichMarkdown content={aiReport.content} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-5">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-indigo-500" />
                </div>
                <div className="text-center space-y-1 max-w-xs">
                  <p className="text-[14px] font-semibold text-foreground">No report yet</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Generate an AI-powered executive briefing that identifies bottlenecks by name and recommends specific actions.
                  </p>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all',
                    'bg-indigo-600 text-white hover:bg-indigo-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}>
                  {generatingReport
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
                    : <><Bot className="h-3.5 w-3.5" />Generate Report</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Healthy State ───────────────────────────────────────────────────── */}
        {isHealthy && stageDwell.length === 0 && taskVelocity.length === 0 && (
          <div className="fade-up flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/30"
            style={{ animationDelay: '160ms' }}>
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="text-center">
              <p className="text-[15px] font-semibold text-foreground">No bottlenecks detected</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">All pipeline stages and projects are on track.</p>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
