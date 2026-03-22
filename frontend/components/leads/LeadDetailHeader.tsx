'use client';

import { Pencil, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Lead } from '@/lib/types';
import type { PipelineStage } from '@/lib/api/pipeline-client';

const RISK_CHIP: Record<string, string> = {
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

interface Props {
  lead: Lead;
  companyOrName: string;
  accentColor: string;
  probability: number;
  timingBadge: React.ReactNode;
  stale: boolean;
  daysInPipeline: number;
  daysSinceContact: number;
  activityCount: number;
  fileCount: number;
  canEdit: boolean;
  canDelete: boolean;
  stages: PipelineStage[];
  isUpdatingStage: boolean;
  onStageChange: (stage: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function LeadDetailHeader({
  lead,
  companyOrName,
  accentColor,
  probability,
  timingBadge,
  stale,
  daysInPipeline,
  daysSinceContact,
  activityCount,
  fileCount,
  canEdit,
  canDelete,
  stages,
  isUpdatingStage,
  onStageChange,
  onEdit,
  onDelete,
}: Props) {
  const isClosedFinal = lead.stage === 'Closed Won' || lead.stage === 'Closed Lost';
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden mb-6">
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />

      {/* Identity + Actions */}
      <div className="relative px-6 py-5 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at top left, ${accentColor}10, transparent 60%)`,
          }}
        />
        <div className="relative flex items-start gap-4">
          <div
            className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center font-bold text-[15px] text-white"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 0 3px ${accentColor}25`,
            }}>
            {avatarInitials(companyOrName)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] font-semibold leading-tight text-foreground">
              {lead.contactName || lead.name}
            </h1>
            {lead.company && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{lead.company}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {canEdit && stages.length > 0 && !isClosedFinal ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isUpdatingStage}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 bg-secondary border border-border/60 hover:bg-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {isUpdatingStage ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      {lead.stage}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onSelect={() => onStageChange(s.name)}
                        className={s.name === lead.stage ? 'font-semibold' : ''}>
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1 bg-secondary border border-border/60">
                  {lead.stage}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground tabular-nums">{probability}%</span>
              {timingBadge}
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1"
                style={{ color: accentColor, backgroundColor: `${accentColor}15` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                {lead.urgency} Urgency
              </span>
              {lead.aiRiskLevel && (
                <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${RISK_CHIP[lead.aiRiskLevel] ?? RISK_CHIP.Low}`}>
                  AI Risk: {lead.aiRiskLevel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 text-xs h-8">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="border-t border-border/40 bg-muted/20 grid grid-cols-6 divide-x divide-border/40">
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Expected</p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">${fmtVal(lead.expectedValue || 0)}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Contracted</p>
          <p className="text-[20px] font-mono font-bold tabular-nums leading-none text-emerald-700">
            {lead.contractedValue != null ? `$${fmtVal(lead.contractedValue)}` : '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">In Pipeline</p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
            {daysInPipeline}<span className="text-sm font-medium text-muted-foreground ml-0.5">d</span>
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Last Contact</p>
          <p className={`text-[20px] font-mono font-bold tabular-nums leading-none ${stale ? 'text-amber-600' : 'text-foreground'}`}>
            {daysSinceContact}<span className="text-sm font-medium text-muted-foreground ml-0.5">d</span>
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Activities</p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">{activityCount}</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">Files</p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">{fileCount}</p>
        </div>
      </div>
    </div>
  );
}
