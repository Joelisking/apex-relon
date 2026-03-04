'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { Lead } from '@/lib/types';

interface StageTimelineProps {
  lead: Lead;
}

export function StageTimeline({ lead }: StageTimelineProps) {
  const timeline = lead.metrics?.stageTimeline;

  if (!timeline || timeline.length === 0) {
    return null;
  }

  const totalDays = lead.metrics?.daysInPipeline ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Stage Timeline
        </h3>
        <span className="text-xs text-muted-foreground">
          {totalDays} day{totalDays !== 1 ? 's' : ''} in pipeline
        </span>
      </div>

      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />

        <div className="space-y-0">
          {timeline.map((entry, index) => {
            const isCurrent = index === timeline.length - 1;
            const enteredDate = new Date(entry.enteredAt).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric' },
            );

            return (
              <div key={index} className="relative flex items-start gap-3 pb-3 last:pb-0">
                {/* Node */}
                <div className="absolute -left-5 mt-0.5">
                  {isCurrent ? (
                    <Circle className="h-[18px] w-[18px] text-primary fill-primary/20 stroke-[2.5]" />
                  ) : (
                    <CheckCircle2 className="h-[18px] w-[18px] text-green-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex items-baseline justify-between w-full min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {entry.stage}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {enteredDate}
                    </span>
                  </div>
                  <span
                    className={`text-xs tabular-nums shrink-0 ml-2 ${
                      isCurrent
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {entry.daysSpent}d
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
