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
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { CostLogsSection } from './CostLogsSection';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';
import { ProjectFileUploadSection } from './ProjectFileUploadSection';
import { EditProjectDialog } from './EditProjectDialog';
import { ProjectAssignmentPanel } from './ProjectAssignmentPanel';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectOverviewPanel } from './ProjectOverviewPanel';
import { PageBreadcrumbs } from '../layout/PageBreadcrumbs';
import { ProjectSwitcher } from './ProjectSwitcher';
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

interface ProjectDetailViewProps {
  projectId: string;
  currentUserId: string;
  initialTab: string;
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

export function ProjectDetailView({ projectId, currentUserId, initialTab }: ProjectDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const activeTab = searchParams.get('tab') || initialTab;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [costLogs, setCostLogs] = useState<CostLog[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
      const updated = await projectsApi.getById(projectId);
      setProject(updated);
      setCostLogs(updated.costLogs || []);
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
  const rawEndOfProjectValue = project.endOfProjectValue ?? null;
  const endOfProjectValue = rawEndOfProjectValue ?? contractedValue;
  const cost = project.totalCost ?? 0;
  const variance = rawEndOfProjectValue != null ? rawEndOfProjectValue - contractedValue : null;
  const variancePercent = variance != null && contractedValue > 0 ? (variance / contractedValue) * 100 : null;
  const profit = endOfProjectValue - cost;
  const margin = endOfProjectValue > 0 ? (profit / endOfProjectValue) * 100 : 0;
  const revenue = project.estimatedRevenue ?? project.contractedValue;

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

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'budget', label: 'Budget' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'quotes', label: 'Quotes' },
    { value: 'crew', label: 'Crew' },
    { value: 'documents', label: `Documents${files.length > 0 ? ` (${files.length})` : ''}` },
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
        rawEndOfProjectValue={rawEndOfProjectValue}
        margin={margin}
        cost={cost}
        profit={profit}
        daysInStatus={daysInStatus}
        canEdit={hasPermission('projects:edit')}
        onEdit={() => setIsEditOpen(true)}
      />

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

        <div className="flex-1 overflow-auto min-h-0 pt-6 pb-4 md:pb-8">

            <TabsContent value="overview" className="mt-0 space-y-6">
              <ProjectOverviewPanel
                project={project}
                activities={activities}
                files={files}
                costLogs={costLogs}
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

            <TabsContent value="budget" className="mt-0">
              <CostLogsSection
                projectId={project.id}
                costLogs={costLogs}
                estimatedRevenue={revenue}
                totalCost={project.totalCost ?? 0}
                onUpdated={refreshProject}
                canEditCosts={canEditCosts}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <LinkedTasksSection entityType="PROJECT" entityId={project.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-0">
              <LinkedQuotesSection projectId={project.id} />
            </TabsContent>

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

            <TabsContent value="documents" className="mt-0">
              <ProjectFileUploadSection
                projectId={project.id}
                files={files}
                currentUserId={currentUserId}
                onFilesChanged={refreshProject}
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
