'use client';

import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ProjectStageTimeline } from './ProjectStageTimeline';
import {
  projectsApi,
  type Project,
  type CostLog,
} from '@/lib/api/projects-client';
import type { ServiceCategory } from '@/lib/types';

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
  serviceCategories?: ServiceCategory[];
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

function FolderPathRow({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  function copyPath() {
    navigator.clipboard.writeText(path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <span className="text-sm text-muted-foreground shrink-0">
        Server Folder
      </span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono truncate text-right">
          {path}
        </span>
        <button
          onClick={copyPath}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          title="Copy path">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ProjectOverviewPanel({
  project,
  activities,
  files,
  costLogs,
  serviceCategories = [],
}: Props) {
  const pm = project.projectManager;
  const team = project.assignments ?? [];

  const { data: serviceItems = [] } = useQuery({
    queryKey: ['project-service-items', project.id],
    queryFn: () => projectsApi.getServiceItems(project.id),
    staleTime: 5 * 60 * 1000,
  });
  const allServiceTypes = serviceCategories.flatMap(
    (c) => c.serviceTypes ?? [],
  );
  const resolvedProjectTypes = serviceCategories
    .filter((c) => project.categoryIds?.includes(c.id))
    .map((c) => c.name);
  const resolvedServiceTypes = allServiceTypes
    .filter((st) => project.serviceTypeIds?.includes(st.id))
    .map((st) => st.name);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Team */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Team
          </p>
          {!pm && team.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No team members assigned.
            </p>
          ) : (
            <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
              {pm && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    Project Manager
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xs shrink-0">
                      {avatarInitials(pm.name)}
                    </div>
                    <span className="text-sm font-medium">
                      {pm.name}
                    </span>
                  </div>
                </div>
              )}
              {team.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {a.role}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xs shrink-0">
                      {avatarInitials(a.user.name)}
                    </div>
                    <span className="text-sm font-medium">
                      {a.user.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline + counts */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Timeline
          </p>
          <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
            {project.startDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Start
                </span>
                <span className="text-sm font-mono tabular-nums">
                  {format(new Date(project.startDate), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {project.estimatedDueDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Est. Due
                </span>
                <span className="text-sm font-mono tabular-nums">
                  {format(
                    new Date(project.estimatedDueDate),
                    'MMM d, yyyy',
                  )}
                </span>
              </div>
            )}
            {project.completedDate && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Completed
                </span>
                <span className="text-sm font-mono tabular-nums text-emerald-700">
                  {format(
                    new Date(project.completedDate),
                    'MMM d, yyyy',
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Activities
              </span>
              <span className="text-sm font-mono">
                {activities.length}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Files
              </span>
              <span className="text-sm font-mono">
                {files.length}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Cost Logs
              </span>
              <span className="text-sm font-mono">
                {costLogs.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Service info */}
      {(resolvedProjectTypes.length > 0 ||
        resolvedServiceTypes.length > 0 ||
        project.county ||
        project.folderPath) && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Service
            </p>
            <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/40">
              {resolvedProjectTypes.length > 0 && (
                <div className="flex items-start justify-between px-4 py-3 gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">
                    Project Type
                  </span>
                  <span className="text-sm font-medium text-right">
                    {resolvedProjectTypes.join(', ')}
                  </span>
                </div>
              )}
              {resolvedServiceTypes.length > 0 && (
                <div className="flex items-start justify-between px-4 py-3 gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">
                    Service Categories
                  </span>
                  <span className="text-sm font-medium text-right">
                    {resolvedServiceTypes.join(', ')}
                  </span>
                </div>
              )}
              {(project.county?.length ?? 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    County
                  </span>
                  <span className="text-sm font-medium">
                    {(project.county ?? []).join(', ')}
                  </span>
                </div>
              )}
              {project.folderPath && (
                <FolderPathRow path={project.folderPath} />
              )}
            </div>
          </div>
        </div>
      )}

      {serviceItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Service Items
          </p>
          <div className="flex flex-wrap gap-2">
            {serviceItems.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
                <span className="text-sm font-medium">
                  {link.serviceItem.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.statusHistory && project.statusHistory.length > 0 && (
        <ProjectStageTimeline project={project} />
      )}
    </div>
  );
}
