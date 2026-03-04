'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  Plus,
  Briefcase,
  Calendar,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  projectsApi,
  type Project,
  type CreateProjectDto,
} from '@/lib/api/projects-client';
import { ProjectDetailDialog } from '@/components/projects/ProjectDetailDialog';
import { format } from 'date-fns';

interface ClientProjectsListProps {
  clientId: string;
  projects: Project[];
  accountManagers: Array<{ id: string; name: string; email: string }>;
  onProjectsChanged: () => void;
  currentUserId: string;
}

// ── chip maps ──────────────────────────────────────────────────────────────
const RISK_HEX: Record<string, string> = {
  'On Track': '#10b981',
  'At Risk': '#f59e0b',
  'High Risk': '#ef4444',
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
    classes: 'text-amber-700  bg-amber-50  border-amber-200',
    icon: AlertTriangle,
  },
  'High Risk': {
    classes: 'text-red-700   bg-red-50    border-red-200',
    icon: ShieldAlert,
  },
  Blocked: {
    classes: 'text-red-700   bg-red-50    border-red-200',
    icon: ShieldAlert,
  },
};

const STATUS_CHIP: Record<string, string> = {
  Planning: 'text-blue-700   bg-blue-50   border-blue-200',
  Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'On Hold': 'text-amber-700  bg-amber-50  border-amber-200',
  Completed: 'text-gray-600   bg-gray-100  border-gray-200',
  Cancelled: 'text-red-700    bg-red-50    border-red-200',
};

const PROJECT_STATUSES = [
  { value: 'Planning', label: 'Planning' },
  { value: 'Active', label: 'Active' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// ── helpers ────────────────────────────────────────────────────────────────
function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

// ── component ──────────────────────────────────────────────────────────────
export function ClientProjectsList({
  clientId,
  projects,
  accountManagers,
  onProjectsChanged,
  currentUserId,
}: ClientProjectsListProps) {
  const { user, hasPermission } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);
  const [formData, setFormData] = useState<Partial<CreateProjectDto>>(
    {
      clientId,
      status: 'Planning',
      contractedValue: 0,
    },
  );

  const canCreate = hasPermission('projects:create');

  const handleCreateProject = async () => {
    if (!formData.name?.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    if (!formData.contractedValue || formData.contractedValue <= 0) {
      toast.error('Please enter a valid project value');
      return;
    }
    setIsSubmitting(true);
    try {
      await projectsApi.create({
        name: formData.name!,
        clientId,
        status: formData.status || 'Planning',
        contractedValue: formData.contractedValue,
        description: formData.description,
        projectManagerId: formData.projectManagerId,
        startDate: formData.startDate,
        estimatedDueDate: formData.estimatedDueDate,
        riskStatus: formData.riskStatus,
        estimatedRevenue: formData.estimatedRevenue,
      });
      toast.success('Project created');
      setFormData({
        clientId,
        status: 'Planning',
        contractedValue: 0,
      });
      setCreateDialogOpen(false);
      onProjectsChanged();
    } catch (error) {
      toast.error('Failed to create project', {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await projectsApi.delete(projectId);
      toast.success('Project deleted');
      onProjectsChanged();
    } catch (error) {
      toast.error('Failed to delete project', {
        description:
          error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Projects
        </p>
        {canCreate && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-7 gap-1.5 text-xs px-2.5">
            <Plus className="h-3 w-3" />
            New
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-border/40 border-dashed bg-muted/10 py-8 text-center">
          <Briefcase className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-[11px] text-muted-foreground/50">
            No projects yet
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project) => {
            const riskKey = project.riskStatus || 'On Track';
            const risk = RISK_CHIP[riskKey] ?? RISK_CHIP['On Track'];
            const RiskIcon = risk.icon;
            const accentColor = RISK_HEX[riskKey] ?? '#10b981';
            const statusChip =
              STATUS_CHIP[project.status] ??
              'text-gray-600 bg-gray-100 border-gray-200';

            return (
              <div
                key={project.id}
                className="bg-card rounded-xl overflow-hidden border border-border/60 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.13)] hover:-translate-y-px transition-all duration-200 cursor-pointer"
                style={{
                  borderTopColor: accentColor,
                  borderTopWidth: '2px',
                }}
                onClick={() => setSelectedProject(project)}>
                <div className="px-3.5 py-3">
                  {/* Name + actions */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold leading-snug line-clamp-2 flex-1 min-w-0 text-foreground">
                      {project.name}
                    </h4>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border ${risk.classes}`}>
                        <RiskIcon className="h-2.5 w-2.5" />
                        {riskKey}
                      </span>
                      <button
                        onClick={() =>
                          handleDeleteProject(project.id)
                        }
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors ml-0.5">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-2.5">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 border ${statusChip}`}>
                      {project.status}
                    </span>
                  </div>

                  {/* Financials */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border/40 mb-2.5">
                    <div className="space-y-0.5">
                      <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium">
                        Contracted
                      </p>
                      <p className="text-[14px] font-bold tabular-nums text-foreground">
                        ${fmtValue(project.contractedValue)}
                      </p>
                    </div>
                  </div>

                  {/* Footer: dates + PM */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {format(
                            new Date(project.startDate),
                            'MMM d',
                          )}
                        </span>
                      )}
                      {project.estimatedDueDate && (
                        <span>
                          →{' '}
                          {format(
                            new Date(project.estimatedDueDate),
                            'MMM d',
                          )}
                        </span>
                      )}
                    </div>
                    {project.projectManager && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-[18px] w-[18px] rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
                          style={{ fontSize: '8px' }}>
                          {avatarInitials(
                            project.projectManager.name,
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {project.projectManager.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create project dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project for this client
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Project Name{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Website Redesign"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((status) => (
                    <SelectItem
                      key={status.value}
                      value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Contracted Value ($){' '}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.contractedValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contractedValue: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Project Manager
              </Label>
              <Select
                value={formData.projectManagerId || ''}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    projectManagerId: value,
                  })
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Select project manager" />
                </SelectTrigger>
                <SelectContent>
                  {accountManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Start Date
              </Label>
              <DatePicker
                value={formData.startDate || ''}
                onChange={(val) =>
                  setFormData({ ...formData, startDate: val })
                }
                placeholder="Pick a date"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                  Est. Due Date
                </Label>
                <DatePicker
                  value={formData.estimatedDueDate || ''}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      estimatedDueDate: val,
                    })
                  }
                  placeholder="Pick a date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                  Risk Status
                </Label>
                <Select
                  value={formData.riskStatus || 'On Track'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, riskStatus: value })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Track">On Track</SelectItem>
                    <SelectItem value="At Risk">At Risk</SelectItem>
                    <SelectItem value="High Risk">
                      High Risk
                    </SelectItem>
                    <SelectItem value="Blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Est. Revenue
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.estimatedRevenue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimatedRevenue: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Description
              </Label>
              <Textarea
                placeholder="Project description..."
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateProject}
                disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => {
            if (!open) setSelectedProject(null);
          }}
          onUpdated={onProjectsChanged}
          currentUserId={currentUserId}
          currentUserRole={user?.role ?? ''}
        />
      )}
    </div>
  );
}
