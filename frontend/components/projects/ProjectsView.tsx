'use client';

import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  RefreshCw,
  Trash2,
  ChevronDown,
  Loader2,
  Download,
  UserRound,
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ProjectKanbanBoard } from './ProjectKanbanBoard';
import { ProjectDetailDialog } from './ProjectDetailDialog';
import { CreateProjectDialog } from './CreateProjectDialog';
import { projectColumns } from './columns-projects';
import { DataTable } from '@/components/ui/data-table';
import { projectsApi, type Project } from '@/lib/api/projects-client';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import { CompleteProjectDialog } from './CompleteProjectDialog';
import { ProjectStats } from './ProjectStats';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectsViewProps {
  currentUser: { id: string; role: string; name: string };
}

export default function ProjectsView({
  currentUser,
}: ProjectsViewProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [completionPendingProject, setCompletionPendingProject] =
    useState<Project | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Bulk action state
  const [selectedProjects, setSelectedProjects] = useState<Project[]>(
    [],
  );
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
    useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] =
    useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] =
    useState(false);
  const [bulkManagerDialogOpen, setBulkManagerDialogOpen] =
    useState(false);
  const [bulkManagerId, setBulkManagerId] = useState<string>('');
  const [isBulkAssigningManager, setIsBulkAssigningManager] =
    useState(false);

  const {
    data: queryProjects,
    isLoading,
    isFetching,
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getAll(),
    staleTime: 60 * 1000,
  });

  const { data: projectStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'project'],
    queryFn: () => pipelineApi.getStages('project'),
    staleTime: 10 * 60 * 1000,
  });

  type UserRecord = { id: string; name: string; role: string };
  const { data: allUsers = [] } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: () => api.admin.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const managers = Array.isArray(allUsers)
    ? allUsers.filter((u) =>
        ['BDM', 'SALES', 'ADMIN', 'CEO'].includes(u.role),
      )
    : [];

  // Keep local state in sync with query cache for optimistic updates
  useEffect(() => {
    if (queryProjects) {
      setLocalProjects(queryProjects);
    }
  }, [queryProjects]);

  const projects = localProjects;

  const filteredProjects = projects.filter((p) => {
    if (!dateRange?.from && !dateRange?.to) return true;
    const ref = p.startDate ?? p.createdAt;
    if (!ref) return true;
    const refDate = new Date(ref.slice(0, 10));
    if (dateRange.from && refDate < dateRange.from) return false;
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      if (refDate > to) return false;
    }
    return true;
  });

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const handleProjectUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    if (selectedProject) {
      projectsApi
        .getById(selectedProject.id)
        .then(setSelectedProject)
        .catch(() => {});
    }
  };

  const handleProjectStatusChange = async (
    projectId: string,
    newStatus: string,
  ) => {
    // Intercept 'Completed' to prompt for completion details
    if (newStatus === 'Completed') {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setCompletionPendingProject(project);
        return;
      }
    }

    // Optimistic update
    const previousProjects = [...localProjects];
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: newStatus } : p,
      ),
    );

    try {
      const updated = await projectsApi.update(projectId, {
        status: newStatus,
      });
      // Replace with full server response so statusHistory etc. are fresh
      setLocalProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
      toast.success(`Project moved to ${newStatus}`);
    } catch (error) {
      // Revert on failure
      toast.error('Failed to update project', {
        description:
          error instanceof Error ? error.message : undefined,
      });
      setLocalProjects(previousProjects);
    }
  };

  const handleCompletionSuccess = (updatedProject: Project) => {
    setLocalProjects((prev) =>
      prev.map((p) =>
        p.id === updatedProject.id ? updatedProject : p,
      ),
    );
    setCompletionPendingProject(null);
    toast.success('Project marked as Completed');
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await projectsApi.bulkDelete(selectedProjects.map((p) => p.id));
      const deletedIds = new Set(selectedProjects.map((p) => p.id));
      setLocalProjects((prev) =>
        prev.filter((p) => !deletedIds.has(p.id)),
      );
      setSelectedProjects([]);
      setBulkDeleteDialogOpen(false);
      toast.success(
        `${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''} deleted`,
      );
    } catch {
      toast.error('Failed to delete some projects');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedProjects.length === 0 || !bulkStatus) return;
    setIsBulkUpdatingStatus(true);
    try {
      await projectsApi.bulkUpdate(
        selectedProjects.map((p) => p.id),
        { status: bulkStatus },
      );
      setLocalProjects((prev) =>
        prev.map((p) =>
          selectedProjects.some((s) => s.id === p.id)
            ? { ...p, status: bulkStatus }
            : p,
        ),
      );
      setSelectedProjects([]);
      setBulkStatusDialogOpen(false);
      setBulkStatus('');
      toast.success(
        `Status updated for ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}`,
      );
    } catch {
      toast.error('Failed to update status for some projects');
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

  const handleBulkAssignManager = async () => {
    if (selectedProjects.length === 0 || !bulkManagerId) return;
    setIsBulkAssigningManager(true);
    try {
      await projectsApi.bulkUpdate(
        selectedProjects.map((p) => p.id),
        { projectManagerId: bulkManagerId },
      );
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjects([]);
      setBulkManagerDialogOpen(false);
      setBulkManagerId('');
      toast.success(
        `Project manager assigned for ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}`,
      );
    } catch {
      toast.error('Failed to assign project manager');
    } finally {
      setIsBulkAssigningManager(false);
    }
  };

  const handleExportSelected = () => {
    if (selectedProjects.length === 0) return;
    const headers = [
      'Name',
      'Client',
      'Status',
      'Risk',
      'Contracted Value',
      'Est. Revenue',
      'Total Cost',
      'Project Manager',
      'Due Date',
    ];
    const rows = selectedProjects.map((p) => [
      p.name,
      p.client?.name ?? '',
      p.status,
      p.riskStatus ?? 'On Track',
      p.contractedValue,
      p.estimatedRevenue ?? '',
      p.totalCost ?? '',
      p.projectManager?.name ?? '',
      p.estimatedDueDate
        ? new Date(p.estimatedDueDate).toLocaleDateString()
        : '',
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}`,
    );
  };

  const PROJECT_STATUSES = [
    'Planning',
    'Active',
    'On Hold',
    'Completed',
    'Cancelled',
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">
            Projects
          </h1>
          <p className="text-muted-foreground">
            {filteredProjects.length} project
            {filteredProjects.length !== 1 ? 's' : ''} across all
            clients
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['projects'],
              })
            }
            disabled={isFetching}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {hasPermission('projects:create') && (
            <Button onClick={() => setIsCreateOpen(true)}>
              + Create Project
            </Button>
          )}

          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setView('kanban')}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              onClick={() => setView('table')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          placeholder="Filter by date range"
          numberOfMonths={2}
        />
        {(dateRange?.from ||
          dateRange?.to) && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {filteredProjects.length} of {projects.length} projects
          </span>
        )}
      </div>

      {/* Stats */}
      {!isLoading && <ProjectStats projects={filteredProjects} />}

      {/* Content */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-card border rounded-lg p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-7 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
          {/* Kanban skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 bg-muted rounded w-2/3"></div>
                {[...Array(3)].map((_, j) => (
                  <div
                    key={j}
                    className="bg-card rounded-lg border p-4 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : view === 'kanban' ? (
        <ProjectKanbanBoard
          projects={filteredProjects}
          onProjectClick={handleProjectClick}
          onStatusChange={handleProjectStatusChange}
          stages={projectStages}
        />
      ) : (
        <>
          {selectedProjects.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/60 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedProjects.length} project
                {selectedProjects.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setBulkStatusDialogOpen(true)}>
                  <ChevronDown className="h-3 w-3" />
                  Move to Status
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={() => setBulkManagerDialogOpen(true)}>
                  <UserRound className="h-3 w-3" />
                  Assign Manager
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={handleExportSelected}>
                  <Download className="h-3 w-3" />
                  Export
                </Button>
                {hasPermission('projects:delete') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => setBulkDeleteDialogOpen(true)}>
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
          <DataTable
            columns={projectColumns}
            data={filteredProjects}
            globalFilter
            filterConfigs={[
              {
                columnId: 'status',
                title: 'Status',
                options: [
                  'Planning',
                  'Active',
                  'On Hold',
                  'Completed',
                  'Cancelled',
                ].map((v) => ({ label: v, value: v })),
              },
              {
                columnId: 'riskStatus',
                title: 'Risk',
                options: ['On Track', 'At Risk', 'Blocked'].map((v) => ({
                  label: v,
                  value: v,
                })),
              },
              {
                columnId: 'projectManager',
                title: 'Manager',
                options: [
                  ...new Set(
                    filteredProjects.map(
                      (p) => p.projectManager?.name || 'Unassigned',
                    ),
                  ),
                ].map((v) => ({ label: v, value: v })),
              },
            ]}
            onRowClick={(row) => handleProjectClick(row)}
            onSelectionChange={setSelectedProjects}
          />
        </>
      )}

      {/* Detail dialog */}
      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={!!selectedProject}
          onOpenChange={(open) => {
            if (!open) setSelectedProject(null);
          }}
          onUpdated={handleProjectUpdated}
          currentUserId={currentUser.id}
          currentUserRole={currentUser.role}
        />
      )}

      <CreateProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onProjectCreated={() =>
          queryClient.invalidateQueries({ queryKey: ['projects'] })
        }
        currentUserId={currentUser.id}
      />

      <CompleteProjectDialog
        project={completionPendingProject}
        open={!!completionPendingProject}
        onOpenChange={(open) => {
          if (!open) setCompletionPendingProject(null);
        }}
        onSuccess={handleCompletionSuccess}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Selected Projects
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {selectedProjects.length} project
                {selectedProjects.length !== 1 ? 's' : ''}
              </strong>
              . All associated data will also be removed. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Dialog */}
      <AlertDialog
        open={bulkStatusDialogOpen}
        onOpenChange={(open) => {
          setBulkStatusDialogOpen(open);
          if (!open) setBulkStatus('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Status</AlertDialogTitle>
            <AlertDialogDescription>
              Select a status to apply to{' '}
              <strong>
                {selectedProjects.length} selected project
                {selectedProjects.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStatusChange}
              disabled={isBulkUpdatingStatus || !bulkStatus}>
              {isBulkUpdatingStatus ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Apply Status'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Manager Dialog */}
      <AlertDialog
        open={bulkManagerDialogOpen}
        onOpenChange={(open) => {
          setBulkManagerDialogOpen(open);
          if (!open) setBulkManagerId('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Assign Project Manager
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select a project manager to assign to{' '}
              <strong>
                {selectedProjects.length} selected project
                {selectedProjects.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select
              value={bulkManagerId}
              onValueChange={setBulkManagerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a manager..." />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAssignManager}
              disabled={isBulkAssigningManager || !bulkManagerId}>
              {isBulkAssigningManager ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Manager'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
