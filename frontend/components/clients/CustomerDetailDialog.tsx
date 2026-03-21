'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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

interface CustomerDetailDialogProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onClientUpdated: () => void;
  accountManagers?: Array<{ id: string; name: string; email: string }>;
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

export function CustomerDetailDialog({
  client,
  open,
  onClose,
  currentUserId,
  onClientUpdated,
  accountManagers = [],
}: CustomerDetailDialogProps) {
  const { hasPermission } = useAuth();
  const { clientDisplayMode } = useTenantSettings();
  const [selectedClient, setSelectedClient] = useState<Client | null>(client);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingUpsell, setLoadingUpsell] = useState(false);
  const [loadingAutoUpdate, setLoadingAutoUpdate] = useState(false);
  const [upsellData, setUpsellData] = useState<UpsellStrategy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    setSelectedClient(client);
    setUpsellData(null);
    if (client?.id) loadClientData(client.id);
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
      const result = await api.clients.generateHealthReport(selectedClient.id);
      setSelectedClient({ ...selectedClient, healthScore: result.healthScore, aiHealthSummary: result.summary });
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
      const result = await api.clients.generateUpsellStrategy(selectedClient.id);
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
      toast.success('Customer deleted');
      setDeleteDialogOpen(false);
      onClose();
      onClientUpdated();
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedClient) return null;

  const clientDisplayName = getClientDisplayName(selectedClient, clientDisplayMode);
  const clientDisplaySubtitle = getClientSubtitle(selectedClient, clientDisplayMode);
  const clientInitials = avatarInitials(clientDisplayName);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <div className="sr-only">
            <DialogHeader>
              <DialogTitle>{selectedClient.name}</DialogTitle>
              <DialogDescription>{selectedClient.industry}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex h-[85vh] max-h-[85vh]">
            <CustomerDetailSidebar
              client={selectedClient}
              clientDisplayName={clientDisplayName}
              clientDisplaySubtitle={clientDisplaySubtitle}
              clientInitials={clientInitials}
              activitiesCount={activities.length}
              projectsCount={projects.length}
              canEdit={hasPermission('clients:edit')}
              canDelete={hasPermission('clients:delete')}
              onEdit={() => setIsEditOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Contacts */}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground/60 mb-3">
                    Contacts
                  </h3>
                  <CustomerContactsList
                    clientId={selectedClient.id}
                    canEdit={hasPermission('clients:edit')}
                  />
                </div>

                <hr className="border-border/40" />

                <CustomerActivityTimeline
                  clientId={selectedClient.id}
                  activities={activities}
                  currentUserId={currentUserId}
                  onActivityAdded={handleDataRefresh}
                />

                <hr className="border-border/40" />

                <CustomerProjectsList
                  clientId={selectedClient.id}
                  projects={projects}
                  accountManagers={accountManagers}
                  onProjectsChanged={handleDataRefresh}
                  currentUserId={currentUserId}
                />

                {selectedClient.metrics && (
                  <>
                    <hr className="border-border/40" />
                    <CustomerMetricsPanel
                      metrics={selectedClient.metrics}
                      healthFlags={selectedClient.healthFlags}
                      suggestedActions={selectedClient.suggestedActions}
                      createdAt={selectedClient.createdAt ? String(selectedClient.createdAt) : undefined}
                    />
                  </>
                )}

                <hr className="border-border/40" />

                <CustomerHealthSection
                  client={selectedClient}
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

                <hr className="border-border/40" />

                <LinkedTasksSection entityType="CLIENT" entityId={selectedClient.id} />

                <hr className="border-border/40" />

                <LinkedQuotesSection clientId={selectedClient.id} />

                <CustomerCustomFields clientId={selectedClient.id} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedClient && (
        <EditCustomerDialog
          client={selectedClient}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onClientUpdated={(updated) => {
            setSelectedClient(updated);
            onClientUpdated();
          }}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedClient?.name}</strong> and all
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
