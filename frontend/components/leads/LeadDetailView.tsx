'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Trash2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
  Activity,
  FileText,
  TrendingUp,
  ArrowRight,
  Pencil,
  Mail,
  ChevronDown,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import type { Lead, ServiceType } from '@/lib/types';
import { api, apiFetch, leadsApi } from '@/lib/api/client';
import { activitiesApi, type Activity as ActivityType } from '@/lib/api/activities-client';
import { filesApi, type FileUpload } from '@/lib/api/files-client';
import { customFieldsApi } from '@/lib/api/custom-fields-client';
import { ActivityTimeline } from './ActivityTimeline';
import { FileUploadSection } from './FileUploadSection';
import { StageTimeline } from './StageTimeline';
import { getProbability } from './constants';
import { EditLeadDialog } from './EditLeadDialog';
import { ConvertLeadDialog } from './ConvertLeadDialog';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { LeadContactsSection } from '../contacts/LeadContactsSection';
import { PageBreadcrumbs } from '../layout/PageBreadcrumbs';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeadDetailViewProps {
  leadId: string;
  currentUser: { id: string; role: string; name: string };
  initialTab: string;
}

const URGENCY_HEX: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

function urgencyColor(urgency?: string | null): string {
  if (!urgency) return URGENCY_HEX.Low;
  return (
    URGENCY_HEX[urgency] ??
    URGENCY_HEX[urgency.charAt(0).toUpperCase() + urgency.slice(1).toLowerCase()] ??
    URGENCY_HEX.Low
  );
}

const RISK_CHIP: Record<string, string> = {
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return v.toLocaleString();
}

function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/80 font-semibold mb-3">
      {children}
    </p>
  );
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground/60 font-medium shrink-0 mt-0.5">{label}</span>
      <div className="text-[12px] font-medium text-right">{children}</div>
    </div>
  );
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
  const [aiLoading, setAiLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [draftEmailLoading, setDraftEmailLoading] = useState(false);
  const [draftEmail, setDraftEmail] = useState<{ subject: string; body: string; tone: string } | null>(null);
  const [draftEmailOpen, setDraftEmailOpen] = useState(false);

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

  const handleDraftEmail = async (emailType: string) => {
    if (!lead) return;
    setDraftEmailLoading(true);
    try {
      const draft = await leadsApi.draftEmail(lead.id, emailType);
      setDraftEmail(draft);
      setDraftEmailOpen(true);
    } catch {
      toast.error('Failed to draft email');
    } finally {
      setDraftEmailLoading(false);
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

  const probability = getProbability(lead.stage);
  const daysInPipeline = lead.metrics?.daysInPipeline ?? 0;
  const daysSinceContact = lead.metrics?.daysSinceLastContact ?? 0;
  const activityCount = lead.metrics?.activityCount ?? 0;
  const fileCount = lead.metrics?.fileCount ?? 0;
  const stale = daysSinceContact > 14;
  const isOverdue = lead.likelyStartDate && lead.stage !== 'Won' && lead.stage !== 'Lost' && new Date(lead.likelyStartDate) < new Date();
  const isWon = lead.stage === 'Won';
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
    <>
      <div className="mb-4">
        <PageBreadcrumbs
          items={[
            { label: 'Leads', href: '/leads' },
            { label: lead.projectName || lead.contactName || 'Lead' },
          ]}
        />
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-10rem)]">
        {/* ─── SIDEBAR ─── */}
        <div className="w-80 shrink-0">
          <div className="sticky top-4 border rounded-xl bg-card overflow-hidden">
            {/* Accent strip */}
            <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />

            {/* Header */}
            <div className="px-5 pt-4 pb-4 border-b border-border/50">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold border border-border/60"
                  style={{ fontSize: '13px' }}>
                  {avatarInitials(companyOrName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-semibold leading-snug">
                    {lead.contactName || lead.name}
                  </h2>
                  <p className="text-[12px] text-muted-foreground truncate">{lead.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1 bg-secondary border border-border/60">
                  {lead.stage}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">{probability}%</span>
                {getTimingBadge()}
              </div>
            </div>

            {/* Financials */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Financials</SectionLabel>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium mb-0.5">Expected</p>
                  <p className="text-[18px] font-bold tabular-nums leading-none">${fmtVal(lead.expectedValue || 0)}</p>
                </div>
                {lead.contractedValue != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium mb-0.5">Contracted</p>
                    <p className="text-[18px] font-bold tabular-nums leading-none text-emerald-700">${fmtVal(lead.contractedValue)}</p>
                  </div>
                )}
              </div>
              {lead.contractedValue != null && lead.expectedValue != null && (() => {
                const diff = lead.contractedValue - (lead.expectedValue || 0);
                const isPositive = diff >= 0;
                const pct = lead.expectedValue ? Math.round((diff / lead.expectedValue) * 100) : 0;
                return (
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
                    {isPositive ? '+' : ''}${Math.abs(diff).toLocaleString()} vs expected ({isPositive ? '+' : ''}{pct}%)
                  </span>
                );
              })()}
            </div>

            {/* Details */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Details</SectionLabel>
              <div>
                {lead.projectName && <StatRow label="Project"><span className="text-xs">{lead.projectName}</span></StatRow>}
                <StatRow label="Source"><span className="text-xs">{lead.source}</span></StatRow>
                {lead.serviceType && <StatRow label="Service"><span className="text-xs">{lead.serviceType.name}</span></StatRow>}
                <StatRow label="Owner">
                  <span className="text-xs flex items-center gap-1 justify-end">
                    <User className="h-3 w-3 text-muted-foreground/50" />
                    {lead.assignedTo?.name || 'Unassigned'}
                  </span>
                </StatRow>
                {lead.teamMembers && lead.teamMembers.length > 0 && (
                  <StatRow label="Team"><span className="text-xs">{lead.teamMembers.map((tm) => tm.user.name).join(', ')}</span></StatRow>
                )}
                <StatRow label="Urgency">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ color: accentColor, backgroundColor: `${accentColor}15` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    {lead.urgency}
                  </span>
                </StatRow>
                {lead.aiRiskLevel && (
                  <StatRow label="AI Risk">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${RISK_CHIP[lead.aiRiskLevel] ?? RISK_CHIP.Low}`}>
                      {lead.aiRiskLevel}
                    </span>
                  </StatRow>
                )}
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="px-5 py-4 border-b border-border/50">
                <SectionLabel>Notes</SectionLabel>
                <p className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}

            {/* Timeline */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Timeline</SectionLabel>
              <div>
                {lead.createdAt && (
                  <StatRow label="Created">
                    <span className="text-xs tabular-nums">{new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </StatRow>
                )}
                {lead.likelyStartDate && (
                  <StatRow label="Likely Start">
                    <span className={`text-xs tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                      {new Date(lead.likelyStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </StatRow>
                )}
                {lead.dealClosedAt && (
                  <StatRow label="Closed">
                    <span className="text-[11px] tabular-nums">{new Date(lead.dealClosedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </StatRow>
                )}
              </div>
            </div>

            {/* Pulse */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Pulse</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Pipeline', value: `${daysInPipeline}d`, icon: Clock, alert: false },
                  { label: 'Last Contact', value: `${daysSinceContact}d`, icon: Activity, alert: stale },
                  { label: 'Activities', value: activityCount, icon: TrendingUp, alert: false },
                  { label: 'Files', value: fileCount, icon: FileText, alert: false },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className={`rounded-lg px-3 py-2.5 text-center border ${m.alert ? 'bg-amber-50/60 border-amber-200/60' : 'bg-muted/30 border-border/40'}`}>
                      <p className={`text-[18px] font-bold tabular-nums leading-none mb-1 ${m.alert ? 'text-amber-700' : 'text-foreground'}`}>{m.value}</p>
                      <div className="flex items-center justify-center gap-0.5 text-[10px] text-muted-foreground">
                        <Icon className="h-2.5 w-2.5 shrink-0" />
                        {m.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Timeline */}
            <div className="px-5 py-4 border-b border-border/50">
              <StageTimeline lead={lead} />
            </div>

            {/* Actions */}
            <div className="px-5 py-4 space-y-1">
              {hasPermission('leads:edit') && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(true)} className="w-full justify-start gap-2 text-xs">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {hasPermission('leads:delete') && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteDialogOpen(true)} className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b border-border/40 mb-6">
              <TabsList className="h-9 bg-transparent p-0 gap-1">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-8 px-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

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

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> AI Analysis
                  </h3>
                  <div className="flex gap-1.5">
                    {hasPermission('leads:analyze') && (
                      <>
                        <Button variant="outline" size="sm" onClick={handleGenerateAISummary} disabled={summaryLoading} className="h-7 text-xs px-2.5">
                          {summaryLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Summary
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleAnalyzeRisk} disabled={aiLoading} className="h-7 text-xs px-2.5">
                          {aiLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />} Risk Analysis
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={draftEmailLoading} className="h-7 text-xs px-2.5">
                              <Mail className="h-3 w-3 mr-1" />
                              {draftEmailLoading ? 'Drafting...' : 'Draft Email'}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {['follow-up', 'introduction', 'proposal', 'check-in', 'closing'].map((type) => (
                              <DropdownMenuItem key={type} onClick={() => handleDraftEmail(type)}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>

                {lead.aiSummary && (
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-3.5 text-[13px] text-foreground/80 leading-relaxed">
                    {lead.aiSummary}
                  </div>
                )}
                {lead.aiRecommendations && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.06em] font-semibold text-muted-foreground/60">Recommendations</p>
                    <div className="space-y-1.5">
                      {lead.aiRecommendations.split(';').map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-[13px]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground mt-0.5">{i + 1}</span>
                          <span className="text-muted-foreground leading-snug">{rec.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {draftEmailOpen && draftEmail && (
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Drafted Email</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{draftEmail.tone}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`Subject: ${draftEmail.subject}\n\n${draftEmail.body}`); toast.success('Copied to clipboard'); }}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Subject</p>
                      <p className="text-sm font-medium">{draftEmail.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Body</p>
                      <p className="text-sm whitespace-pre-wrap">{draftEmail.body}</p>
                    </div>
                  </div>
                )}
              </section>

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
          </Tabs>
        </div>
      </div>

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
    </>
  );
}

// ── Lead Custom Fields sub-component ──────────────────────────────────────
function LeadCustomFields({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});

  const { data: definitions = [] } = useQuery({
    queryKey: ['custom-field-definitions', 'LEAD'],
    queryFn: () => customFieldsApi.getDefinitions('LEAD'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: values } = useQuery({
    queryKey: ['custom-field-values', 'LEAD', leadId],
    queryFn: () => customFieldsApi.getValues('LEAD', leadId),
    staleTime: 2 * 60 * 1000,
    enabled: definitions.length > 0,
  });

  const customValues = useMemo(() => {
    const base: Record<string, string> = {};
    if (values) {
      Object.values(values).forEach((v) => {
        base[v.definitionId] = v.value != null ? String(v.value) : '';
      });
    }
    return { ...base, ...localEdits };
  }, [values, localEdits]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const fields = definitions.map((def) => {
        const raw = customValues[def.id] ?? '';
        let value: string | number | boolean | string[] | null = raw || null;
        if (def.fieldType === 'NUMBER') { const n = parseFloat(raw); value = raw !== '' && !isNaN(n) ? n : null; }
        else if (def.fieldType === 'BOOLEAN') { value = raw === 'true'; }
        else if (def.fieldType === 'MULTI_SELECT') { value = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : null; }
        return { definitionId: def.id, value };
      });
      return customFieldsApi.setValues('LEAD', leadId, fields);
    },
    onSuccess: () => {
      toast.success('Custom fields saved');
      setLocalEdits({});
      queryClient.invalidateQueries({ queryKey: ['custom-field-values', 'LEAD', leadId] });
    },
    onError: () => toast.error('Failed to save custom fields'),
  });

  const activeDefinitions = definitions.filter((d) => d.isActive);
  if (activeDefinitions.length === 0) return null;

  return (
    <section className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5" /> Custom Fields
      </h3>
      <div className="space-y-3">
        {activeDefinitions.map((def) => {
          const currentVal = customValues[def.id] ?? '';
          return (
            <div key={def.id} className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground/80">
                {def.label}
                {def.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              {def.fieldType === 'TEXT' && <Input value={currentVal} onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))} className="h-8 text-sm" placeholder={def.label} />}
              {def.fieldType === 'NUMBER' && <Input type="number" value={currentVal} onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))} className="h-8 text-sm" placeholder="0" />}
              {def.fieldType === 'DATE' && <DatePicker value={currentVal} onChange={(v) => setLocalEdits((p) => ({ ...p, [def.id]: v }))} className="h-8 text-sm" />}
              {def.fieldType === 'SELECT' && (
                <Select value={currentVal || '__none__'} onValueChange={(v) => setLocalEdits((p) => ({ ...p, [def.id]: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(def.options ?? []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {def.fieldType === 'BOOLEAN' && (
                <div className="flex items-center gap-2">
                  <Checkbox id={`cf-lead-${def.id}`} checked={currentVal === 'true'} onCheckedChange={(checked) => setLocalEdits((p) => ({ ...p, [def.id]: checked ? 'true' : 'false' }))} />
                  <label htmlFor={`cf-lead-${def.id}`} className="text-sm text-muted-foreground cursor-pointer">{def.label}</label>
                </div>
              )}
              {def.fieldType === 'MULTI_SELECT' && (
                <div className="flex flex-wrap gap-1.5">
                  {(def.options ?? []).map((opt) => {
                    const selected = currentVal.split(',').map((s) => s.trim()).filter(Boolean).includes(opt);
                    return (
                      <button key={opt} type="button" onClick={() => {
                        const current = currentVal.split(',').map((s) => s.trim()).filter(Boolean);
                        const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                        setLocalEdits((p) => ({ ...p, [def.id]: next.join(',') }));
                      }} className={cn('text-xs px-2 py-1 rounded border transition-colors', selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50')}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
              {def.fieldType === 'URL' && <Input type="url" value={currentVal} onChange={(e) => setLocalEdits((p) => ({ ...p, [def.id]: e.target.value }))} className="h-8 text-sm" placeholder="https://" />}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-7 text-xs px-3 gap-1.5">
          {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save Custom Fields
        </Button>
      </div>
    </section>
  );
}
