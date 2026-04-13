'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  Plus,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { CostLogsSection } from './CostLogsSection';
import { ProjectCostSegmentsSection } from './ProjectCostSegmentsSection';
import { ProjectFinancialsSummary } from './ProjectFinancialsSummary';
import { ProjectTimeTrackingSection } from './ProjectTimeTrackingSection';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { LinkedProposalsSection } from '../proposals/LinkedProposalsSection';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';
import { ProjectFileUploadSection } from './ProjectFileUploadSection';
import { EditProjectDialog } from './EditProjectDialog';
import { ProjectAssignmentPanel } from './ProjectAssignmentPanel';
import { ProjectServiceItemsPanel } from './ProjectServiceItemsPanel';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectOverviewPanel } from './ProjectOverviewPanel';
import { ProjectVicinityMap } from './ProjectVicinityMap';
import { AddendumTab } from './AddendumTab';
import { CommentsSection } from './CommentsSection';
import { PageBreadcrumbs } from '../layout/PageBreadcrumbs';
import { ProjectSwitcher } from './ProjectSwitcher';
import {
  projectsApi,
  type Project,
  type CostLog,
} from '@/lib/api/projects-client';
import { settingsApi } from '@/lib/api/client';
import type { Division } from '@/lib/types';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
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

interface ProjectDetailViewProps {
  projectId: string;
  currentUserId: string;
}

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
  Planning: 'text-blue-700 bg-blue-50 border-blue-200',
  Active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'On Hold': 'text-amber-700 bg-amber-50 border-amber-200',
  Completed: 'text-gray-600 bg-gray-100 border-gray-200',
  Cancelled: 'text-red-700 bg-red-50 border-red-200',
};

const RISK_CHIP: Record<string, { classes: string; icon: React.ElementType }> = {
  'On Track': { classes: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  'At Risk': { classes: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  'High Risk': { classes: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert },
  Blocked: { classes: 'text-red-700 bg-red-50 border-red-200', icon: ShieldAlert },
};

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">{children}</p>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{children}</span>
    </div>
  );
}

export function ProjectDetailView({ projectId, currentUserId }: ProjectDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const activeTab = searchParams.get('tab') || 'overview';

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [costLogs, setCostLogs] = useState<CostLog[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const loadProjectData = async (signal?: AbortSignal) => {
    try {
      const [freshProject, activitiesData, filesData] = await Promise.all([
        projectsApi.getById(projectId),
        projectsApi.getActivities(projectId),
        projectsApi.getFiles(projectId),
      ]);
      if (signal?.aborted) return;
      setProject(freshProject);
      setCostLogs(freshProject.costLogs || []);
      setActivities(activitiesData);
      setFiles(filesData);
      setLoading(false);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjectData(controller.signal);
    return () => controller.abort();
  }, [projectId]);

  useEffect(() => {
    pipelineApi.getStages('project').then(setProjectStages).catch(console.error);
    settingsApi.getDivisions().then(setDivisions).catch(console.error);
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (!project || newStatus === project.status) return;
    setIsUpdatingStatus(true);
    const prev = project.status;
    setProject({ ...project, status: newStatus });
    try {
      const updated = await projectsApi.update(project.id, { status: newStatus });
      setProject(updated);
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      setProject({ ...project, status: prev });
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    if (!project || !noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const updated = await projectsApi.update(project.id, { statusNote: noteInput.trim() });
      setProject(updated);
      setIsAddingNote(false);
      setNoteInput('');
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const qs = params.toString();
    router.replace(`/projects/${projectId}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const refreshProject = async () => {
    try {
      await loadProjectData();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <button onClick={() => router.push('/projects')} className="text-primary underline text-sm">
          Back to Projects
        </button>
      </div>
    );
  }

  // ── financials ───────────────────────────────────────────────────────────
  const contractedValue = project.contractedValue ?? 0;
  const cost = project.totalCost ?? 0;
  const profit = contractedValue - cost;
  const margin = contractedValue > 0 ? (profit / contractedValue) * 100 : 0;

  const lastStatusEntry = project.statusHistory && project.statusHistory.length > 0
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
  const accentColor = RISK_HEX[riskKey] ?? STATUS_HEX[project.status] ?? '#6b7280';
  const projectInitials = avatarInitials(project.name);

  const breadcrumbLabel = project.jobNumber
    ? `${project.jobNumber} - ${project.name}`
    : project.name;

  const isEngineeringProject = project.jobType?.division?.name === 'Engineering';

  const canViewFinancials = hasPermission('projects:view_financials');

  const TABS = [
    { value: 'overview', label: 'Overview' },
    ...(canViewFinancials ? [{ value: 'financials', label: 'Financials' }] : []),
    { value: 'tasks', label: 'Tasks' },
    { value: 'quotes', label: 'Invoices' },
    ...(project.leadId ? [{ value: 'proposals', label: 'Proposals' }] : []),
    { value: 'crew', label: 'Crew' },
    { value: 'services', label: 'Services' },
    ...(isEngineeringProject ? [{ value: 'time', label: 'Time Tracking' }] : []),
    { value: 'addenda', label: 'Addenda' },
    { value: 'comments', label: 'Comments' },
    { value: 'documents', label: `Documents${files.length > 0 ? ` (${files.length})` : ''}` },
    { value: 'location', label: 'Location' },
  ];

  return (
    <div className="flex flex-col h-full -mb-4 md:-mb-8">
      <div className="mb-4">
        <PageBreadcrumbs
          items={[
            { label: 'Projects', href: '/projects' },
            {
              label: breadcrumbLabel,
              node: (
                <ProjectSwitcher
                  currentProjectId={project.id}
                  currentProjectName={breadcrumbLabel}
                />
              ),
            },
          ]}
        />
      </div>

      <ProjectDetailHeader
        project={project}
        accentColor={accentColor}
        riskKey={riskKey}
        riskClasses={risk.classes}
        RiskIcon={RiskIcon}
        contractedValue={contractedValue}
        rawEndOfProjectValue={null}
        margin={margin}
        cost={cost}
        profit={profit}
        daysInStatus={daysInStatus}
        canEdit={hasPermission('projects:edit')}
        canMoveStage={hasPermission('projects:move_stage')}
        canViewFinancials={hasPermission('projects:view_financials')}
        stages={projectStages}
        isUpdatingStatus={isUpdatingStatus}
        onStatusChange={handleStatusChange}
        onEdit={() => setIsEditOpen(true)}
      />

      {/* ── Status Note Banner ── */}
      {project.statusNote ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-amber-900">
          <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-0.5">
              {project.status} — Note
            </p>
            <p className="text-sm leading-snug">{project.statusNote}</p>
          </div>
        </div>
      ) : project.status === 'On Hold' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-amber-900">
          <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">
              On Hold — No reason given
            </p>
            {isAddingNote ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNote();
                    if (e.key === 'Escape') { setIsAddingNote(false); setNoteInput(''); }
                  }}
                  placeholder="Why is this project on hold?"
                  className="flex-1 text-sm bg-white border border-amber-300 rounded px-2 py-1 text-amber-900 placeholder:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !noteInput.trim()}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
                >
                  {isSavingNote ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setIsAddingNote(false); setNoteInput(''); }}
                  className="text-xs text-amber-500 hover:text-amber-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNote(true)}
                className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-900"
              >
                Add a reason
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-background p-0 h-auto gap-0 shrink-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-transparent"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-auto min-h-0 pt-6 pb-4 md:pb-8 px-2 md:px-4">

            <TabsContent value="overview" className="mt-0 space-y-6">
              <ProjectOverviewPanel
                project={project}
                activities={activities}
                files={files}
                costLogs={costLogs}
                divisions={divisions}
              />

              {project.description && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
                    <FileText className="h-3 w-3" /> Description
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{project.description}</p>
                </section>
              )}

              <hr className="border-border/40" />

              <ProjectActivityTimeline
                projectId={project.id}
                activities={activities}
                currentUserId={currentUserId}
                onActivityAdded={refreshProject}
              />
            </TabsContent>

            {canViewFinancials && <TabsContent value="financials" className="mt-0">
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const params = new URLSearchParams({
                        projectId: project.id,
                        projectName: project.name,
                        returnTo: encodeURIComponent(`/projects/${project.id}?tab=financials`),
                      });
                      router.push(`/cost-breakdown/new?${params.toString()}`);
                    }}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New Cost Breakdown
                  </Button>
                </div>
                <ProjectFinancialsSummary
                  projectId={project.id}
                  contractedValue={contractedValue}
                  invoicedValue={project.invoicedValue}
                />
                {(project.costSegments?.length ?? 0) > 0 && (
                  <ProjectCostSegmentsSection
                    segments={project.costSegments!}
                    contractedValue={contractedValue}
                  />
                )}
                <CostLogsSection
                  projectId={project.id}
                  costLogs={costLogs}
                  contractedValue={contractedValue}
                  totalCost={project.totalCost ?? 0}
                  onUpdated={refreshProject}
                  canEditCosts={canEditCosts}
                />
              </div>
            </TabsContent>}

            <TabsContent value="tasks" className="mt-0">
              <LinkedTasksSection entityType="PROJECT" entityId={project.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-0">
              <LinkedQuotesSection projectId={project.id} />
            </TabsContent>

            {project.leadId && (
              <TabsContent value="proposals" className="mt-0">
                <LinkedProposalsSection leadId={project.leadId} />
              </TabsContent>
            )}

            <TabsContent value="crew" className="mt-0">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                  Crew Assignments
                </h3>
                <ProjectAssignmentPanel
                  projectId={project.id}
                />
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-3">
                  Service Items
                </h3>
                <ProjectServiceItemsPanel
                  projectId={project.id}
                  jobTypeIds={project.jobTypeIds ?? []}
                />
              </div>
            </TabsContent>

            {isEngineeringProject && (
              <TabsContent value="time" className="mt-0">
                <ProjectTimeTrackingSection
                  projectId={project.id}
                  canLogTime={hasPermission('time_tracking:create')}
                />
              </TabsContent>
            )}

            <TabsContent value="addenda" className="mt-0">
              <AddendumTab projectId={project.id} />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <CommentsSection projectId={project.id} currentUserId={currentUserId} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <ProjectFileUploadSection
                projectId={project.id}
                files={files}
                currentUserId={currentUserId}
                onFilesChanged={refreshProject}
              />
            </TabsContent>

            <TabsContent value="location" className="mt-0">
              <ProjectVicinityMap
                project={project}
                canEdit={hasPermission('projects:edit')}
                onEdit={() => setIsEditOpen(true)}
              />
            </TabsContent>

        </div>
      </Tabs>

      <EditProjectDialog
        project={project}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onProjectUpdated={(updated) => {
          setProject(updated);
          setCostLogs(updated.costLogs || []);
        }}
      />
    </div>
  );
}
