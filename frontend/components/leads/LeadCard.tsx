import { Clock, AlertTriangle, Activity } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '@/lib/types';

// Urgency → vivid accent hex (inline style avoids Tailwind purging dynamic classes)
const URGENCY_HEX: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};
function urgencyColor(urgency?: string | null): string {
  if (!urgency) return URGENCY_HEX.Low;
  return (
    URGENCY_HEX[urgency] ??
    URGENCY_HEX[urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase()] ??
    URGENCY_HEX.Low
  );
}

const RISK_CHIP: Record<string, string> = {
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function getEngagement(
  activityCount: number,
  daysSinceContact: number,
) {
  const actScore = Math.min(activityCount * 10, 50);
  const recScore =
    daysSinceContact <= 3
      ? 50
      : daysSinceContact <= 7
        ? 40
        : daysSinceContact <= 14
          ? 25
          : daysSinceContact <= 30
            ? 10
            : 0;
  const total = actScore + recScore;
  if (total >= 60) return { label: 'High', color: '#10b981' };
  if (total >= 30) return { label: 'Med', color: '#f59e0b' };
  return { label: 'Low', color: '#ef4444' };
}

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

export function LeadCardContent({ lead }: { lead: Lead }) {
  const isOverdue =
    lead.likelyStartDate &&
    lead.stage !== 'Won' &&
    lead.stage !== 'Lost' &&
    new Date(lead.likelyStartDate) < new Date();

  const accentColor = urgencyColor(lead.urgency);
  const daysSinceContact = lead.metrics?.daysSinceLastContact ?? 0;
  const activityCount = lead.metrics?.activityCount ?? 0;
  const stale = daysSinceContact > 14;

  const timeline = lead.metrics?.stageTimeline;
  const daysInStage =
    timeline && timeline.length > 0
      ? timeline[timeline.length - 1].daysSpent
      : 0;

  const engagement = getEngagement(activityCount, daysSinceContact);

  const dueDate = lead.likelyStartDate
    ? new Date(lead.likelyStartDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const ownerName = lead.assignedTo?.name || 'Unassigned';
  const ownerInitials = avatarInitials(ownerName);

  return (
    <div
      className="group bg-card rounded-xl overflow-hidden border border-border/60
        shadow-[0_1px_4px_rgba(0,0,0,0.06)]
        hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.13)]
        hover:-translate-y-px transition-all duration-200
        cursor-grab active:cursor-grabbing"
      style={{ borderTopColor: accentColor, borderTopWidth: '2px' }}>
      <div className="px-3.5 py-3">
        {/* Name + Value */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug truncate text-foreground">
              {lead.projectName}
            </p>
            <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
              {lead.contactName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[13px] font-bold tabular-nums text-foreground">
              ${fmtValue(lead.expectedValue || 0)}
            </p>
            <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
              expected
            </p>
          </div>
        </div>

        {/* Status chips */}
        {(dueDate || lead.aiRiskLevel) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
            {dueDate && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border ${
                  isOverdue
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-muted-foreground/70 bg-muted/40 border-border/50'
                }`}>
                {isOverdue && (
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                )}
                {isOverdue
                  ? 'Past Likely Start:'
                  : `Likely Start: ${dueDate}`}
              </span>
            )}
            {lead.aiRiskLevel && (
              <span
                className={`inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  RISK_CHIP[lead.aiRiskLevel] ?? RISK_CHIP.Low
                }`}>
                {lead.aiRiskLevel} risk
              </span>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="flex items-center text-[11px] text-muted-foreground/70 mb-2.5 flex-wrap gap-y-0.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0 mr-1"
            style={{ backgroundColor: engagement.color }}
          />
          <span>{engagement.label} eng.</span>
          <span className="mx-1.5 opacity-40">·</span>
          <Clock className="h-2.5 w-2.5 mr-0.5 shrink-0" />
          <span>{daysInStage}d stage</span>
          <span className="mx-1.5 opacity-40">·</span>
          <Activity
            className={`h-2.5 w-2.5 mr-0.5 shrink-0 ${stale ? 'text-amber-500' : ''}`}
          />
          <span
            className={stale ? 'text-amber-600 font-semibold' : ''}>
            {daysSinceContact}d ago
          </span>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
          <div
            className="h-[18px] w-[18px] rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
            style={{ fontSize: '8px', letterSpacing: '0.03em' }}>
            {ownerInitials}
          </div>
          <span className="text-[11px] text-muted-foreground truncate">
            {ownerName}
          </span>
        </div>
      </div>
    </div>
  );
}

// Draggable Lead Card Component
export function DraggableLeadCard({
  lead,
  onSelect,
  isDragging,
}: {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({
      id: lead.id,
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
      onClick={() => !isDragging && onSelect(lead)}>
      <LeadCardContent lead={lead} />
    </div>
  );
}
