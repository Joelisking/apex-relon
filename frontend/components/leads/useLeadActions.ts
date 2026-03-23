'use client';

import { useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Lead } from '@/lib/types';
import { api, apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';

interface AISummary {
  summary: string;
  insights: string[];
  nextActions: string[];
  metrics: { daysInPipeline: number; daysSinceLastContact: number; activityCount: number; fileCount: number };
}

interface UseLeadActionsParams {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  queryClient: QueryClient;
}

export function useLeadActions({ leads, setLeads, queryClient }: UseLeadActionsParams) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);

  // Single delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk actions
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStageDialogOpen, setBulkStageDialogOpen] = useState(false);
  const [bulkStage, setBulkStage] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkRepDialogOpen, setBulkRepDialogOpen] = useState(false);
  const [bulkRepId, setBulkRepId] = useState('');
  const [bulkRepSearch, setBulkRepSearch] = useState('');
  const [isBulkAssigningRep, setIsBulkAssigningRep] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const handleExportLeads = () => {
    if (selectedLeads.length === 0) return;
    const headers = ['Name', 'Company', 'Stage', 'Expected Value', 'Source', 'Assigned To'];
    const rows = selectedLeads.map((l) => [
      l.contactName || '', l.company || '', l.stage || '', l.expectedValue ?? '',
      l.source || '', (l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedLeads.length} prospective project${selectedLeads.length !== 1 ? 's' : ''}`);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    setIsDeleting(true);
    try {
      await api.leads.delete(selectedLead.id);
      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
      setSelectedLead(null);
      setDeleteDialogOpen(false);
      toast.success('Prospective project deleted');
    } catch {
      toast.error('Failed to delete prospective project');
    } finally {
      setIsDeleting(false);
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
      toast.success(`${selectedLeads.length} prospective project${selectedLeads.length !== 1 ? 's' : ''} deleted`);
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
      await api.leads.bulkUpdate(selectedLeads.map((l) => l.id), { stage: bulkStage });
      setLeads((prev) => prev.map((l) => selectedLeads.some((s) => s.id === l.id) ? { ...l, stage: bulkStage } : l));
      setSelectedLeads([]);
      setBulkStageDialogOpen(false);
      setBulkStage('');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Stage updated for ${selectedLeads.length} item${selectedLeads.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to update stage for some items');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleBulkAssignRep = async () => {
    if (selectedLeads.length === 0 || !bulkRepId) return;
    setIsBulkAssigningRep(true);
    try {
      await api.leads.bulkUpdate(selectedLeads.map((l) => l.id), { assignedToId: bulkRepId });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads([]);
      setBulkRepDialogOpen(false);
      setBulkRepId('');
      toast.success(`Rep assigned for ${selectedLeads.length} item${selectedLeads.length !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to assign rep to some items');
    } finally {
      setIsBulkAssigningRep(false);
    }
  };

  const handleAnalyzeRisk = async (lead: Lead) => {
    setAiLoading(true);
    try {
      const result = await api.leads.analyzeRisk(lead.id);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      const updatedLead = { ...lead, aiRiskLevel: result.riskLevel, aiSummary: result.summary, aiRecommendations: result.recommendations?.join('; ') };
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => l.id === lead.id ? updatedLead : l));
    } catch (error) {
      console.error('Failed to analyze risk:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAISummary = async (leadId: string) => {
    setSummaryLoading(true);
    try {
      const summary = await apiFetch<AISummary>(`/leads/${leadId}/summary`, { method: 'POST' });
      setAiSummary(summary);
      setSummaryDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      toast.error('Failed to generate AI summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  return {
    // Selected state
    selectedLead, setSelectedLead,
    selectedLeads, setSelectedLeads,
    // Single delete
    deleteDialogOpen, setDeleteDialogOpen,
    isDeleting,
    handleDeleteLead,
    // Bulk delete
    bulkDeleteDialogOpen, setBulkDeleteDialogOpen,
    isBulkDeleting,
    handleBulkDelete,
    // Bulk stage
    bulkStageDialogOpen, setBulkStageDialogOpen,
    bulkStage, setBulkStage,
    isBulkAssigning,
    handleBulkStageAssign,
    // Bulk rep
    bulkRepDialogOpen, setBulkRepDialogOpen,
    bulkRepId, setBulkRepId,
    bulkRepSearch, setBulkRepSearch,
    isBulkAssigningRep,
    handleBulkAssignRep,
    // Export
    handleExportLeads,
    // AI
    aiLoading,
    aiSummary,
    summaryDialogOpen, setSummaryDialogOpen,
    summaryLoading,
    handleAnalyzeRisk,
    handleGenerateAISummary,
  };
}
