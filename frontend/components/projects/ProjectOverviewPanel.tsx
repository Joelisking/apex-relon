'use client';

import { format } from 'date-fns';
import { ProjectStageTimeline } from './ProjectStageTimeline';
import type { Project, CostLog } from '@/lib/api/projects-client';

interface Activity {
  id: string;
  type: string;
  activityDate: string;
  activityTime: string;
  reason: string;
  notes?: string;
  meetingType?: string;
  userId: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface FileUpload {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  downloadUrl: string;
  uploadedBy: { id: string; name: string; email: string };
  createdAt: string;
}

interface Props {
  project: Project;
  activities: Activity[];
  files: FileUpload[];
  costLogs: CostLog[];
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function ProjectOverviewPanel({ project, activities, files, costLogs }: Props) {
  const team = [
    { role: 'Project Manager', person: project.projectManager },
    { role: 'QS', person: project.qs },
    { role: 'Designer', person: project.designer },
  ] as { role: string; person?: { name: string } | null }[];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Team */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Team
          </p>
          <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
            {team.map(({ role, person }) => (
              <div key={role} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">{role}</span>
                {person ? (
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xs shrink-0">
                      {avatarInitials(person.name)}
                    </div>
                    <span className="text-sm font-medium">{person.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline + counts */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Timeline
          </p>
          <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
            {project.startDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Start</span>
                <span className="text-sm font-mono tabular-nums">
                  {format(new Date(project.startDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {project.estimatedDueDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Est. Due</span>
                <span className="text-sm font-mono tabular-nums">
                  {format(new Date(project.estimatedDueDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {project.completedDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm font-mono tabular-nums text-emerald-700">
                  {format(new Date(project.completedDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Activities</span>
              <span className="text-sm font-mono">{activities.length}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Files</span>
              <span className="text-sm font-mono">{files.length}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Cost Logs</span>
              <span className="text-sm font-mono">{costLogs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {project.statusHistory && project.statusHistory.length > 0 && (
        <ProjectStageTimeline project={project} />
      )}
    </div>
  );
}
