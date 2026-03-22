'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks-client';
import type { Task, MemberTaskSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskTableView } from './TaskTableView';

interface MemberRowProps {
  member: MemberTaskSummary;
  canEdit: boolean;
  canEditAll?: boolean;
  canDelete: boolean;
  currentUserId?: string;
  onComplete: (taskId: string, completionNote: string) => Promise<void>;
  onUncomplete: (taskId: string, reason: string) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

function MemberRow({
  member,
  canEdit,
  canEditAll,
  canDelete,
  currentUserId,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: MemberRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (tasks.length > 0) return;
    try {
      setLoading(true);
      const data = await tasksApi.getAll({
        assignedToId: member.id,
        status: undefined,
      });
      setTasks(data.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED'));
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [member.id, tasks.length]);

  const handleToggle = async () => {
    if (!expanded) await loadTasks();
    setExpanded((v) => !v);
  };

  const isActive = member.total > 0;

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      {/* Member header row */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{member.name}</span>
          <span className="ml-2 text-[11px] text-muted-foreground">{member.role}</span>
        </div>

        {/* Mini stats */}
        <div className="flex items-center gap-4 shrink-0">
          {member.overdue > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium leading-none mb-0.5">Overdue</p>
              <p className="text-[15px] font-bold tabular-nums leading-none text-red-600">{member.overdue}</p>
            </div>
          )}
          {member.dueToday > 0 && (
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium leading-none mb-0.5">Today</p>
              <p className="text-[15px] font-bold tabular-nums leading-none text-amber-600">{member.dueToday}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium leading-none mb-0.5">Open</p>
            <p className={cn('text-[15px] font-bold tabular-nums leading-none', isActive ? 'text-foreground' : 'text-muted-foreground')}>
              {member.total}
            </p>
          </div>
        </div>
      </button>

      {/* Expanded task list */}
      {expanded && (
        <div className="border-t border-border/40">
          {loading ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">No open tasks</div>
          ) : (
            <TaskTableView
              tasks={tasks}
              canEdit={canEdit}
              canEditAll={canEditAll}
              canDelete={canDelete}
              currentUserId={currentUserId}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface TeamTasksViewProps {
  members: MemberTaskSummary[];
  canEdit: boolean;
  canEditAll?: boolean;
  canDelete: boolean;
  currentUserId?: string;
  onComplete: (taskId: string, completionNote: string) => Promise<void>;
  onUncomplete: (taskId: string, reason: string) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onTaskSaved: () => void;
}

export function TeamTasksView({
  members,
  canEdit,
  canEditAll,
  canDelete,
  currentUserId,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: TeamTasksViewProps) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No team members found</p>
      </div>
    );
  }

  const hasTeamGroups = members.some((m) => m.teamName);

  if (!hasTeamGroups) {
    return (
      <div className="space-y-3">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            canEdit={canEdit}
            canEditAll={canEditAll}
            canDelete={canDelete}
            currentUserId={currentUserId}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  const grouped = new Map<string, MemberTaskSummary[]>();
  for (const m of members) {
    const key = m.teamName || 'Unassigned';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-5">
      {sortedEntries.map(([groupName, groupMembers]) => (
        <div key={groupName} className="space-y-3">
          <div className="px-1 py-2 text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
            {groupName}
          </div>
          {groupMembers.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canEdit={canEdit}
              canDelete={canDelete}
              currentUserId={currentUserId}
              onComplete={onComplete}
              onUncomplete={onUncomplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
