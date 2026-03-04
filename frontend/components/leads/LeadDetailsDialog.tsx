'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
  Activity,
  FileText,
  TrendingUp,
  ArrowRight,
  Users,
  Plus,
  Phone,
  Mail,
  Pencil,
  ChevronDown,
  Copy,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Lead, LeadRep, ServiceType } from '@/lib/types';
import type { Activity as ActivityType } from '@/lib/api/activities-client';
import type { FileUpload } from '@/lib/api/files-client';
import { leadsApi } from '@/lib/api/client';
import { customFieldsApi } from '@/lib/api/custom-fields-client';
import { ActivityTimeline } from './ActivityTimeline';
import { FileUploadSection } from './FileUploadSection';
import { StageTimeline } from './StageTimeline';
import { getProbability } from './constants';
import { EditLeadDialog } from './EditLeadDialog';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { LeadContactsSection } from '../contacts/LeadContactsSection';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  name: string;
  teamName?: string;
}

interface ClientOption {
  id: string;
  name: string;
  segment?: string;
}

interface LeadDetailsDialogProps {
  selectedLead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { id: string; role: string };
  files: FileUpload[];
  loadFiles: (leadId: string) => void;
  setDeleteDialogOpen: (open: boolean) => void;
  setConvertDialogOpen: (open: boolean) => void;
  setLeadToConvert: (lead: Lead) => void;
  handleGenerateAISummary: () => void;
  handleAnalyzeRisk: (lead: Lead) => void;
  aiLoading: boolean;
  summaryLoading: boolean;
  activities: ActivityType[];
  hasPermission: (permission: string) => boolean;
  onActivitiesChanged: () => void;
  // Edit support
  managers?: UserOption[];
  serviceTypes?: ServiceType[];
  designers?: UserOption[];
  qsUsers?: UserOption[];
  clients?: ClientOption[];
  leads?: Lead[];
  onLeadUpdated?: (lead: Lead) => void;
}

// Urgency → hex for sidebar accent strip
const URGENCY_HEX: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

const RISK_CHIP: Record<string, string> = {
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
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
    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/80 font-semibold mb-3">
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
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/30 last:border-0">
      <span className="text-[11px] text-muted-foreground/60 font-medium shrink-0 mt-0.5">
        {label}
      </span>
      <div className="text-[12px] font-medium text-right">
        {children}
      </div>
    </div>
  );
}

export function LeadDetailsDialog({
  selectedLead,
  open,
  onOpenChange,
  currentUser,
  files,
  loadFiles,
  setDeleteDialogOpen,
  setConvertDialogOpen,
  setLeadToConvert,
  handleGenerateAISummary,
  handleAnalyzeRisk,
  aiLoading,
  summaryLoading,
  activities,
  hasPermission,
  onActivitiesChanged,
  managers = [],
  serviceTypes = [],
  designers = [],
  qsUsers = [],
  clients = [],
  leads = [],
  onLeadUpdated,
}: LeadDetailsDialogProps) {
  const [reps, setReps] = useState<LeadRep[]>([]);
  const [addingRep, setAddingRep] = useState(false);
  const [newRep, setNewRep] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [editingRepId, setEditingRepId] = useState<string | null>(
    null,
  );
  const [editRepData, setEditRepData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [repLoading, setRepLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draftEmailLoading, setDraftEmailLoading] = useState(false);
  const [draftEmail, setDraftEmail] = useState<{
    subject: string;
    body: string;
    tone: string;
  } | null>(null);
  const [draftEmailOpen, setDraftEmailOpen] = useState(false);

  useEffect(() => {
    setReps(selectedLead?.reps || []);
    setAddingRep(false);
    setEditingRepId(null);
  }, [selectedLead?.id]);

  const handleAddRep = async () => {
    if (!selectedLead || !newRep.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setRepLoading(true);
    try {
      const created = await leadsApi.createRep(selectedLead.id, {
        name: newRep.name.trim(),
        phone: newRep.phone.trim() || undefined,
        email: newRep.email.trim() || undefined,
      });
      setReps((prev) => [...prev, created]);
      setNewRep({ name: '', phone: '', email: '' });
      setAddingRep(false);
      toast.success('Rep added');
    } catch {
      toast.error('Failed to add rep');
    } finally {
      setRepLoading(false);
    }
  };

  const handleSaveRep = async (repId: string) => {
    if (!selectedLead) return;
    setRepLoading(true);
    try {
      const updated = await leadsApi.updateRep(
        selectedLead.id,
        repId,
        {
          name: editRepData.name.trim(),
          phone: editRepData.phone.trim() || undefined,
          email: editRepData.email.trim() || undefined,
        },
      );
      setReps((prev) =>
        prev.map((r) => (r.id === repId ? updated : r)),
      );
      setEditingRepId(null);
      toast.success('Rep updated');
    } catch {
      toast.error('Failed to update rep');
    } finally {
      setRepLoading(false);
    }
  };

  const handleDeleteRep = async (repId: string) => {
    if (!selectedLead) return;
    try {
      await leadsApi.deleteRep(selectedLead.id, repId);
      setReps((prev) => prev.filter((r) => r.id !== repId));
      toast.success('Rep removed');
    } catch {
      toast.error('Failed to remove rep');
    }
  };

  const handleDraftEmail = async (emailType: string) => {
    if (!selectedLead) return;
    setDraftEmailLoading(true);
    try {
      const draft = await leadsApi.draftEmail(
        selectedLead.id,
        emailType,
      );
      setDraftEmail(draft);
      setDraftEmailOpen(true);
    } catch {
      toast.error('Failed to draft email');
    } finally {
      setDraftEmailLoading(false);
    }
  };

  if (!selectedLead) return null;

  const probability = getProbability(selectedLead.stage);
  const daysInPipeline = selectedLead.metrics?.daysInPipeline ?? 0;
  const daysSinceContact =
    selectedLead.metrics?.daysSinceLastContact ?? 0;
  const activityCount = selectedLead.metrics?.activityCount ?? 0;
  const fileCount = selectedLead.metrics?.fileCount ?? 0;
  const stale = daysSinceContact > 14;

  const isOverdue =
    selectedLead.likelyStartDate &&
    selectedLead.stage !== 'Won' &&
    selectedLead.stage !== 'Lost' &&
    new Date(selectedLead.likelyStartDate) < new Date();

  const isWon = selectedLead.stage === 'Won';
  const isConverted = !!(
    selectedLead.clientId || selectedLead.convertedToClientId
  );

  const accentColor =
    URGENCY_HEX[selectedLead.urgency] ?? URGENCY_HEX.Low;
  const companyOrName =
    selectedLead.company || selectedLead.contactName || 'Unknown';

  const getTimingBadge = () => {
    if (!selectedLead.likelyStartDate) return null;
    const expected = new Date(selectedLead.likelyStartDate);
    const now = new Date();
    const closed = selectedLead.dealClosedAt
      ? new Date(selectedLead.dealClosedAt)
      : null;

    if (isWon && closed && closed <= expected) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle className="h-3 w-3" /> On Time
        </span>
      );
    }
    if (isWon && closed && closed > expected) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-3 w-3" /> Late Start
        </span>
      );
    }
    if (
      !closed &&
      selectedLead.stage !== 'Won' &&
      selectedLead.stage !== 'Lost' &&
      expected < now
    ) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0">
        <div className="sr-only">
          <DialogHeader>
            <DialogTitle>
              {selectedLead.contactName || selectedLead.name}
            </DialogTitle>
            <DialogDescription>
              {selectedLead.company}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex h-[85vh] max-h-[85vh]">
          {/* ─── LEFT SIDEBAR ─── */}
          <div className="w-80 shrink-0 border-r border-border bg-muted/15 flex flex-col overflow-y-auto">
            {/* Urgency accent strip */}
            <div
              className="h-0.75 w-full shrink-0"
              style={{ backgroundColor: accentColor }}
            />

            {/* Header: avatar + name */}
            <div className="px-5 pt-4 pb-4 border-b border-border/50">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold border border-border/60"
                  style={{ fontSize: '13px' }}>
                  {avatarInitials(companyOrName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14px] font-semibold leading-snug">
                    {selectedLead.contactName || selectedLead.name}
                  </h2>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {selectedLead.company}
                  </p>
                  {selectedLead.position && (
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                      {selectedLead.position}
                    </p>
                  )}
                </div>
              </div>

              {/* Stage + badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center text-[11px] font-semibold rounded-full px-2.5 py-1 bg-secondary border border-border/60">
                  {selectedLead.stage}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {probability}%
                </span>
                {getTimingBadge()}
              </div>
            </div>

            {/* Financial Stats */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Financials</SectionLabel>

              {/* Expected + Contracted side by side */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium mb-0.5">
                    Expected
                  </p>
                  <p className="text-[18px] font-bold tabular-nums leading-none">
                    ${fmtVal(selectedLead.expectedValue || 0)}
                  </p>
                </div>
                {selectedLead.contractedValue != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground/50 font-medium mb-0.5">
                      Contracted
                    </p>
                    <p className="text-[18px] font-bold tabular-nums leading-none text-emerald-700">
                      ${fmtVal(selectedLead.contractedValue)}
                    </p>
                  </div>
                )}
              </div>

              {/* Variance pill */}
              {selectedLead.contractedValue != null &&
                selectedLead.expectedValue != null &&
                (() => {
                  const diff =
                    selectedLead.contractedValue -
                    (selectedLead.expectedValue || 0);
                  const isPositive = diff >= 0;
                  const pct = selectedLead.expectedValue
                    ? Math.round(
                        (diff / selectedLead.expectedValue) * 100,
                      )
                    : 0;
                  return (
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isPositive
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-red-600 bg-red-50 border-red-200'
                      }`}>
                      {isPositive ? '+' : ''}$
                      {Math.abs(diff).toLocaleString()} vs expected (
                      {isPositive ? '+' : ''}
                      {pct}%)
                    </span>
                  );
                })()}
            </div>

            {/* Details */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Details</SectionLabel>
              <div>
                {selectedLead.projectName && (
                  <StatRow label="Project">
                    <span className="text-xs">
                      {selectedLead.projectName}
                    </span>
                  </StatRow>
                )}
                {selectedLead.executingCompany && (
                  <StatRow label="Executing Co.">
                    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {selectedLead.executingCompany}
                    </span>
                  </StatRow>
                )}
                <StatRow label="Source">
                  <span className="text-xs">
                    {selectedLead.source}
                  </span>
                </StatRow>
                {selectedLead.serviceType && (
                  <StatRow label="Service">
                    <span className="text-xs">
                      {selectedLead.serviceType.name}
                    </span>
                  </StatRow>
                )}
                <StatRow label="Owner">
                  <span className="text-xs flex items-center gap-1 justify-end">
                    <User className="h-3 w-3 text-muted-foreground/50" />
                    {selectedLead.assignedTo?.name || 'Unassigned'}
                  </span>
                </StatRow>
                {selectedLead.designer && (
                  <StatRow label="Designer">
                    <span className="text-xs">
                      {selectedLead.designer.name}
                    </span>
                  </StatRow>
                )}
                {selectedLead.qs && (
                  <StatRow label="QS">
                    <span className="text-xs">
                      {selectedLead.qs.name}
                    </span>
                  </StatRow>
                )}
                <StatRow label="Urgency">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      color: accentColor,
                      backgroundColor: `${accentColor}15`,
                    }}>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    {selectedLead.urgency}
                  </span>
                </StatRow>
                {selectedLead.aiRiskLevel && (
                  <StatRow label="AI Risk">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${
                        RISK_CHIP[selectedLead.aiRiskLevel] ??
                        RISK_CHIP.Low
                      }`}>
                      {selectedLead.aiRiskLevel}
                    </span>
                  </StatRow>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Timeline</SectionLabel>
              <div>
                {selectedLead.createdAt && (
                  <StatRow label="Created">
                    <span className="text-xs tabular-nums">
                      {new Date(
                        selectedLead.createdAt,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </StatRow>
                )}
                {selectedLead.likelyStartDate && (
                  <StatRow label="Likely Start">
                    <span
                      className={`text-xs tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                      {new Date(
                        selectedLead.likelyStartDate,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </StatRow>
                )}
                {selectedLead.dealClosedAt && (
                  <StatRow label="Closed">
                    <span className="text-[11px] tabular-nums">
                      {new Date(
                        selectedLead.dealClosedAt,
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </StatRow>
                )}
              </div>
            </div>

            {/* Pulse Metrics */}
            <div className="px-5 py-4 border-b border-border/50">
              <SectionLabel>Pulse</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'Pipeline',
                    value: `${daysInPipeline}d`,
                    icon: Clock,
                    alert: false,
                  },
                  {
                    label: 'Last Contact',
                    value: `${daysSinceContact}d`,
                    icon: Activity,
                    alert: stale,
                  },
                  {
                    label: 'Activities',
                    value: activityCount,
                    icon: TrendingUp,
                    alert: false,
                  },
                  {
                    label: 'Files',
                    value: fileCount,
                    icon: FileText,
                    alert: false,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={m.label}
                      className={`rounded-lg px-3 py-2.5 text-center border ${
                        m.alert
                          ? 'bg-amber-50/60 border-amber-200/60'
                          : 'bg-muted/30 border-border/40'
                      }`}>
                      <p
                        className={`text-[18px] font-bold tabular-nums leading-none mb-1 ${m.alert ? 'text-amber-700' : 'text-foreground'}`}>
                        {m.value}
                      </p>
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
              <StageTimeline lead={selectedLead} />
            </div>

            {/* Actions: Edit + Danger Zone */}
            <div className="mt-auto px-5 py-4 border-t border-border/50 space-y-1">
              {hasPermission('leads:edit') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="w-full justify-start gap-2 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {hasPermission('leads:delete') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* ─── MAIN CONTENT ─── */}
          <div className="flex-1 overflow-y-auto pt-4">
            <div className="p-6 space-y-6">
              {/* Convert to Client Banner */}
              {isWon && (
                <>
                  {isConverted ? (
                    <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/60 rounded-xl">
                      <div>
                        <p className="font-semibold text-[13px]">
                          Converted to Project
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          This prospective project has been converted
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = '/projects';
                        }}
                        className="gap-1.5 text-[12px]">
                        View Projects{' '}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
                      <div>
                        <p className="font-semibold text-[13px] text-emerald-900">
                          Ready to convert
                        </p>
                        <p className="text-[12px] text-emerald-700">
                          Create an active project from this lead
                        </p>
                      </div>
                      {hasPermission('clients:convert') && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setLeadToConvert(selectedLead);
                            setConvertDialogOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 text-[12px]">
                          Convert{' '}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* AI Analysis */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Analysis
                  </h3>
                  <div className="flex gap-1.5">
                    {hasPermission('leads:analyze') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateAISummary}
                          disabled={summaryLoading}
                          className="h-7 text-xs px-2.5">
                          {summaryLoading && (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          )}
                          Summary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleAnalyzeRisk(selectedLead)
                          }
                          disabled={aiLoading}
                          className="h-7 text-xs px-2.5">
                          {aiLoading && (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          )}
                          Risk Analysis
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={draftEmailLoading}
                              className="h-7 text-xs px-2.5">
                              <Mail className="h-3 w-3 mr-1" />
                              {draftEmailLoading
                                ? 'Drafting...'
                                : 'Draft Email'}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {[
                              'follow-up',
                              'introduction',
                              'proposal',
                              'check-in',
                              'closing',
                            ].map((type) => (
                              <DropdownMenuItem
                                key={type}
                                onClick={() =>
                                  handleDraftEmail(type)
                                }>
                                {type.charAt(0).toUpperCase() +
                                  type.slice(1)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>

                {selectedLead.aiSummary && (
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-3.5 text-[13px] text-foreground/80 leading-relaxed">
                    {selectedLead.aiSummary}
                  </div>
                )}

                {selectedLead.aiRecommendations && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.06em] font-semibold text-muted-foreground/60">
                      Recommendations
                    </p>
                    <div className="space-y-1.5">
                      {selectedLead.aiRecommendations
                        .split(';')
                        .map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-[13px]">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground leading-snug">
                              {rec.trim()}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {draftEmailOpen && draftEmail && (
                  <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        Drafted Email
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {draftEmail.tone}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Subject: ${draftEmail.subject}\n\n${draftEmail.body}`,
                            );
                            toast.success('Copied to clipboard');
                          }}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Subject
                      </p>
                      <p className="text-sm font-medium">
                        {draftEmail.subject}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Body
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {draftEmail.body}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <hr className="border-border/40" />

              {/* Project Reps */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Project Reps
                  </h3>
                  {hasPermission('leads:edit') && !addingRep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingRep(true)}
                      className="h-7 text-xs px-2.5 gap-1">
                      <Plus className="h-3 w-3" /> Add Rep
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {reps.length === 0 && !addingRep && (
                    <p className="text-[13px] text-muted-foreground">
                      No reps added yet.
                    </p>
                  )}

                  {reps.map((rep) =>
                    editingRepId === rep.id ? (
                      <div
                        key={rep.id}
                        className="rounded-xl border border-border/60 p-3 space-y-2 bg-muted/20">
                        <Input
                          value={editRepData.name}
                          onChange={(e) =>
                            setEditRepData((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Name *"
                          className="h-8 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={editRepData.phone}
                            onChange={(e) =>
                              setEditRepData((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="Phone"
                            className="h-8 text-sm"
                          />
                          <Input
                            value={editRepData.email}
                            onChange={(e) =>
                              setEditRepData((p) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                            placeholder="Email"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setEditingRepId(null)}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleSaveRep(rep.id)}
                            disabled={
                              repLoading || !editRepData.name.trim()
                            }>
                            {repLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={rep.id}
                        className="flex items-start justify-between rounded-xl border border-border/50 px-3.5 py-2.5 bg-muted/10">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[13px] font-medium">
                            {rep.name}
                          </p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            {rep.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {rep.phone}
                              </span>
                            )}
                            {rep.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {rep.email}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasPermission('leads:edit') && (
                          <div className="flex gap-0.5 shrink-0 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingRepId(rep.id);
                                setEditRepData({
                                  name: rep.name,
                                  phone: rep.phone || '',
                                  email: rep.email || '',
                                });
                              }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteRep(rep.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ),
                  )}

                  {addingRep && (
                    <div className="rounded-xl border border-dashed border-border p-3 space-y-2 bg-muted/10">
                      <Input
                        value={newRep.name}
                        onChange={(e) =>
                          setNewRep((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Name *"
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddRep();
                          if (e.key === 'Escape') {
                            setAddingRep(false);
                            setNewRep({
                              name: '',
                              phone: '',
                              email: '',
                            });
                          }
                        }}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={newRep.phone}
                          onChange={(e) =>
                            setNewRep((p) => ({
                              ...p,
                              phone: e.target.value,
                            }))
                          }
                          placeholder="Phone"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={newRep.email}
                          onChange={(e) =>
                            setNewRep((p) => ({
                              ...p,
                              email: e.target.value,
                            }))
                          }
                          placeholder="Email"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAddingRep(false);
                            setNewRep({
                              name: '',
                              phone: '',
                              email: '',
                            });
                          }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={handleAddRep}
                          disabled={
                            repLoading || !newRep.name.trim()
                          }>
                          {repLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <hr className="border-border/40" />

              {/* Client Contacts */}
              {selectedLead.clientId && (
                <LeadContactsSection
                  leadId={selectedLead.id}
                  clientId={selectedLead.clientId}
                  canEdit={hasPermission('leads:edit')}
                />
              )}

              {selectedLead.clientId && (
                <hr className="border-border/40" />
              )}

              {/* Activity Timeline */}
              <ActivityTimeline
                leadId={selectedLead.id}
                activities={activities}
                currentUserId={currentUser.id}
                onActivityAdded={onActivitiesChanged}
              />

              <hr className="border-border/40" />

              {/* File Uploads */}
              <FileUploadSection
                leadId={selectedLead.id}
                files={files}
                currentUserId={currentUser.id}
                onFilesChanged={() => loadFiles(selectedLead.id)}
              />

              <hr className="border-border/40" />

              {/* Tasks */}
              <LinkedTasksSection
                entityType="LEAD"
                entityId={selectedLead.id}
              />

              <hr className="border-border/40" />

              {/* Quotes */}
              <LinkedQuotesSection leadId={selectedLead.id} />

              {/* Custom Fields */}
              <LeadCustomFields leadId={selectedLead.id} />
            </div>
          </div>
        </div>
      </DialogContent>

      {selectedLead && (
        <EditLeadDialog
          lead={selectedLead}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          currentUser={currentUser}
          managers={managers}
          serviceTypes={serviceTypes}
          designers={designers}
          qsUsers={qsUsers}
          clients={clients}
          leads={leads}
          onLeadUpdated={(updated) => {
            onLeadUpdated?.(updated);
          }}
        />
      )}
    </Dialog>
  );
}

// ── Lead Custom Fields sub-component ──────────────────────────────────────
function LeadCustomFields({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [localEdits, setLocalEdits] = useState<
    Record<string, string>
  >({});

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

  // Derive base values from server; merge with local edits
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
      const fields = definitions.map((def) => ({
        definitionId: def.id,
        value: customValues[def.id] ?? '',
      }));
      return customFieldsApi.setValues('LEAD', leadId, fields);
    },
    onSuccess: () => {
      toast.success('Custom fields saved');
      setLocalEdits({});
      queryClient.invalidateQueries({
        queryKey: ['custom-field-values', 'LEAD', leadId],
      });
    },
    onError: () => toast.error('Failed to save custom fields'),
  });

  const activeDefinitions = definitions.filter((d) => d.isActive);
  if (activeDefinitions.length === 0) return null;

  return (
    <>
      <hr className="border-border/40" />
      <section className="space-y-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Custom Fields
        </h3>

        <div className="space-y-3">
          {activeDefinitions.map((def) => {
            const currentVal = customValues[def.id] ?? '';

            return (
              <div key={def.id} className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground/80">
                  {def.label}
                  {def.required && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </label>

                {def.fieldType === 'TEXT' && (
                  <Input
                    value={currentVal}
                    onChange={(e) =>
                      setLocalEdits((p) => ({
                        ...p,
                        [def.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                    placeholder={def.label}
                  />
                )}

                {def.fieldType === 'NUMBER' && (
                  <Input
                    type="number"
                    value={currentVal}
                    onChange={(e) =>
                      setLocalEdits((p) => ({
                        ...p,
                        [def.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                )}

                {def.fieldType === 'DATE' && (
                  <Input
                    type="date"
                    value={currentVal}
                    onChange={(e) =>
                      setLocalEdits((p) => ({
                        ...p,
                        [def.id]: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                )}

                {def.fieldType === 'SELECT' && (
                  <Select
                    value={currentVal || '__none__'}
                    onValueChange={(v) =>
                      setLocalEdits((p) => ({
                        ...p,
                        [def.id]: v === '__none__' ? '' : v,
                      }))
                    }>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        — None —
                      </SelectItem>
                      {(def.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {def.fieldType === 'BOOLEAN' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`cf-lead-${def.id}`}
                      checked={currentVal === 'true'}
                      onCheckedChange={(checked) =>
                        setLocalEdits((p) => ({
                          ...p,
                          [def.id]: checked ? 'true' : 'false',
                        }))
                      }
                    />
                    <label
                      htmlFor={`cf-lead-${def.id}`}
                      className="text-sm text-muted-foreground cursor-pointer">
                      {def.label}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-7 text-xs px-3 gap-1.5">
            {saveMutation.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            Save Custom Fields
          </Button>
        </div>
      </section>
    </>
  );
}
