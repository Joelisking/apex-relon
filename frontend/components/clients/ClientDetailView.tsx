'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import type { Client, UpsellStrategy } from '@/lib/types';
import { api } from '@/lib/api/client';
import { useTenantSettings } from '@/lib/hooks/useTenantSettings';
import { getClientDisplayName, getClientSubtitle } from '@/lib/utils/client-display';
import { projectsApi, type Project } from '@/lib/api/projects-client';
import { clientActivitiesApi, type Activity as ClientActivity } from '@/lib/api/client-activities';
import { CustomerMetricsPanel } from './CustomerMetricsPanel';
import { CustomerContactsList } from './CustomerContactsList';
import { CustomerProjectsList } from './CustomerProjectsList';
import { CustomerActivityTimeline } from './CustomerActivityTimeline';
import { EditCustomerDialog } from './EditCustomerDialog';
import { CustomerDetailSidebar } from './CustomerDetailSidebar';
import { CustomerHealthSection } from './CustomerHealthSection';
import { CustomerUpsellSection } from './CustomerUpsellSection';
import { CustomerCustomFields } from './CustomerCustomFields';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { LinkedTasksSection } from '../tasks/LinkedTasksSection';
import { LinkedQuotesSection } from '../quotes/LinkedQuotesSection';
import { PageBreadcrumbs } from '../layout/PageBreadcrumbs';

interface ClientDetailViewProps {
  clientId: string;
  currentUserId: string;
  initialTab: string;
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

export function ClientDetailView({
  clientId,
  currentUserId,
  initialTab,
}: ClientDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { clientDisplayMode } = useTenantSettings();

  const activeTab = searchParams.get('tab') || initialTab;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingUpsell, setLoadingUpsell] = useState(false);
  const [loadingAutoUpdate, setLoadingAutoUpdate] = useState(false);
  const [upsellData, setUpsellData] = useState<UpsellStrategy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadClientData = async (signal?: AbortSignal) => {
    try {
      const [clientData, projectsData, activitiesData] = await Promise.all([
        api.clients.getById(clientId),
        projectsApi.getByClient(clientId),
        clientActivitiesApi.getActivities(clientId),
      ]);
      if (signal?.aborted) return;
      setClient(clientData);
      setProjects(projectsData);
      setActivities(activitiesData);
      if (clientData.aiUpsellStrategy) {
        try {
          setUpsellData(JSON.parse(clientData.aiUpsellStrategy));
        } catch {
          setUpsellData(null);
        }
      }
      setLoading(false);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('Failed to load client data:', error);
      toast.error('Failed to load client');
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadClientData(controller.signal);
    return () => controller.abort();
  }, [clientId]);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const qs = params.toString();
    router.replace(`/clients/${clientId}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const handleDataRefresh = () => {
    loadClientData();
  };

  const handleGenerateHealth = async () => {
    if (!client?.id) return;
    setLoadingHealth(true);
    try {
      const result = await api.clients.generateHealthReport(client.id);
      setClient({ ...client, healthScore: result.healthScore, aiHealthSummary: result.summary });
    } catch {
      toast.error('Failed to generate health report');
    } finally {
      setLoadingHealth(false);
    }
  };

  const handleAutoUpdateStatus = async () => {
    if (!client?.id) return;
    setLoadingAutoUpdate(true);
    try {
      await api.clients.updateHealthStatus(client.id);
      const updated = await api.clients.getById(client.id);
      setClient(updated);
    } catch {
      toast.error('Failed to auto-update health status');
    } finally {
      setLoadingAutoUpdate(false);
    }
  };

  const handleGenerateUpsell = async () => {
    if (!client?.id) return;
    setLoadingUpsell(true);
    try {
      const result = await api.clients.generateUpsellStrategy(client.id);
      setUpsellData(result);
    } catch {
      toast.error('Failed to generate upsell strategy');
    } finally {
      setLoadingUpsell(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!client?.id) return;
    setIsDeleting(true);
    try {
      await api.clients.delete(client.id);
      toast.success('Customer archived');
      router.push('/clients');
    } catch {
      toast.error('Failed to archive customer');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Client not found</p>
        <button onClick={() => router.push('/clients')} className="text-primary underline text-sm">
          Back to Clients
        </button>
      </div>
    );
  }

  const clientDisplayName = getClientDisplayName(client, clientDisplayMode);
  const clientDisplaySubtitle = getClientSubtitle(client, clientDisplayMode);
  const clientInitials = avatarInitials(clientDisplayName);

  const TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'projects', label: `Projects (${projects.length})` },
    { value: 'contacts', label: 'Contacts' },
    { value: 'activities', label: 'Activities' },
    { value: 'tasks', label: 'Tasks' },
    { value: 'quotes', label: 'Quotes' },
    { value: 'fields', label: 'Custom Fields' },
  ];

  return (
    <>
      <div className="mb-4">
        <PageBreadcrumbs
          items={[
            { label: 'Clients', href: '/clients' },
            { label: clientDisplayName },
          ]}
        />
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <div className="w-80 shrink-0">
          <div className="sticky top-4 border rounded-xl bg-card overflow-hidden">
            <CustomerDetailSidebar
              client={client}
              clientDisplayName={clientDisplayName}
              clientDisplaySubtitle={clientDisplaySubtitle}
              clientInitials={clientInitials}
              activitiesCount={client._count?.activities ?? activities.length}
              projectsCount={projects.length}
              canEdit={hasPermission('clients:edit')}
              canDelete={hasPermission('clients:delete')}
              onEdit={() => setIsEditOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          </div>
        </div>

        {/* Main Content */}
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

            <TabsContent value="overview" className="mt-0 space-y-6">
              {client.metrics && (
                <>
                  <CustomerMetricsPanel
                    metrics={client.metrics}
                    healthFlags={client.healthFlags}
                    suggestedActions={client.suggestedActions}
                    createdAt={client.createdAt ? String(client.createdAt) : undefined}
                  />
                  <hr className="border-border/40" />
                </>
              )}

              <CustomerHealthSection
                client={client}
                loadingHealth={loadingHealth}
                loadingAutoUpdate={loadingAutoUpdate}
                canGenerateHealth={hasPermission('clients:health')}
                onAutoUpdateStatus={handleAutoUpdateStatus}
                onGenerateHealth={handleGenerateHealth}
              />

              <hr className="border-border/40" />

              <CustomerUpsellSection
                upsellData={upsellData}
                loadingUpsell={loadingUpsell}
                canGenerateUpsell={hasPermission('clients:upsell')}
                onGenerateUpsell={handleGenerateUpsell}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-0">
              <CustomerProjectsList
                clientId={client.id}
                projects={projects}
                onProjectsChanged={handleDataRefresh}
                currentUserId={currentUserId}
              />
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <CustomerContactsList
                clientId={client.id}
                canEdit={hasPermission('clients:edit')}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-0">
              <CustomerActivityTimeline
                clientId={client.id}
                activities={activities}
                currentUserId={currentUserId}
                onActivityAdded={handleDataRefresh}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <LinkedTasksSection entityType="CLIENT" entityId={client.id} />
            </TabsContent>

            <TabsContent value="quotes" className="mt-0">
              <LinkedQuotesSection clientId={client.id} />
            </TabsContent>

            <TabsContent value="fields" className="mt-0">
              <CustomerCustomFields clientId={client.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {client && (
        <EditCustomerDialog
          client={client}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onClientUpdated={(updated) => {
            setClient(updated);
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive <strong>{client?.name}</strong>. The record and all associated
              projects will be preserved and can be restored by an admin.
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
                  Archiving...
                </>
              ) : (
                'Archive'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
