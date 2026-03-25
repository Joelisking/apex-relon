'use client';

import {
  Calendar,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useDraggable } from '@dnd-kit/core';
import type { Project } from '@/lib/api/projects-client';

// Risk → vivid hex accent for top border (inline style avoids Tailwind purging)
const RISK_HEX: Record<string, string> = {
  'On Track': '#10b981',
  'At Risk': '#f59e0b',
  Blocked: '#ef4444',
};

const RISK_CHIP: Record<
  string,
  { classes: string; icon: React.ElementType }
> = {
  'On Track': {
    classes: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle,
  },
  'At Risk': {
    classes: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  Blocked: {
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: ShieldAlert,
  },
};

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function firstNameLastInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function ProjectCardContent({
  project,
  stageProbability,
}: {
  project: Project;
  stageProbability?: number;
}) {
  const riskKey = project.riskStatus || 'On Track';
  const risk = RISK_CHIP[riskKey] ?? RISK_CHIP['On Track'];
  const RiskIcon = risk.icon;
  const accentColor = RISK_HEX[riskKey] ?? RISK_HEX['On Track'];

  const contractedValue = project.contractedValue;
  const pipelineValue = stageProbability
    ? (contractedValue * stageProbability) / 100
    : null;

  const pmAssignment = project.assignments?.find((a) =>
    a.role.toLowerCase().includes('manager'),
  );
  const pmName = pmAssignment?.user.name ?? null;
  const pmInitials = pmName ? avatarInitials(pmName) : null;

  return (
    <div
      className="group bg-card rounded-xl overflow-hidden border border-border/60
        shadow-[0_1px_4px_rgba(0,0,0,0.06)]
        hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.13)]
        hover:-translate-y-px transition-all duration-200
        cursor-grab active:cursor-grabbing"
      style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}>
      <div className="px-3.5 py-3">
        {/* Name + Risk chip */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            {project.jobNumber && (
              <p className="text-[10px] font-mono font-bold tracking-wide text-primary mb-0.5">
                {project.jobNumber}
              </p>
            )}
            <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">
              {project.name}
            </h4>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border shrink-0 ${risk.classes}`}>
            <RiskIcon className="h-2.5 w-2.5" />
            {riskKey}
          </span>
        </div>

        {/* Contact */}
        {(project.lead?.contactName || project.client) && (
          <p className="text-xs text-muted-foreground truncate mb-1">
            {project.lead?.contactName ?? project.client?.name}
          </p>
        )}

        {/* Status note */}
        {project.statusNote && (
          <p className="text-[11px] text-muted-foreground italic line-clamp-2 mb-2.5 leading-snug">
            {project.statusNote}
          </p>
        )}

        {/* Financials */}
        <div className="flex items-center gap-3 mb-2.5 pt-2 border-t border-border/40">
          <div className="space-y-0.5">
            <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              Contracted
            </p>
            <p className="text-[13px] font-bold tabular-nums text-foreground">
              ${fmtValue(contractedValue)}
            </p>
          </div>
          {pipelineValue !== null &&
            stageProbability !== undefined &&
            stageProbability > 0 && (
              <div className="space-y-0.5 ml-auto text-right">
                <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                  Pipeline ({stageProbability}%)
                </p>
                <p className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                  ${fmtValue(pipelineValue)}
                </p>
              </div>
            )}
        </div>



        {/* Footer: due date + PM */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          {project.estimatedDueDate ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-2.5 w-2.5" />
              Due{' '}
              {format(new Date(project.estimatedDueDate), 'MMM d')}
            </span>
          ) : (
            <span />
          )}

          {pmInitials && (
            <div className="flex items-center gap-1.5">
              <div
                className="h-[18px] w-[18px] rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
                style={{ fontSize: '8px', letterSpacing: '0.03em' }}>
                {pmInitials}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {pmName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({
  project,
  onClick,
  stageProbability,
}: {
  project: Project;
  onClick?: () => void;
  stageProbability?: number;
}) {
  return (
    <div className="cursor-pointer" onClick={onClick}>
      <ProjectCardContent
        project={project}
        stageProbability={stageProbability}
      />
    </div>
  );
}

export function DraggableProjectCard({
  project,
  onClick,
  isDragging,
  stageProbability,
}: {
  project: Project;
  onClick?: () => void;
  isDragging: boolean;
  stageProbability?: number;
}) {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: project.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onClick?.()}>
      <ProjectCardContent
        project={project}
        stageProbability={stageProbability}
      />
    </div>
  );
}
