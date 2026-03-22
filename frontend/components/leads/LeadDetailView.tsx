'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import type { Lead } from '@/lib/types';
import { api, apiFetch } from '@/lib/api/client';
import { activitiesApi, type Activity as ActivityType } from '@/lib/api/activities-client';
import { filesApi, type FileUpload } from '@/lib/api/files-client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import { ActivityTimeline } from './ActivityTimeline';
import { FileUploadSection } from './FileUploadSection';
import { getProbability, urgencyColor } from './constants';
import { EditLeadDialog } from './EditLeadDialog';
import { CloseWonDialog } from './CloseWonDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LeadDetailHeader } from './LeadDetailHeader';
import { LeadDetailsPanel } from './LeadDetailsPanel';
import { LeadAIAnalysisSection } from './LeadAIAnalysisSection';
import { LeadCustomFields } from './LeadCustomFields';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { LeadContactsSection } from '../contacts/LeadContactsSection';
import { PageBreadcrumbs } from '../layout/PageBreadcrumbs';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface LeadDetailViewProps {
  leadId: string;
  currentUser: { id: string; role: string; name: string };
  initialTab: string;
}


export function LeadDetailView({ leadId, currentUser, initialTab }: LeadDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const activeTab = searchParams.get('tab') || initialTab;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [closeWonDialogOpen, setCloseWonDialogOpen] = useState(false);
  const [leadStages, setLeadStages] = useState<PipelineStage[]>([]);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const loadLeadData = async (signal?: AbortSignal) => {
    try {
      const [leadData, activitiesData, filesData] = await Promise.all([
        apiFetch<Lead>(`/leads/${leadId}`),
        activitiesApi.getActivities(leadId),
        filesApi.getFiles(leadId),
      ]);
      if (signal?.aborted) return;
      setLead(leadData);
      setActivities(activitiesData);
      setFiles(filesData);
      setLoading(false);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Failed to load lead:', error);
      toast.error('Failed to load lead');
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadLeadData(controller.signal);
    return () => controller.abort();
  }, [leadId]);

  useEffect(() => {
    pipelineApi.getStages('prospective_project').then(setLeadStages).catch(console.error);
  }, []);

  const handleStageChange = async (newStage: string) => {
    if (!lead || newStage === lead.stage) return;
    if (newStage === 'Closed Won') {
      setCloseWonDialogOpen(true);
      return;
    }
    setIsUpdatingStage(true);
    try {
      await api.leads.update(lead.id, { stage: newStage });
      setLead({ ...lead, stage: newStage });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Stage updated to ${newStage}`);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleCloseWonSuccess = (updatedLead: Lead, convertToProject: boolean) => {
    setLead(updatedLead);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    if (convertToProject && !updatedLead.convertedToClientId) {
      setConvertDialogOpen(true);
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
    router.replace(`/leads/${leadId}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const handleDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/leads/${lead.id}`, { method: 'DELETE' });
      toast.success('Lead deleted');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      router.push('/leads');
    } catch {
      toast.error('Failed to delete lead');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyzeRisk = async () => {
    if (!lead) return;
    setAiLoading(true);
    try {
      const result = await api.leads.analyzeRisk(lead.id);
      setLead({
        ...lead,
        aiRiskLevel: result.riskLevel,
        aiSummary: result.summary,
        aiRecommendations: result.recommendations?.join('; '),
      });
    } catch {
      toast.error('Failed to analyze risk');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!lead) return;
    setSummaryLoading(true);
    try {
      const summary = await apiFetch<{ summary: string; recommendations: string[] }>(
        `/leads/${lead.id}/summary`,
        { method: 'POST' },
      );
      setLead({
        ...lead,
        aiSummary: summary.summary,
        aiRecommendations: summary.recommendations?.join('; '),
      });
    } catch {
      toast.error('Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <button onClick={() => router.push('/leads')} className="text-primary underline text-sm">
          Back to Leads
        </button>
      </div>
    );
  }

  const probability = getProbability(lead.stage, leadStages);
  const daysInPipeline = lead.metrics?.daysInPipeline ?? 0;
  const daysSinceContact = lead.metrics?.daysSinceLastContact ?? 0;
  const activityCount = lead.metrics?.activityCount ?? 0;
  const fileCount = lead.metrics?.fileCount ?? 0;
  const stale = daysSinceContact > 14;
  const isOverdue = lead.likelyStartDate && lead.stage !== 'Closed Won' && lead.stage !== 'Won' && lead.stage !== 'Closed Lost' && lead.stage !== 'Lost' && new Date(lead.likelyStartDate) < new Date();
  const isWon = lead.stage === 'Closed Won' || lead.stage === 'Won';
  const isConverted = !!lead.convertedToClientId;
  const accentColor = urgencyColor(lead.urgency);
  const companyOrName = lead.company || lead.contactName || 'Unknown';

  const getTimingBadge = () => {
    if (!lead.likelyStartDate) return null;
    const expected = new Date(lead.likelyStartDate);
    const now = new Date();
    const closed = lead.dealClosedAt ? new Date(lead.dealClosedAt) : null;
    if (isWon && closed && closed <= expected) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" /> On Time</span>;
    }
    if (isWon && closed && closed > expected) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" /> Late Start</span>;
    }
    if (!closed && lead.stage !== 'Won' && lead.stage !== 'Lost' && expected < now) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" /> Overdue</span>;
    }
    return null;
  };

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'quotes', label: 'Quotes' },
    { value: 'documents', label: `Documents${fileCount > 0 ? ` (${fileCount})` : ''}` },
    { value: 'fields', label: 'Custom Fields' },
  ];

  return (
    <div className="flex flex-col h-full -mb-4 md:-mb-8">
      <div className="mb-4">
        <PageBreadcrumbs
          items={[
            { label: 'Leads', href: '/leads' },
            { label: lead.projectName || lead.contactName || 'Lead' },
          ]}
        />
      </div>

      <LeadDetailHeader
        lead={lead}
        companyOrName={companyOrName}
        accentColor={accentColor}
        probability={probability}
        timingBadge={getTimingBadge()}
        stale={stale}
        daysInPipeline={daysInPipeline}
        daysSinceContact={daysSinceContact}
        activityCount={activityCount}
        fileCount={fileCount}
        canEdit={hasPermission('leads:edit')}
        canDelete={hasPermission('leads:delete')}
        stages={leadStages}
        isUpdatingStage={isUpdatingStage}
        onStageChange={handleStageChange}
        onEdit={() => setIsEditOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
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

            {/* Overview */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {isWon && (
                isConverted ? (
                  <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/60 rounded-xl">
                    <div>
                      <p className="font-semibold text-[13px]">Converted to Project</p>
                      <p className="text-[12px] text-muted-foreground">This prospective project has been converted</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => router.push('/projects')} className="gap-1.5 text-[12px]">
                      View Projects <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : hasPermission('clients:convert') ? (
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
                    <div>
                      <p className="font-semibold text-[13px] text-emerald-900">Ready to convert</p>
                      <p className="text-[12px] text-emerald-700">Create an active project from this lead</p>
                    </div>
                    <Button size="sm" onClick={() => setConvertDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-[12px]">
                      Convert <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null
              )}

              <LeadAIAnalysisSection
                lead={lead}
                hasAnalyzePermission={hasPermission('leads:analyze')}
                aiLoading={aiLoading}
                summaryLoading={summaryLoading}
                onGenerateSummary={handleGenerateAISummary}
                onAnalyzeRisk={handleAnalyzeRisk}
              />

              <hr className="border-border/40" />

              {/* Details + Timeline */}
              <LeadDetailsPanel lead={lead} isOverdue={!!isOverdue} />

              <hr className="border-border/40" />

              <ActivityTimeline
                leadId={lead.id}
                activities={activities}
                currentUserId={currentUser.id}
                onActivityAdded={() => loadLeadData()}
              />
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="mt-0">
              {lead.clientId && (
                <LeadContactsSection leadId={lead.id} clientId={lead.clientId} canEdit={hasPermission('leads:edit')} />
              )}
            </TabsContent>

            {/* Tasks */}
            <TabsContent value="tasks" className="mt-0">
              <LinkedTasksSection entityType="LEAD" entityId={lead.id} />
            </TabsContent>

            {/* Quotes */}
            <TabsContent value="quotes" className="mt-0">
              <LinkedQuotesSection leadId={lead.id} />
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents" className="mt-0">
              <FileUploadSection leadId={lead.id} files={files} currentUserId={currentUser.id} onFilesChanged={() => loadLeadData()} />
            </TabsContent>

            {/* Custom Fields */}
            <TabsContent value="fields" className="mt-0">
              <LeadCustomFields leadId={lead.id} />
            </TabsContent>

        </div>
      </Tabs>

      {/* Edit Dialog */}
      {lead && (
        <EditLeadDialog
          lead={lead}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          currentUser={currentUser}
          onLeadUpdated={(updated) => {
            setLead(updated);
          }}
        />
      )}

      {/* Close Won Dialog */}
      <CloseWonDialog
        lead={lead}
        open={closeWonDialogOpen}
        onOpenChange={setCloseWonDialogOpen}
        onSuccess={handleCloseWonSuccess}
      />

      {/* Convert Dialog */}
      {lead && isWon && !isConverted && (
        <ConvertLeadDialog
          lead={lead}
          open={convertDialogOpen}
          onOpenChange={(open) => {
            setConvertDialogOpen(open);
            if (!open) loadLeadData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{lead?.contactName || lead?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

