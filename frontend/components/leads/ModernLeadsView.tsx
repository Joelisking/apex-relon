'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePresetFilter } from '@/components/ui/date-preset-filter';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Search, Plus, LayoutGrid, List as ListIcon, RefreshCw, Trash2, ChevronDown } from 'lucide-react';
import type { Lead } from '@/lib/types';
import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { api } from '@/lib/api/client';
import { CreateLeadDialog } from './CreateLeadDialog';
import { AISummaryDialog } from './AISummaryDialog';
import { CloseWonDialog } from './CloseWonDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { useAuth } from '@/contexts/auth-context';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './columns';
import { PipelineStats } from './PipelineStats';
import { KanbanBoard } from './KanbanBoard';
import { BulkDeleteDialog, BulkStageDialog, BulkRepDialog, LeadDeleteDialog } from './BulkActionDialogs';
import { useLeadsData } from './useLeadsData';
import { useLeadFilters } from './useLeadFilters';
import { useLeadActions } from './useLeadActions';

interface ModernLeadsViewProps {
  currentUser: { id: string; role: string; name?: string };
}

export default function ModernLeadsView({ currentUser }: ModernLeadsViewProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canMoveStage = hasPermission('leads:move_stage');

  const {
    leads, setLeads, managers, clients, allUsersArr, pipelineStages,
    stagesLoading, isLoading, isFetching, mounted, queryClient,
  } = useLeadsData();

  const {
    createdFilter, setCreatedFilter, startFilter, setStartFilter,
    searchQuery, setSearchQuery, facets, setFacet, clearAllFilters,
    filteredLeads, isFiltered, leadFilterDefs,
  } = useLeadFilters(leads);

  const actions = useLeadActions({ leads, setLeads, queryClient });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [closeWonDialogOpen, setCloseWonDialogOpen] = useState(false);
  const [leadToCloseWon, setLeadToCloseWon] = useState<Lead | null>(null);
  const [pendingWonRevert, setPendingWonRevert] = useState<Lead[] | null>(null);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('leads:viewMode');
      if (stored === 'kanban' || stored === 'table') return stored;
    }
    return canMoveStage ? 'kanban' : 'table';
  });

  useEffect(() => {
    localStorage.setItem('leads:viewMode', viewMode);
  }, [viewMode]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeLead = activeDragId ? leads.find((l) => l.id === activeDragId) || null : null;

  // ── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as string;
    const lead = leads.find((l) => l.id === leadId);
    const oldLeads = [...leads];
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));

    if (newStage === 'Closed Won') {
      if (lead) {
        setPendingWonRevert(oldLeads);
        setLeadToCloseWon({ ...lead, stage: 'Won' });
        setCloseWonDialogOpen(true);
      }
    } else {
      api.leads.update(leadId, { stage: newStage }).catch(() => setLeads(oldLeads));
    }
  };

  const handleDragCancel = () => setActiveDragId(null);

  const handleCloseWonOpenChange = (open: boolean) => {
    if (!open && pendingWonRevert) {
      setLeads(pendingWonRevert);
      setPendingWonRevert(null);
    }
    setCloseWonDialogOpen(open);
  };

  const handleCloseWonSuccess = (updatedLead: Lead) => {
    setPendingWonRevert(null);
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? updatedLead : l));
    if (!updatedLead.convertedToClientId) {
      setLeadToConvert(updatedLead);
      setConvertDialogOpen(true);
    }
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
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-24" />
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-28 rounded-lg" />)}
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
          <h2 className="text-3xl font-display tracking-tight">Prospective Projects</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            Track and manage your sales pipeline
            {isFetching && !isLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
          </p>
        </div>
        {hasPermission('leads:create') && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />Add Prospective Project
          </Button>
        )}
      </div>

      {/* Unified filter rail */}
      <div className="flex flex-col gap-2 rounded-xl border bg-card/60 px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search prospective projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 w-[180px] lg:w-[220px] bg-muted/50 border-0 focus-visible:ring-1 text-sm"
            />
          </div>
          <div className="h-5 w-px bg-border/60 shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">Added:</span>
          <DatePresetFilter value={createdFilter} onChange={setCreatedFilter} label="All time" />
          <span className="text-muted-foreground/30 text-sm shrink-0">·</span>
          <span className="text-xs text-muted-foreground shrink-0">Start date:</span>
          <DatePresetFilter value={startFilter} onChange={setStartFilter} label="All time" />
          {isFiltered && (
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{filteredLeads.length} of {leads.length}</span>
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                Clear all
              </Button>
            </div>
          )}
        </div>
        <FilterBar filters={leadFilterDefs} values={facets} onChange={setFacet} onClear={() => setFacet('', [])} />
      </div>

      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        currentUser={currentUser}
        managers={managers}
        allUsers={allUsersArr}
        clients={clients}
        leads={leads}
        onLeadCreated={(newLead) => setLeads((prev) => [newLead, ...prev])}
      />

      {canMoveStage && hasPermission('leads:view_all') && (
        <PipelineStats leads={filteredLeads} stages={pipelineStages} />
      )}

      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{viewMode === 'kanban' ? 'Board View' : 'List View'}</h3>
        {canMoveStage && (
          <div className="flex items-center border rounded-lg p-1">
            <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="gap-2">
              <LayoutGrid className="h-4 w-4" />Board
            </Button>
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="gap-2">
              <ListIcon className="h-4 w-4" />List
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'table' ? (
        <>
          {actions.selectedLeads.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border/60 rounded-lg">
              <span className="text-sm text-muted-foreground">{actions.selectedLeads.length} selected</span>
              <div className="flex items-center gap-1.5 ml-2">
                {hasPermission('leads:edit') && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => actions.setBulkStageDialogOpen(true)}>
                    <ChevronDown className="h-3 w-3" />Assign Stage
                  </Button>
                )}
                {hasPermission('leads:edit') && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => actions.setBulkRepDialogOpen(true)}>
                    Assign Rep
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={actions.handleExportLeads}>
                  Export
                </Button>
                {hasPermission('leads:delete') && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive" onClick={() => actions.setBulkDeleteDialogOpen(true)}>
                    <Trash2 className="h-3 w-3" />Delete selected
                  </Button>
                )}
              </div>
            </div>
          )}
          <DataTable
            columns={columns}
            data={filteredLeads}
            onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
            onSelectionChange={actions.setSelectedLeads}
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

      <AISummaryDialog open={actions.summaryDialogOpen} onOpenChange={actions.setSummaryDialogOpen} summary={actions.aiSummary} />
      <CloseWonDialog lead={leadToCloseWon} open={closeWonDialogOpen} onOpenChange={handleCloseWonOpenChange} onSuccess={handleCloseWonSuccess} />
      <ConvertLeadDialog key={leadToConvert?.id ?? 'convert-dialog'} lead={leadToConvert} open={convertDialogOpen} onOpenChange={setConvertDialogOpen} />

      <BulkDeleteDialog
        open={actions.bulkDeleteDialogOpen}
        onOpenChange={actions.setBulkDeleteDialogOpen}
        selectedCount={actions.selectedLeads.length}
        isDeleting={actions.isBulkDeleting}
        onConfirm={actions.handleBulkDelete}
      />
      <BulkStageDialog
        open={actions.bulkStageDialogOpen}
        onOpenChange={(open) => { actions.setBulkStageDialogOpen(open); if (!open) actions.setBulkStage(''); }}
        selectedCount={actions.selectedLeads.length}
        bulkStage={actions.bulkStage}
        onStageChange={actions.setBulkStage}
        isAssigning={actions.isBulkAssigning}
        onConfirm={actions.handleBulkStageAssign}
        pipelineStages={pipelineStages}
      />
      <BulkRepDialog
        open={actions.bulkRepDialogOpen}
        onOpenChange={(open) => { actions.setBulkRepDialogOpen(open); if (!open) { actions.setBulkRepId(''); actions.setBulkRepSearch(''); } }}
        selectedCount={actions.selectedLeads.length}
        managers={managers}
        bulkRepId={actions.bulkRepId}
        onRepSelect={actions.setBulkRepId}
        bulkRepSearch={actions.bulkRepSearch}
        onSearchChange={actions.setBulkRepSearch}
        isAssigning={actions.isBulkAssigningRep}
        onConfirm={actions.handleBulkAssignRep}
      />
      <LeadDeleteDialog
        open={actions.deleteDialogOpen}
        onOpenChange={actions.setDeleteDialogOpen}
        lead={actions.selectedLead}
        isDeleting={actions.isDeleting}
        onConfirm={actions.handleDeleteLead}
      />
    </div>
  );
}
