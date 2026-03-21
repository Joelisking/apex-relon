'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Activity,
  DollarSign,
  Pencil,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { CostLogsSection } from './CostLogsSection';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';
import { ProjectFileUploadSection } from './ProjectFileUploadSection';
import { EditProjectDialog } from './EditProjectDialog';
import { ProjectStageTimeline } from './ProjectStageTimeline';
import { ProjectAssignmentPanel } from './ProjectAssignmentPanel';
import {
  projectsApi,
  type Project,
  type CostLog,
} from '@/lib/api/projects-client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

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

interface ProjectDetailDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  currentUserId: string;
  currentUserRole: string;
}

// ── accent colors ──────────────────────────────────────────────────────────
const RISK_HEX: Record<string, string> = {
  'On Track': '#10b981',
  'At Risk': '#f59e0b',
  'High Risk': '#ef4444',
  Blocked: '#ef4444',
};

const STATUS_HEX: Record<string, string> = {
  Planning: '#3b82f6',
  Active: '#10b981',
  'On Hold': '#f59e0b',
  Completed: '#6b7280',
  Cancelled: '#ef4444',
};

const STATUS_CHIP: Record<string, string> = {
  Planning: 'text-blue-700   bg-blue-50   border-blue-200',
  Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'On Hold': 'text-amber-700  bg-amber-50  border-amber-200',
  Completed: 'text-gray-600   bg-gray-100  border-gray-200',
  Cancelled: 'text-red-700    bg-red-50    border-red-200',
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
  'High Risk': {
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: ShieldAlert,
  },
  Blocked: {
    classes: 'text-red-700 bg-red-50 border-red-200',
    icon: ShieldAlert,
  },
};

// ── helpers ────────────────────────────────────────────────────────────────
function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold mb-3">
      {children}
    </p>
  );
}

function StatRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">
        {children}
      </span>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export function ProjectDetailDialog({
  project: initialProject,
  open,
  onOpenChange,
  onUpdated,
  currentUserId,
}: ProjectDetailDialogProps) {
  const [project, setProject] = useState(initialProject);
  const [costLogs, setCostLogs] = useState<CostLog[]>(
    initialProject.costLogs || [],
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { hasPermission } = useAuth();

  const loadProjectData = async () => {
    try {
      const [activitiesData, filesData, freshProject] =
        await Promise.all([
          projectsApi.getActivities(project.id),
          projectsApi.getFiles(project.id),
          projectsApi.getById(project.id),
        ]);
      setActivities(activitiesData);
      setFiles(filesData);
      setProject(freshProject);
      setCostLogs(freshProject.costLogs || []);
    } catch (error) {
      console.error('Failed to load project data:', error);
      toast.error('Failed to load project details');
    }
  };

  useEffect(() => {
    if (open && project.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProjectData();
    }
  }, [open, project.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProject(initialProject);
    setCostLogs(initialProject.costLogs || []);
  }, [initialProject]);

  const refreshProject = async () => {
    try {
      const updated = await projectsApi.getById(project.id);
      setProject(updated);
      setCostLogs(updated.costLogs || []);
      await loadProjectData();
      onUpdated();
    } catch {
      // ignore
    }
  };

  // ── financials ───────────────────────────────────────────────────────────
  const contractedValue = project.contractedValue ?? 0;
  const rawEndOfProjectValue = project.endOfProjectValue ?? null;
  const endOfProjectValue = rawEndOfProjectValue ?? contractedValue;
  const cost = project.totalCost ?? 0;
  const variance = rawEndOfProjectValue != null ? rawEndOfProjectValue - contractedValue : null;
  const variancePercent =
    variance != null && contractedValue > 0 ? (variance / contractedValue) * 100 : null;
  const profit = endOfProjectValue - cost;
  const margin =
    endOfProjectValue > 0 ? (profit / endOfProjectValue) * 100 : 0;
  const revenue = project.estimatedRevenue ?? project.contractedValue;

  const lastStatusEntry =
    project.statusHistory && project.statusHistory.length > 0
      ? project.statusHistory[project.statusHistory.length - 1]
      : null;
  const daysInStatus = lastStatusEntry
    ? differenceInDays(new Date(), new Date(lastStatusEntry.createdAt))
    : project.updatedAt
      ? differenceInDays(new Date(), new Date(project.updatedAt))
      : 0;

  const canEditCosts = hasPermission('costs:create');

  const riskKey = project.riskStatus || 'On Track';
  const risk = RISK_CHIP[riskKey] ?? RISK_CHIP['On Track'];
  const RiskIcon = risk.icon;

  // accent strip is driven by risk status
  const accentColor =
    RISK_HEX[riskKey] ?? STATUS_HEX[project.status] ?? '#6b7280';

  const projectInitials = avatarInitials(project.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>{project.name}</DialogTitle>
            <DialogDescription>
              {project.client?.name}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex h-[85vh] max-h-[85vh]">
          {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="w-80 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col overflow-y-auto">
            {/* 3px risk accent strip */}
            <div
              className="h-0.75 w-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />

            {/* Header block */}
            <div className="px-5 pt-4 pb-4 border-b border-border/40">
              <div className="flex items-start gap-3 mb-3">
                {/* initials avatar */}
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[13px]"
                  style={{ backgroundColor: accentColor }}>
                  {projectInitials}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">
                    {project.name}
                  </h2>
                  {project.client && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {project.client.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Status + Risk pills */}
              <div className="flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 border ${STATUS_CHIP[project.status] ?? 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                  {project.status}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 border ${risk.classes}`}>
                  <RiskIcon className="h-2.5 w-2.5" />
                  {riskKey}
                </span>
              </div>
            </div>


            {/* ── Financials ───────────────────────────────────────────── */}
            <div className="px-5 py-4 border-b border-border/40">
              <SectionLabel>Financials</SectionLabel>

              {/* Primary values row */}
              <div className="grid grid-cols-2 gap-px bg-border/40 rounded-lg overflow-hidden mb-3">
                <div className="bg-card px-3 py-2.5 space-y-0.5">
                  <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    Contracted
                  </p>
                  <p className="text-[18px] font-bold tabular-nums leading-none text-foreground">
                    ${fmtVal(contractedValue)}
                  </p>
                </div>
                <div className="bg-card px-3 py-2.5 space-y-0.5">
                  <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                    EOP Value
                  </p>
                  {rawEndOfProjectValue != null ? (
                    <p className="text-[18px] font-bold tabular-nums leading-none text-blue-600">
                      ${fmtVal(rawEndOfProjectValue)}
                    </p>
                  ) : (
                    <p className="text-[18px] font-bold leading-none text-muted-foreground/40">
                      —
                    </p>
                  )}
                </div>
              </div>

              {/* Variance + Margin as pills */}
              <div className="flex gap-1.5 mb-3">
                {variance != null && variancePercent != null && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                      variance >= 0
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-red-700 bg-red-50 border-red-200'
                    }`}>
                    {variance >= 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {variance >= 0 ? '+' : ''}$
                    {fmtVal(Math.abs(variance))} (
                    {variancePercent.toFixed(1)}%)
                  </span>
                )}

                <span
                  className={`inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                    margin >= 0
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-red-700 bg-red-50 border-red-200'
                  }`}>
                  {margin.toFixed(1)}% margin
                </span>
              </div>

              {/* Secondary rows */}
              {cost > 0 && (
                <StatRow label="Total Cost">${fmtVal(cost)}</StatRow>
              )}
              <StatRow label="Profit">
                <span
                  className={
                    profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }>
                  {profit >= 0 ? '+' : ''}${fmtVal(profit)}
                </span>
              </StatRow>
            </div>

            {/* ── Team ─────────────────────────────────────────────────── */}
            <div className="px-5 py-4 border-b border-border/40">
              <SectionLabel>Team</SectionLabel>
              <div className="space-y-2">
                {(
                  [
                    { role: 'PM', person: project.projectManager },
                    { role: 'QS', person: project.qs },
                    { role: 'Designer', person: project.designer },
                  ] as {
                    role: string;
                    person?: { name: string } | null;
                  }[]
                ).map(({ role, person }) => (
                  <div key={role} className="flex items-center gap-2">
                    {person ? (
                      <>
                        <div
                          className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
                          style={{ fontSize: '7px' }}>
                          {avatarInitials(person.name)}
                        </div>
                        <span className="text-[11px] text-foreground flex-1 truncate">
                          {person.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {role}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
                        <span className="text-[11px] text-muted-foreground flex-1">
                          Unassigned
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {role}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Dates ────────────────────────────────────────────────── */}
            {(project.startDate ||
              project.estimatedDueDate ||
              project.completedDate) && (
              <div className="px-5 py-4 border-b border-border/40">
                <SectionLabel>Timeline</SectionLabel>
                {project.startDate && (
                  <StatRow label="Start">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5 text-muted-foreground/50" />
                      {format(
                        new Date(project.startDate),
                        'MMM d, yyyy',
                      )}
                    </span>
                  </StatRow>
                )}
                {project.estimatedDueDate && (
                  <StatRow label="Est. Due">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5 text-muted-foreground/50" />
                      {format(
                        new Date(project.estimatedDueDate),
                        'MMM d, yyyy',
                      )}
                    </span>
                  </StatRow>
                )}
                {project.completedDate && (
                  <StatRow label="Completed">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle className="h-2.5 w-2.5" />
                      {format(
                        new Date(project.completedDate),
                        'MMM d, yyyy',
                      )}
                    </span>
                  </StatRow>
                )}
              </div>
            )}

            {/* ── Pulse metrics ─────────────────────────────────────────── */}
            <div className="px-5 py-4">
              <SectionLabel>Pulse</SectionLabel>
              <div className="grid grid-cols-2 gap-px bg-border/40 rounded-lg overflow-hidden">
                {[
                  {
                    label: 'In Status',
                    value: `${daysInStatus}d`,
                    icon: Clock,
                  },
                  {
                    label: 'Activities',
                    value: activities.length,
                    icon: Activity,
                  },
                  {
                    label: 'Files',
                    value: files.length,
                    icon: FileText,
                  },
                  {
                    label: 'Cost Logs',
                    value: costLogs.length,
                    icon: DollarSign,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.label}
                      className="bg-card px-2.5 py-2.5 text-center">
                      <p className="text-[18px] font-bold tabular-nums leading-none text-foreground mb-1">
                        {m.value}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground uppercase tracking-[0.04em]">
                        <Icon className="h-2.5 w-2.5" />
                        {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Status Timeline ──────────────────────────────────────── */}
            {project.statusHistory &&
              project.statusHistory.length > 0 && (
                <div className="px-5 py-4 border-b border-border/40">
                  <ProjectStageTimeline project={project} />
                </div>
              )}

            {/* Edit button */}
            {hasPermission('projects:edit') && (
              <div className="mt-auto px-5 py-4 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="w-full justify-start gap-2 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Project
                </Button>
              </div>
            )}
          </div>

          {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 pt-3 border-b border-border/40 shrink-0">
                <TabsList className="h-8 bg-transparent p-0 gap-1">
                  {[
                    { value: 'overview', label: 'Overview' },
                    { value: 'budget', label: 'Budget' },
                    { value: 'tasks', label: 'Tasks' },
                    { value: 'quotes', label: 'Quotes' },
                    { value: 'crew', label: 'Crew' },
                    { value: 'documents', label: `Documents${files.length > 0 ? ` (${files.length})` : ''}` },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-7 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="overview" className="mt-0 p-6 space-y-6">
                  {project.description && (
                    <section className="space-y-2">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3" />
                        Description
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </p>
                    </section>
                  )}
                  {project.description && <hr className="border-border/40" />}
                  <ProjectActivityTimeline
                    projectId={project.id}
                    activities={activities}
                    currentUserId={currentUserId}
                    onActivityAdded={refreshProject}
                  />
                </TabsContent>

                <TabsContent value="budget" className="mt-0 p-6">
                  <CostLogsSection
                    projectId={project.id}
                    costLogs={costLogs}
                    estimatedRevenue={revenue}
                    totalCost={project.totalCost ?? 0}
                    onUpdated={refreshProject}
                    canEditCosts={canEditCosts}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="mt-0 p-6">
                  <LinkedTasksSection
                    entityType="PROJECT"
                    entityId={project.id}
                  />
                </TabsContent>

                <TabsContent value="quotes" className="mt-0 p-6">
                  <LinkedQuotesSection projectId={project.id} />
                </TabsContent>

                <TabsContent value="crew" className="mt-0 p-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                        Crew Assignments
                      </h3>
                      <ProjectAssignmentPanel
                        projectId={project.id}
                        excludeUserIds={[
                          project.projectManagerId,
                          project.designerId,
                          project.qsId,
                        ].filter(Boolean) as string[]}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0 p-6">
                  <ProjectFileUploadSection
                    projectId={project.id}
                    files={files}
                    currentUserId={currentUserId}
                    onFilesChanged={refreshProject}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>

      <EditProjectDialog
        project={project}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onProjectUpdated={(updated) => {
          setProject(updated);
          setCostLogs(updated.costLogs || []);
          onUpdated();
        }}
      />
    </Dialog>
  );
}
