"use client";

import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api/tasks-client";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ListTodo,
} from "lucide-react";
import type { WidgetConfig } from "@/lib/types/dashboard-layout";
import type { Task, TaskSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  widget: WidgetConfig;
}

// Priority: left-border color on each task row
const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-amber-400",
  LOW: "border-l-border",
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-muted-foreground/30",
};

export function TaskListWidget({ widget }: Props) {
  const title = widget.config.title || "My Tasks";

  const { data: summary } = useQuery({
    queryKey: ["tasks-summary"],
    queryFn: () => tasksApi.getSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: urgentTasks = [], isLoading } = useQuery({
    queryKey: ["tasks-open"],
    queryFn: () => tasksApi.getAll({ status: "OPEN" }),
    staleTime: 2 * 60 * 1000,
  });

  const displayTasks = urgentTasks as Task[];
  const typedSummary = summary as TaskSummary | undefined;

  const statsBar = [
    {
      label: "Overdue",
      value: typedSummary?.overdue ?? 0,
      valueClass: "text-red-600",
    },
    {
      label: "Due Today",
      value: typedSummary?.dueToday ?? 0,
      valueClass: "text-amber-600",
    },
    {
      label: "Upcoming",
      value: typedSummary?.upcoming ?? 0,
      valueClass: "text-foreground",
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <ListTodo className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {title}
          </span>
        </div>
        <a
          href="/tasks"
          className="text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          View all <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>

      {/* Stats bar — gap-px separator pattern from ClientStatsCards */}
      <div className="grid grid-cols-3 gap-px bg-border/50 shrink-0">
        {statsBar.map((stat) => (
          <div key={stat.label} className="px-4 py-3 bg-card">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium mb-2">
              {stat.label}
            </p>
            <p
              className={cn(
                "text-[22px] font-bold tabular-nums leading-none mb-0.5",
                stat.valueClass,
              )}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex-1 divide-y divide-border/40">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="px-5 py-3 flex gap-3 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-muted/60 mt-1.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-muted/50 rounded w-3/4" />
                <div className="h-2 bg-muted/30 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          <p className="text-[11px] font-medium text-foreground">
            All caught up!
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto divide-y divide-border/40">
          {displayTasks.map((task: Task) => {
            const isOverdue = task.dueDate
              ? new Date(task.dueDate.split('T')[0] + 'T00:00:00') < new Date(new Date().toDateString())
              : false;
            const borderColor =
              PRIORITY_BORDER[task.priority] ?? PRIORITY_BORDER.LOW;
            const dotColor =
              PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.LOW;
            return (
              <div
                key={task.id}
                className={cn(
                  "px-4 py-2.5 hover:bg-muted/20 transition-colors flex items-start gap-3 border-l-2",
                  borderColor,
                )}>
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                    dotColor,
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate text-foreground">
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <p
                      className={cn(
                        "text-[10px] flex items-center gap-1 mt-0.5 font-medium",
                        isOverdue ? "text-red-600" : "text-amber-600",
                      )}>
                      <Clock className="h-2.5 w-2.5" />
                      {format(new Date(task.dueDate.split('T')[0] + 'T00:00:00'), "MMM d")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
