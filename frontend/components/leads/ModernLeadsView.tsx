'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { type DateRange } from 'react-day-picker';
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import type { ServiceType } from '@/lib/types';
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
import type { Lead } from '@/lib/types';
import {
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { api, settingsApi, apiFetch } from '@/lib/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import {
  activitiesApi,
  type Activity,
} from '@/lib/api/activities-client';
import { filesApi, type FileUpload } from '@/lib/api/files-client';
import { CreateLeadDialog } from './CreateLeadDialog';
import { AISummaryDialog } from './AISummaryDialog';
import { CloseWonDialog } from './CloseWonDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { useAuth } from '@/contexts/auth-context';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { toast } from 'sonner';

// Imported Refactored Components
import { PipelineStats } from './PipelineStats';
import { KanbanBoard } from './KanbanBoard';
import { LeadDetailsDialog } from './LeadDetailsDialog';

interface Manager {
  id: string;
  name: string;
  email: string;
  role?: string;
  teamName?: string;
}

interface ModernLeadsViewProps {
  currentUser: {
    id: string;
    role: string;
    name?: string;
  };
}

export default function ModernLeadsView({
  currentUser,
}: ModernLeadsViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [closeWonDialogOpen, setCloseWonDialogOpen] = useState(false);
  const [leadToCloseWon, setLeadToCloseWon] = useState<Lead | null>(
    null,
  );
  const [pendingWonRevert, setPendingWonRevert] = useState<
    Lead[] | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(
    null,
  );
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
    useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStageDialogOpen, setBulkStageDialogOpen] =
    useState(false);
  const [bulkStage, setBulkStage] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkRepDialogOpen, setBulkRepDialogOpen] = useState(false);
  const [bulkRepId, setBulkRepId] = useState<string>('');
  const [bulkRepSearch, setBulkRepSearch] = useState('');
  const [isBulkAssigningRep, setIsBulkAssigningRep] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(
    'kanban',
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
  );

  // Fetch all data client-side for instant cache hits on return navigation
  const {
    data: queryLeads,
    isLoading,
    isFetching,
  } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.getAll(),
    staleTime: 60 * 1000,
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.admin.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ['service-types'],
    queryFn: () => settingsApi.getServiceTypes(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: clientList = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.clients.getAll(),
    staleTime: 60 * 1000,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const allUsersArr: Manager[] = Array.isArray(allUsers)
    ? allUsers
    : ((allUsers as { users?: Manager[] })?.users ?? []);
  const managers: Manager[] = allUsersArr;
  const clients = clientList;

  const currentYear = new Date().getFullYear();
  // Local state for optimistic drag-and-drop updates
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  // Sync server data into local state (won't interrupt in-progress drags)
  useEffect(() => {
    if (queryLeads) {
      setLeads(queryLeads);
    }
  }, [queryLeads]);

  // Filter state: year quick-select OR custom date range
  const [selectedYear, setSelectedYear] = useState<number | null>(
    currentYear,
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const isCustom = !!(dateRange?.from || dateRange?.to);

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  function selectYear(year: number | null) {
    setSelectedYear(year);
    setDateRange(undefined);
  }

  function handleDateRange(range: DateRange | undefined) {
    setDateRange(range);
    setSelectedYear(null);
  }
  const [activities, setActivities] = useState<Activity[]>([]);
  const [, setActivitiesLoading] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [, setFilesLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    insights: string[];
    nextActions: string[];
    metrics: {
      daysInPipeline: number;
      daysSinceLastContact: number;
      activityCount: number;
      fileCount: number;
    };
  } | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const { data: pipelineStages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () => pipelineApi.getStages('prospective_project'),
    staleTime: 10 * 60 * 1000,
  });

  // Apply filter whenever leads or filter state changes
  useEffect(() => {
    setFilteredLeads(
      leads.filter((l) => {
        if (isCustom) {
          if (!l.likelyStartDate) return true; // undated leads always shown
          const d = new Date(l.likelyStartDate as string);
          if (dateRange?.from && d < dateRange.from) return false;
          if (dateRange?.to) {
            const to = new Date(dateRange.to);
            to.setHours(23, 59, 59, 999);
            if (d > to) return false;
          }
          return true;
        }
        if (selectedYear !== null) {
          if (!l.likelyStartDate) return true; // undated leads always shown
          return (
            new Date(l.likelyStartDate as string).getFullYear() ===
            selectedYear
          );
        }
        return true; // "All" — no filter
      }),
    );
  }, [
    leads,
    selectedYear,
    dateRange,
    isCustom,
  ]);

  // Load activities when a lead is selected
  const loadActivities = async (leadId: string) => {
    setActivitiesLoading(true);
    try {
      const data = await activitiesApi.getActivities(leadId);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Load files when a lead is selected
  const loadFiles = async (leadId: string) => {
    setFilesLoading(true);
    try {
      const data = await filesApi.getFiles(leadId);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  // Load activities and files when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      loadActivities(selectedLead.id);
      loadFiles(selectedLead.id);
    } else {
      setActivities([]);
      setFiles([]);
    }
  }, [selectedLead?.id]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;

    // Capture lead synchronously before any state changes
    const lead = leads.find((l) => l.id === leadId);

    // Optimistic update
    const oldLeads = [...leads];
    setLeads((prevLeads) =>
      prevLeads.map((l) =>
        l.id === leadId ? { ...l, stage: newStage } : l,
      ),
    );

    if (newStage === 'Closed Won') {
      // For Won: defer the API call — CloseWonDialog will submit stage + details atomically
      if (lead) {
        setPendingWonRevert(oldLeads);
        setLeadToCloseWon({ ...lead, stage: 'Won' });
        setCloseWonDialogOpen(true);
      }
    } else {
      api.leads.update(leadId, { stage: newStage }).catch((error) => {
        console.error('Failed to update lead stage:', error);
        setLeads(oldLeads);
      });
    }
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleCloseWonOpenChange = (open: boolean) => {
    if (!open && pendingWonRevert) {
      // User cancelled — revert the optimistic stage update
      setLeads(pendingWonRevert);
      setPendingWonRevert(null);
    }
    setCloseWonDialogOpen(open);
  };

  const handleCloseWonSuccess = (
    updatedLead: Lead,
    convertToProject: boolean,
  ) => {
    setPendingWonRevert(null);
    // Update the lead in state with the new contractedValue, dealClosedAt, and stage
    setLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)),
    );
    if (convertToProject && !updatedLead.convertedToClientId) {
      setLeadToConvert(updatedLead);
      setConvertDialogOpen(true);
    }
  };

  const activeLead = activeDragId
    ? leads.find((lead) => lead.id === activeDragId) || null
    : null;

  const handleExportLeads = () => {
    if (selectedLeads.length === 0) return;
    const headers = [
      'Name',
      'Company',
      'Stage',
      'Expected Value',
      'Source',
      'Assigned To',
    ];
    const rows = selectedLeads.map((l) => [
      l.contactName || '',
      l.company || '',
      l.stage || '',
      l.expectedValue ?? '',
      l.source || '',
      (l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || '',
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
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${selectedLeads.length} prospective project${selectedLeads.length !== 1 ? 's' : ''}`,
    );
  };

  const handleBulkAssignRep = async () => {
    if (selectedLeads.length === 0 || !bulkRepId) return;
    setIsBulkAssigningRep(true);
    try {
      await api.leads.bulkUpdate(
        selectedLeads.map((l) => l.id),
        { assignedToId: bulkRepId },
      );
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads([]);
      setBulkRepDialogOpen(false);
      setBulkRepId('');
      toast.success(
        `Rep assigned for ${selectedLeads.length} item${selectedLeads.length !== 1 ? 's' : ''}`,
      );
    } catch {
      toast.error('Failed to assign rep to some items');
    } finally {
      setIsBulkAssigningRep(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.leads.bulkDelete(selectedLeads.map((l) => l.id));
      const deletedIds = new Set(selectedLeads.map((l) => l.id));
      setLeads((prev) => prev.filter((l) => !deletedIds.has(l.id)));
      setSelectedLeads([]);
      setBulkDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(
        `${selectedLeads.length} prospective project${selectedLeads.length !== 1 ? 's' : ''} deleted`,
      );
    } catch {
      toast.error('Failed to delete some prospective projects');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStageAssign = async () => {
    if (selectedLeads.length === 0 || !bulkStage) return;
    setIsBulkAssigning(true);
    try {
      await api.leads.bulkUpdate(
        selectedLeads.map((l) => l.id),
        { stage: bulkStage },
      );
      setLeads((prev) =>
        prev.map((l) =>
          selectedLeads.some((s) => s.id === l.id)
            ? { ...l, stage: bulkStage }
            : l,
        ),
      );
      setSelectedLeads([]);
      setBulkStageDialogOpen(false);
      setBulkStage('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(
        `Stage updated for ${selectedLeads.length} item${selectedLeads.length !== 1 ? 's' : ''}`,
      );
    } catch {
      toast.error('Failed to update stage for some items');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleAnalyzeRisk = async (lead: Lead) => {
    setAiLoading(true);
    try {
      const result = await api.leads.analyzeRisk(lead.id);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const updatedLead = {
        ...lead,
        aiRiskLevel: result.riskLevel,
        aiSummary: result.summary,
        aiRecommendations: result.recommendations?.join('; '),
      };
      setSelectedLead(updatedLead);
      // Update the lead in the main list as well
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? updatedLead : l)),
      );
    } catch (error) {
      console.error('Failed to analyze risk:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!selectedLead) return;

    setSummaryLoading(true);
    try {
      const summary = await apiFetch<typeof aiSummary>(
        `/leads/${selectedLead.id}/summary`,
        { method: 'POST' },
      );
      setAiSummary(summary);
      setSummaryDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      toast.error('Failed to generate AI summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    setIsDeleting(true);
    try {
      await api.leads.delete(selectedLead.id);
      setLeads((prev) =>
        prev.filter((l) => l.id !== selectedLead.id),
      );
      setSelectedLead(null);
      setDeleteDialogOpen(false);
      toast.success('Prospective project deleted');
    } catch {
      toast.error('Failed to delete prospective project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeadUpdated = (updated: Lead) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l)),
    );
    setSelectedLead(updated);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-24" />
              {[...Array(3)].map((_, j) => (
                <Skeleton key={j} className="h-28 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-display tracking-tight">
            Prospective Projects
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            Track and manage your sales pipeline
            {isFetching && !isLoading && (
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground/60" />
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('leads:create') && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2">
              <Plus className="h-4 w-4" />
              Add Prospective Project
            </Button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Likely Start Date:
        </span>
        {yearOptions.map((y) => (
          <Button
            key={y}
            size="sm"
            variant={
              !isCustom && selectedYear === y ? 'default' : 'outline'
            }
            onClick={() => selectYear(y)}>
            {y}
          </Button>
        ))}
        <Button
          size="sm"
          variant={
            !isCustom && selectedYear === null ? 'default' : 'outline'
          }
          onClick={() => selectYear(null)}>
          All
        </Button>
        <span className="text-muted-foreground text-sm mx-1">|</span>
        <DateRangePicker
          value={dateRange}
          onChange={handleDateRange}
          placeholder="Filter by date range"
          numberOfMonths={2}
        />
      </div>

      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUser={currentUser}
        managers={managers}

        allUsers={allUsersArr}
        clients={clients}
        leads={leads}
        onLeadCreated={(newLead) =>
          setLeads((prev) => [newLead, ...prev])
        }
      />

      {/* Pipeline Stats */}
      <PipelineStats leads={filteredLeads} stages={pipelineStages} />

      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {viewMode === 'kanban' ? 'Board View' : 'List View'}
        </h3>
        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2">
            <ListIcon className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {selectedLeads.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/60 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedLeads.length} selected
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                {hasPermission('leads:edit') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setBulkStageDialogOpen(true)}>
                    <ChevronDown className="h-3 w-3" />
                    Assign Stage
                  </Button>
                )}
                {hasPermission('leads:edit') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setBulkRepDialogOpen(true)}>
                    Assign Rep
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={handleExportLeads}>
                  Export
                </Button>
                {hasPermission('leads:delete') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => setBulkDeleteDialogOpen(true)}>
                    <Trash2 className="h-3 w-3" />
                    Delete selected
                  </Button>
                )}
              </div>
            </div>
          )}
          <DataTable
            columns={columns}
            data={filteredLeads}
            globalFilter={true}
            onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
            onSelectionChange={setSelectedLeads}
            filterConfigs={[
              {
                columnId: 'stage',
                title: 'Stage',
                options: [
                  ...new Set(filteredLeads.map((l) => l.stage).filter(Boolean)),
                ].map((v) => ({ label: v!, value: v! })),
              },
              {
                columnId: 'owner',
                title: 'Owner',
                options: [
                  ...new Set(
                    filteredLeads.map(
                      (l) => (l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || 'Unassigned',
                    ),
                  ),
                ].map((v) => ({ label: v, value: v })),
              },
            ]}
          />
        </>
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          mounted={mounted}
          sensors={sensors}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleDragCancel={handleDragCancel}
          activeDragId={activeDragId}
          activeLead={activeLead}
          setSelectedLead={(lead) => { if (lead) router.push(`/leads/${lead.id}`); }}
          stages={pipelineStages}
          stagesLoading={stagesLoading}
        />
      )}

      {/* Lead Detail Dialog removed — detail views are now full pages at /leads/[id] */}

      {/* AI Summary Dialog */}
      <AISummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        summary={aiSummary}
      />

      {/* Close Won Dialog */}
      <CloseWonDialog
        lead={leadToCloseWon}
        open={closeWonDialogOpen}
        onOpenChange={handleCloseWonOpenChange}
        onSuccess={handleCloseWonSuccess}
      />

      {/* Convert Lead Dialog */}
      <ConvertLeadDialog
        key={leadToConvert?.id ?? 'convert-dialog'}
        lead={leadToConvert}
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Selected Prospective Projects
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {selectedLeads.length} prospective project
                {selectedLeads.length !== 1 ? 's' : ''}
              </strong>
              . All associated activities and files will also be
              removed. This action cannot be undone.
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
                `Delete ${selectedLeads.length} item${selectedLeads.length !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Stage Assignment Dialog */}
      <AlertDialog
        open={bulkStageDialogOpen}
        onOpenChange={(open) => {
          setBulkStageDialogOpen(open);
          if (!open) setBulkStage('');
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Select a pipeline stage to assign to{' '}
              <strong>
                {selectedLeads.length} selected item
                {selectedLeads.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <Select value={bulkStage} onValueChange={setBulkStage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a stage..." />
              </SelectTrigger>
              <SelectContent>
                {pipelineStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.name}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkStageAssign}
              disabled={isBulkAssigning || !bulkStage}>
              {isBulkAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Stage'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Assign Rep Dialog */}
      <AlertDialog
        open={bulkRepDialogOpen}
        onOpenChange={(open) => {
          setBulkRepDialogOpen(open);
          if (!open) { setBulkRepId(''); setBulkRepSearch(''); }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Rep</AlertDialogTitle>
            <AlertDialogDescription>
              Select a sales rep to assign to{' '}
              <strong>
                {selectedLeads.length} selected item
                {selectedLeads.length !== 1 ? 's' : ''}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2 space-y-2">
            <input
              type="text"
              placeholder="Search users..."
              value={bulkRepSearch}
              onChange={(e) => setBulkRepSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="max-h-48 overflow-y-auto rounded-md border border-input">
              {managers
                .filter((m) =>
                  m.name.toLowerCase().includes(bulkRepSearch.toLowerCase()),
                )
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setBulkRepId(m.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors ${bulkRepId === m.id ? 'bg-accent font-medium' : ''}`}>
                    {m.name}
                    {m.role && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.role}
                      </span>
                    )}
                  </button>
                ))}
              {managers.filter((m) =>
                m.name.toLowerCase().includes(bulkRepSearch.toLowerCase()),
              ).length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No users found.
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkAssignRep}
              disabled={isBulkAssigningRep || !bulkRepId}>
              {isBulkAssigningRep ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Rep'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lead Confirmation */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Prospective Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>
                {selectedLead?.contactName ||
                  selectedLead?.projectName}
              </strong>{' '}
              ({selectedLead?.company}). All associated activities and
              files will also be removed. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
