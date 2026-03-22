'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import type { Project } from '@/lib/api/projects-client';

interface ProjectStageTimelineProps {
  project: Project;
}

export function ProjectStageTimeline({
  project,
}: ProjectStageTimelineProps) {
  const history = project.statusHistory;

  if (!history || history.length === 0) {
    return null;
  }

  // Compute days spent in each status
  interface TimelineEntry {
    status: string;
    enteredAt: string;
    daysSpent: number;
    changedBy: string;
  }

  const timeline: TimelineEntry[] = history.map((entry, index) => {
    const nextEntry = history[index + 1];
    const enteredAt = entry.createdAt;
    const exitedAt = nextEntry
      ? new Date(nextEntry.createdAt)
      : new Date();
    const daysSpent = Math.max(
      0,
      differenceInDays(exitedAt, new Date(enteredAt)),
    );
    return {
      status: entry.toStatus,
      enteredAt,
      daysSpent,
      changedBy: entry.user?.name ?? '',
    };
  });

  const totalDays = project.createdAt
    ? differenceInDays(new Date(), new Date(project.createdAt))
    : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-xs uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Status Timeline
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {totalDays}d total
        </span>
      </div>

      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-2.25 top-1 bottom-1 w-px bg-border/60" />

        <div className="space-y-0">
          {timeline.map((entry, index) => {
            const isCurrent = index === timeline.length - 1;
            const enteredDate = new Date(
              entry.enteredAt,
            ).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={index}
                className="relative flex items-start gap-3 pb-3 last:pb-0">
                {/* Node */}
                <div className="absolute -left-5 mt-0.5">
                  {isCurrent ? (
                    <Circle className="h-4.5 w-4.5 text-primary fill-primary/20 stroke-[2.5]" />
                  ) : (
                    <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex items-baseline justify-between w-full min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span
                      className={`text-sm font-medium leading-snug ${
                        isCurrent
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}>
                      {entry.status}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {enteredDate}
                    </span>
                  </div>
                  <span
                    className={`text-xs tabular-nums shrink-0 ml-2 ${
                      isCurrent
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground'
                    }`}>
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
