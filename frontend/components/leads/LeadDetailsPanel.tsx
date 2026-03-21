'use client';

import { User } from 'lucide-react';
import { StageTimeline } from './StageTimeline';
import type { Lead } from '@/lib/types';

interface Props {
  lead: Lead;
  isOverdue: boolean;
}

export function LeadDetailsPanel({ lead, isOverdue }: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Details</p>
        <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
          {lead.projectName && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Project</span>
              <span className="text-[12px] font-medium text-right">{lead.projectName}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground">Source</span>
            <span className="text-[12px] font-medium">{lead.source}</span>
          </div>
          {lead.serviceType && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Service</span>
              <span className="text-[12px] font-medium">{lead.serviceType.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground">Owner</span>
            <span className="text-[12px] font-medium flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground/50" />
              {lead.assignedTo?.name || 'Unassigned'}
            </span>
          </div>
          {lead.teamMembers && lead.teamMembers.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Team</span>
              <span className="text-[12px] font-medium text-right">
                {lead.teamMembers.map((tm) => tm.user.name).join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">Timeline</p>
        <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
          {lead.createdAt && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Created</span>
              <span className="text-[12px] font-mono tabular-nums">
                {new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          {lead.likelyStartDate && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Likely Start</span>
              <span className={`text-[12px] font-mono tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                {new Date(lead.likelyStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          {lead.dealClosedAt && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[11px] text-muted-foreground">Closed</span>
              <span className="text-[12px] font-mono tabular-nums">
                {new Date(lead.dealClosedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {lead.notes && (
          <div className="rounded-xl border border-border/40 p-4 mt-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold mb-2">Notes</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        <StageTimeline lead={lead} />
      </div>
    </div>
  );
}
