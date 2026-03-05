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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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
  Loader2,
  Heart,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Globe,
  Trash2,
  User,
  Pencil,
  DollarSign,
  Activity,
  Briefcase,
  SlidersHorizontal,
} from 'lucide-react';
import type { Client, UpsellStrategy } from '@/lib/types';
import { api } from '@/lib/api/client';
import { useTenantSettings } from '@/lib/hooks/useTenantSettings';
import {
  getClientDisplayName,
  getClientSubtitle,
} from '@/lib/utils/client-display';
import { projectsApi, type Project } from '@/lib/api/projects-client';
import {
  clientActivitiesApi,
  type Activity as ClientActivity,
} from '@/lib/api/client-activities';
import { customFieldsApi } from '@/lib/api/custom-fields-client';
import { ClientMetricsPanel } from './ClientMetricsPanel';
import { ClientContactsList } from './ClientContactsList';
import { ClientProjectsList } from './ClientProjectsList';
import { ClientActivityTimeline } from './ClientActivityTimeline';
import { EditClientDialog } from './EditClientDialog';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
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

interface ClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  accountManagers: Array<{ id: string; name: string; email: string }>;
  onClientUpdated: () => void;
}

// ── accent colors ──────────────────────────────────────────────────────────
const STATUS_HEX: Record<string, string> = {
  Active: '#10b981',
  'At Risk': '#ef4444',
  Dormant: '#f59e0b',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100/70 text-emerald-900',
  'At Risk': 'bg-red-100/70    text-red-900',
  Dormant: 'bg-amber-100/70  text-amber-900',
};

const STATUS_DOT: Record<string, string> = {
  Active: 'bg-emerald-400',
  'At Risk': 'bg-red-400',
  Dormant: 'bg-amber-400',
};

// ── helpers ────────────────────────────────────────────────────────────────
function avatarInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getHealthHex(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold mb-3">
      {children}
    </p>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3 w-3 text-muted-foreground/40 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.04em]">
          {label}
        </p>
        <p className="text-xs text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export function ClientDetailDialog({
  client,
  open,
  onClose,
  currentUserId,
  accountManagers,
  onClientUpdated,
}: ClientDetailDialogProps) {
  const { hasPermission } = useAuth();
  const { clientDisplayMode } = useTenantSettings();
  const [selectedClient, setSelectedClient] = useState<Client | null>(
    client,
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingUpsell, setLoadingUpsell] = useState(false);
  const [loadingAutoUpdate, setLoadingAutoUpdate] = useState(false);
  const [upsellData, setUpsellData] = useState<UpsellStrategy | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setSelectedClient(client);
    setUpsellData(null);
    if (client?.id) {
      loadClientData(client.id);
    }
  }, [client]);

  const loadClientData = async (clientId: string) => {
    try {
      const [projectsData, activitiesData] = await Promise.all([
        projectsApi.getByClient(clientId),
        clientActivitiesApi.getActivities(clientId),
      ]);
      setProjects(projectsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load client data:', error);
    }
  };

  const handleDataRefresh = () => {
    if (selectedClient?.id) {
      loadClientData(selectedClient.id);
      onClientUpdated();
    }
  };

  const handleGenerateHealth = async () => {
    if (!selectedClient?.id) return;
    setLoadingHealth(true);
    try {
      const result = await api.clients.generateHealthReport(
        selectedClient.id,
      );
      setSelectedClient({
        ...selectedClient,
        healthScore: result.healthScore,
        aiHealthSummary: result.summary,
      });
      onClientUpdated();
    } catch (error) {
      console.error('Failed to generate health report:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleAutoUpdateStatus = async () => {
    if (!selectedClient?.id) return;
    setLoadingAutoUpdate(true);
    try {
      await api.clients.updateHealthStatus(selectedClient.id);
      const updated = await api.clients.getById(selectedClient.id);
      setSelectedClient(updated);
      onClientUpdated();
    } catch (error) {
      console.error('Failed to auto-update health status:', error);
    } finally {
      setLoadingAutoUpdate(false);
    }
  };

  const handleGenerateUpsell = async () => {
    if (!selectedClient?.id) return;
    setLoadingUpsell(true);
    try {
      const result = await api.clients.generateUpsellStrategy(
        selectedClient.id,
      );
      setUpsellData(result);
    } catch (error) {
      console.error('Failed to generate upsell strategy:', error);
    } finally {
      setLoadingUpsell(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient?.id) return;
    setIsDeleting(true);
    try {
      await api.clients.delete(selectedClient.id);
      toast.success('Client deleted');
      setDeleteDialogOpen(false);
      onClose();
      onClientUpdated();
    } catch {
      toast.error('Failed to delete client');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedClient) return null;

  const accentColor = STATUS_HEX[selectedClient.status] ?? '#6b7280';
  const statusColors =
    STATUS_COLORS[selectedClient.status] ??
    'bg-muted text-muted-foreground';
  const statusDot =
    STATUS_DOT[selectedClient.status] ?? 'bg-muted-foreground/30';
  const clientDisplayName = getClientDisplayName(
    selectedClient,
    clientDisplayMode,
  );
  const clientDisplaySubtitle = getClientSubtitle(
    selectedClient,
    clientDisplayMode,
  );
  const clientInitials = avatarInitials(clientDisplayName);

  const hasContact =
    selectedClient.email ||
    selectedClient.phone ||
    selectedClient.address ||
    selectedClient.website ||
    selectedClient.individualName ||
    selectedClient.individualType;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <div className="sr-only">
            <DialogHeader>
              <DialogTitle>{selectedClient.name}</DialogTitle>
              <DialogDescription>
                {selectedClient.industry}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex h-[85vh] max-h-[85vh]">
            {/* ─── LEFT SIDEBAR ─────────────────────────────────────────── */}
            <div className="w-72 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col overflow-y-auto">
              {/* 3px accent strip */}
              <div
                className="h-[3px] w-full shrink-0"
                style={{ backgroundColor: accentColor }}
              />

              {/* Header block */}
              <div className="px-5 pt-4 pb-4 border-b border-border/40">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-[13px]"
                    style={{ backgroundColor: accentColor }}>
                    {clientInitials}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">
                      {clientDisplayName}
                    </h2>
                    {clientDisplaySubtitle ? (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {clientDisplaySubtitle}
                      </p>
                    ) : selectedClient.industry ? (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {selectedClient.industry}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Status + health pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 ${statusColors}`}>
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`}
                    />
                    {selectedClient.status}
                  </span>
                  {selectedClient.healthScore != null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-muted text-muted-foreground">
                      <Heart className="h-2.5 w-2.5" />
                      {selectedClient.healthScore}%
                    </span>
                  )}
                  {selectedClient.segment && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted text-muted-foreground">
                      {selectedClient.segment}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Financials ─────────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-border/40">
                <SectionLabel>Financials</SectionLabel>

                <div className="grid grid-cols-1 gap-px bg-border/40 rounded-lg overflow-hidden">
                  <div className="bg-card px-3 py-2.5 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground font-medium flex items-center gap-1">
                      <DollarSign className="h-2.5 w-2.5" />
                      Lifetime Revenue
                    </p>
                    <p className="text-[22px] font-bold tabular-nums leading-none text-foreground">
                      $
                      {(
                        (selectedClient.lifetimeRevenue || 0) / 1000
                      ).toFixed(0)}
                      k
                    </p>
                  </div>
                </div>

                {selectedClient.healthScore != null && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.04em]">
                        Health Score
                      </p>
                      <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{
                          color: getHealthHex(
                            selectedClient.healthScore,
                          ),
                        }}>
                        {selectedClient.healthScore}%
                      </span>
                    </div>
                    <Progress
                      value={selectedClient.healthScore}
                      className="h-1.5"
                    />
                  </div>
                )}
              </div>

              {/* ── Pulse ──────────────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-border/40">
                <SectionLabel>Pulse</SectionLabel>
                <div className="grid grid-cols-2 gap-px bg-border/40 rounded-lg overflow-hidden">
                  {[
                    {
                      label: 'Activities',
                      value: activities.length,
                      icon: Activity,
                    },
                    {
                      label: 'Projects',
                      value: projects.length,
                      icon: Briefcase,
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

              {/* ── Contact ────────────────────────────────────────────── */}
              {hasContact && (
                <div className="px-5 py-4 border-b border-border/40 space-y-2.5">
                  <SectionLabel>Contact</SectionLabel>
                  {selectedClient.individualName && (
                    <InfoRow
                      icon={User}
                      label="Contact Name"
                      value={selectedClient.individualName}
                    />
                  )}
                  {selectedClient.individualType && (
                    <InfoRow
                      icon={User}
                      label="Type"
                      value={selectedClient.individualType}
                    />
                  )}
                  {selectedClient.email && (
                    <InfoRow
                      icon={Mail}
                      label="Email"
                      value={selectedClient.email}
                    />
                  )}
                  {selectedClient.phone && (
                    <InfoRow
                      icon={Phone}
                      label="Phone"
                      value={selectedClient.phone}
                    />
                  )}
                  {selectedClient.address && (
                    <InfoRow
                      icon={MapPin}
                      label="Address"
                      value={selectedClient.address}
                    />
                  )}
                  {selectedClient.website && (
                    <InfoRow
                      icon={Globe}
                      label="Website"
                      value={selectedClient.website}
                    />
                  )}
                </div>
              )}

              {/* ── Account Manager ────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-border/40">
                <SectionLabel>Account Manager</SectionLabel>
                {selectedClient.accountManager ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-secondary-foreground font-bold"
                      style={{ fontSize: '7px' }}>
                      {avatarInitials(
                        selectedClient.accountManager.name,
                      )}
                    </div>
                    <span className="text-xs text-foreground">
                      {selectedClient.accountManager.name}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50">
                    Unassigned
                  </p>
                )}
              </div>

              {/* ── Actions ────────────────────────────────────────────── */}
              <div className="mt-auto px-5 py-4 border-t border-border/40 space-y-1.5">
                {hasPermission('clients:edit') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="w-full justify-start gap-2 text-xs">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Client
                  </Button>
                )}
                {hasPermission('clients:delete') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full justify-start gap-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Client
                  </Button>
                )}
              </div>
            </div>

            {/* ─── MAIN CONTENT ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Contacts */}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
                    Contacts
                  </h3>
                  <ClientContactsList
                    clientId={selectedClient.id}
                    canEdit={hasPermission('clients:edit')}
                  />
                </div>

                <hr className="border-border/40" />

                {/* Activities */}
                <ClientActivityTimeline
                  clientId={selectedClient.id}
                  activities={activities}
                  currentUserId={currentUserId}
                  onActivityAdded={handleDataRefresh}
                />

                <hr className="border-border/40" />

                {/* Projects */}
                <ClientProjectsList
                  clientId={selectedClient.id}
                  projects={projects}
                  accountManagers={accountManagers}
                  onProjectsChanged={handleDataRefresh}
                  currentUserId={currentUserId}
                />

                {/* Metrics Panel */}
                {selectedClient.metrics && (
                  <>
                    <hr className="border-border/40" />
                    <ClientMetricsPanel
                      metrics={selectedClient.metrics}
                      healthFlags={selectedClient.healthFlags}
                      suggestedActions={selectedClient.suggestedActions}
                      createdAt={selectedClient.createdAt ? String(selectedClient.createdAt) : undefined}
                    />
                  </>
                )}

                <hr className="border-border/40" />

                {/* Health Analysis */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
                      <Heart className="h-3 w-3" />
                      Health Analysis
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoUpdateStatus}
                        disabled={loadingAutoUpdate}
                        className="h-7 text-xs">
                        {loadingAutoUpdate ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            Updating…
                          </>
                        ) : (
                          'Auto-Update Status'
                        )}
                      </Button>
                      {hasPermission('clients:health') &&
                        (!selectedClient.aiHealthSummary ||
                          !selectedClient.healthScore) && (
                          <Button
                            size="sm"
                            onClick={handleGenerateHealth}
                            disabled={loadingHealth}
                            className="h-7 text-xs">
                            {loadingHealth ? (
                              <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                Analyzing…
                              </>
                            ) : (
                              'Generate Report'
                            )}
                          </Button>
                        )}
                    </div>
                  </div>

                  {selectedClient.aiHealthSummary ? (
                    <div className="p-4 bg-muted/40 rounded-lg border border-border/40">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {selectedClient.aiHealthSummary}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 border-dashed py-8 text-center">
                      <Heart className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/50">
                        No health analysis yet
                      </p>
                      <p className="text-xs text-muted-foreground/40 mt-0.5">
                        Click &quot;Generate Report&quot; to analyze
                        this client
                      </p>
                    </div>
                  )}
                </section>

                <hr className="border-border/40" />

                {/* Growth / Upsell */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      Growth Opportunities
                    </h3>
                    {hasPermission('clients:upsell') &&
                      !upsellData && (
                        <Button
                          size="sm"
                          onClick={handleGenerateUpsell}
                          disabled={loadingUpsell}
                          className="h-7 text-xs">
                          {loadingUpsell ? (
                            <>
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                              Analyzing…
                            </>
                          ) : (
                            'Generate Strategy'
                          )}
                        </Button>
                      )}
                  </div>

                  {upsellData ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200/60">
                        <p className="text-xs font-semibold text-emerald-800 mb-1.5">
                          Strategy
                        </p>
                        <p className="text-sm text-emerald-900/80">
                          {upsellData.approach}
                        </p>
                        {upsellData.timing && (
                          <p className="text-xs text-emerald-700 mt-1.5 font-medium">
                            Timing: {upsellData.timing}
                          </p>
                        )}
                      </div>
                      {upsellData.opportunities &&
                        upsellData.opportunities.length > 0 && (
                          <div className="space-y-2">
                            {upsellData.opportunities.map(
                              (opp, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border border-border/40 bg-card p-3.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h6 className="text-sm font-semibold">
                                      {opp.service}
                                    </h6>
                                    {opp.priority && (
                                      <span className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                                        opp.priority === 'High' ? 'bg-emerald-100 text-emerald-800' :
                                        opp.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                                        'bg-muted text-muted-foreground'
                                      }`}>
                                        {opp.priority}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {opp.rationale}
                                  </p>
                                  {opp.estimatedValue && (
                                    <p className="text-xs font-medium mt-2 text-emerald-700">
                                      Est. Value: {opp.estimatedValue}
                                    </p>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 border-dashed py-8 text-center">
                      <Sparkles className="h-7 w-7 mx-auto mb-2 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/50">
                        No growth strategy yet
                      </p>
                      <p className="text-xs text-muted-foreground/40 mt-0.5">
                        Click &quot;Generate Strategy&quot; to
                        discover opportunities
                      </p>
                    </div>
                  )}
                </section>

                <hr className="border-border/40" />

                {/* Tasks */}
                <LinkedTasksSection
                  entityType="CLIENT"
                  entityId={selectedClient.id}
                />

                <hr className="border-border/40" />

                {/* Quotes */}
                <LinkedQuotesSection clientId={selectedClient.id} />

                {/* Custom Fields */}
                <ClientCustomFields clientId={selectedClient.id} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      {selectedClient && (
        <EditClientDialog
          client={selectedClient}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          currentUser={{ id: currentUserId, role: 'Manager' }}
          managers={accountManagers}
          onClientUpdated={(updated) => {
            setSelectedClient(updated);
            onClientUpdated();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <strong>{selectedClient?.name}</strong> and all
              associated projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Client Custom Fields sub-component ────────────────────────────────────
function ClientCustomFields({ clientId }: { clientId: string }) {
  const queryClient = useQueryClient();
  const [localEdits, setLocalEdits] = useState<
    Record<string, string>
  >({});

  const { data: definitions = [] } = useQuery({
    queryKey: ['custom-field-definitions', 'CLIENT'],
    queryFn: () => customFieldsApi.getDefinitions('CLIENT'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: values } = useQuery({
    queryKey: ['custom-field-values', 'CLIENT', clientId],
    queryFn: () => customFieldsApi.getValues('CLIENT', clientId),
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
      return customFieldsApi.setValues('CLIENT', clientId, fields);
    },
    onSuccess: () => {
      toast.success('Custom fields saved');
      setLocalEdits({});
      queryClient.invalidateQueries({
        queryKey: ['custom-field-values', 'CLIENT', clientId],
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
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-3 w-3" />
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
                      id={`cf-client-${def.id}`}
                      checked={currentVal === 'true'}
                      onCheckedChange={(checked) =>
                        setLocalEdits((p) => ({
                          ...p,
                          [def.id]: checked ? 'true' : 'false',
                        }))
                      }
                    />
                    <label
                      htmlFor={`cf-client-${def.id}`}
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
