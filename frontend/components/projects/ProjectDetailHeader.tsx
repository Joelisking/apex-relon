'use client';

import Link from 'next/link';
import { Pencil, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/lib/api/projects-client';
import type { PipelineStage } from '@/lib/api/pipeline-client';

const STATUS_CHIP: Record<string, string> = {
  Planning: 'text-blue-700 bg-blue-50 border-blue-200',
  Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'On Hold': 'text-amber-700 bg-amber-50 border-amber-200',
  Completed: 'text-gray-600 bg-gray-100 border-gray-200',
  Cancelled: 'text-red-700 bg-red-50 border-red-200',
};

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

interface Props {
  project: Project;
  accentColor: string;
  riskKey: string;
  riskClasses: string;
  RiskIcon: React.ElementType;
  contractedValue: number;
  rawEndOfProjectValue: number | null;
  margin: number;
  cost: number;
  profit: number;
  daysInStatus: number;
  canEdit: boolean;
  canMoveStage: boolean;
  stages: PipelineStage[];
  isUpdatingStatus: boolean;
  onStatusChange: (status: string) => void;
  onEdit: () => void;
}

export function ProjectDetailHeader({
  project,
  accentColor,
  riskKey,
  riskClasses,
  RiskIcon,
  contractedValue,
  rawEndOfProjectValue,
  margin,
  cost,
  profit,
  daysInStatus,
  canEdit,
  canMoveStage,
  stages,
  isUpdatingStatus,
  onStatusChange,
  onEdit,
}: Props) {
  const projectInitials = avatarInitials(project.name);

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
            className="h-12 w-12 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-[15px]"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 0 3px ${accentColor}25`,
            }}>
            {projectInitials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h1 className="text-[18px] font-semibold leading-tight text-foreground">
                {project.name}
              </h1>
              {project.jobNumber && (
                <span className="text-[13px] font-mono font-bold tracking-wide text-primary bg-primary/8 border border-primary/25 rounded px-2 py-0.5 leading-none shrink-0">
                  {project.jobNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {project.client && (
                <Link
                  href={`/clients/${project.clientId}`}
                  className="text-[13px] text-muted-foreground hover:text-primary transition-colors">
                  {project.client.name}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {canMoveStage && stages.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      disabled={isUpdatingStatus}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border hover:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed ${STATUS_CHIP[project.status] ?? 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                      {isUpdatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {project.status}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[160px]">
                    {stages.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onSelect={() => onStatusChange(s.name)}
                        className={s.name === project.status ? 'font-semibold' : ''}>
                        {s.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span
                  className={`inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1 border ${STATUS_CHIP[project.status] ?? 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                  {project.status}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 border ${riskClasses}`}>
                <RiskIcon className="h-2.5 w-2.5" /> {riskKey}
              </span>
              {project.isIndot && (
                <span className="inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1 border text-indigo-700 bg-indigo-50 border-indigo-200">
                  INDOT
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
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="border-t border-border/40 bg-muted/20 grid grid-cols-6 divide-x divide-border/40">
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            Contracted
          </p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
            ${fmtVal(contractedValue)}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            EOP Value
          </p>
          <p className="text-[20px] font-mono font-bold tabular-nums leading-none text-blue-600">
            {rawEndOfProjectValue != null ? `$${fmtVal(rawEndOfProjectValue)}` : '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            Margin
          </p>
          <p
            className={`text-[20px] font-mono font-bold tabular-nums leading-none ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {margin.toFixed(1)}
            <span className="text-sm font-medium text-muted-foreground ml-0.5">%</span>
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            Total Cost
          </p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
            {cost > 0 ? `$${fmtVal(cost)}` : '—'}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            Profit
          </p>
          <p
            className={`text-[20px] font-mono font-bold tabular-nums leading-none ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}${fmtVal(Math.abs(profit))}
          </p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium mb-1.5">
            In Status
          </p>
          <p className="text-[20px] font-mono font-bold tabular-nums text-foreground leading-none">
            {daysInStatus}
            <span className="text-sm font-medium text-muted-foreground ml-0.5">d</span>
          </p>
        </div>
      </div>
    </div>
  );
}
