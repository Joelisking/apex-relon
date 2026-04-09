'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, type Project, type ProjectAssignment } from '@/lib/api/projects-client';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import { clientsApi, leadsApi, settingsApi, serviceItemsApi } from '@/lib/api/client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import { usePrimaryServiceTypeName } from './usePrimaryServiceTypeName';
import type { DropdownOption, ServiceCategory, ProjectServiceItem } from '@/lib/types';
import type { CostSegmentInput } from '@/components/projects/ProjectCostSegments';
import type { LinkedServiceItem } from '@/components/projects/ProjectServiceItemsField';
import type { TeamMember } from '@/components/projects/ProjectTeamMembersSection';

export const editProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().min(1, 'Client is required'),
  leadId: z.string().optional(),
  status: z.string(),
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  endOfProjectValue: z.coerce.number().optional().nullable(),
  estimatedDueDate: z.string().optional(),
  closedDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  riskStatus: z.string().optional(),
  statusNote: z.string().optional(),
  county: z.array(z.string()).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  folderPath: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export type EditProjectFormValues = z.infer<typeof editProjectSchema>;

function toDateInput(value?: string | null): string {
  if (!value) return '';
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

interface Options {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (updated: Project) => void;
}

export function useEditProjectForm({ project, open, onOpenChange, onProjectUpdated }: Options) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<
    { id: string; name: string; individualName?: string }[]
  >([]);
  const [leads, setLeads] = useState<{ id: string; contactName: string; company: string }[]>([]);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);
  const [riskOptions, setRiskOptions] = useState<DropdownOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<DropdownOption[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>(
    project.assignments ?? [],
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    project.categoryIds ?? [],
  );
  const [selectedServiceTypeIds, setSelectedServiceTypeIds] = useState<string[]>(
    project.serviceTypeIds ?? [],
  );
  const [costSegments, setCostSegments] = useState<CostSegmentInput[]>(
    project.costSegments?.map((s) => ({ name: s.name, amount: s.amount, sortOrder: s.sortOrder })) ?? [],
  );
  const [activeOptionalStages, setActiveOptionalStages] = useState<string[]>(
    project.activeOptionalStages ?? [],
  );
  const [geocodedLat, setGeocodedLat] = useState<number | null>(project.latitude ?? null);
  const [geocodedLng, setGeocodedLng] = useState<number | null>(project.longitude ?? null);
  const [projectServiceItems, setProjectServiceItems] = useState<ProjectServiceItem[]>([]);

  const { data: serviceCategories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['service-categories'],
    queryFn: () => settingsApi.getServiceCategories(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allServiceItems = [] } = useQuery({
    queryKey: ['service-items'],
    queryFn: () => serviceItemsApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<EditProjectFormValues, unknown, EditProjectFormValues>({
    resolver: zodResolver(editProjectSchema) as Resolver<EditProjectFormValues>,
    defaultValues: {
      name: project.name,
      clientId: project.clientId,
      leadId: project.leadId ?? undefined,
      status: project.status ?? '',
      contractedValue: project.contractedValue ?? 0,
      endOfProjectValue: project.endOfProjectValue ?? undefined,
      estimatedDueDate: toDateInput(project.estimatedDueDate),
      closedDate: toDateInput(project.closedDate),
      projectManagerId:
        project.assignments?.find((a) => a.role.toLowerCase().includes('manager'))?.userId ?? '',
      riskStatus: project.riskStatus ?? '',
      statusNote: project.statusNote ?? '',
      county: project.county ?? [],
      description: project.description ?? '',
      address: project.address ?? '',
      folderPath: project.folderPath ?? '',
      latitude: project.latitude ?? undefined,
      longitude: project.longitude ?? undefined,
    },
  });

  const primaryServiceTypeName = usePrimaryServiceTypeName(selectedServiceTypeIds, serviceCategories);

  // Sync form + state when project changes
  useEffect(() => {
    form.reset({
      name: project.name,
      clientId: project.clientId,
      leadId: project.leadId ?? undefined,
      status: project.status ?? '',
      contractedValue: project.contractedValue ?? 0,
      endOfProjectValue: project.endOfProjectValue ?? undefined,
      estimatedDueDate: toDateInput(project.estimatedDueDate),
      closedDate: toDateInput(project.closedDate),
      projectManagerId:
        project.assignments?.find((a) => a.role.toLowerCase().includes('manager'))?.userId ?? '',
      riskStatus: project.riskStatus ?? '',
      statusNote: project.statusNote ?? '',
      county: project.county ?? [],
      description: project.description ?? '',
      address: project.address ?? '',
      folderPath: project.folderPath ?? '',
      latitude: project.latitude ?? undefined,
      longitude: project.longitude ?? undefined,
    });
    setGeocodedLat(project.latitude ?? null);
    setGeocodedLng(project.longitude ?? null);
    setAssignments(project.assignments ?? []);
    setSelectedCategoryIds(project.categoryIds ?? []);
    setSelectedServiceTypeIds(project.serviceTypeIds ?? []);
    setCostSegments(
      project.costSegments?.map((s) => ({
        name: s.name,
        amount: s.amount,
        sortOrder: s.sortOrder,
      })) ?? [],
    );
    setActiveOptionalStages(project.activeOptionalStages ?? []);
    setProjectServiceItems([]);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reference data + project service items when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [clientsData, leadsData, usersRes, serviceItemLinks] = await Promise.all([
          clientsApi.getAll(),
          leadsApi.getAll(),
          usersApi.getUsersDirectory(),
          projectsApi.getServiceItems(project.id),
        ]);
        setClients(clientsData.map((c) => ({ ...c, individualName: c.individualName ?? undefined })));
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setUsers(usersRes.users || []);
        setProjectServiceItems(serviceItemLinks);
      } catch (error) {
        console.error('Failed to load form data', error);
      }
    };
    fetchData();
    settingsApi.getDropdownOptions('project_risk_status').then(setRiskOptions).catch(console.error);
    settingsApi.getDropdownOptions('county').then(setCountyOptions).catch(console.error);
  }, [open, project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    pipelineApi
      .getStages('project', primaryServiceTypeName)
      .then(setProjectStages)
      .catch(console.error);
  }, [primaryServiceTypeName]);

  const linkedServiceItemIds = useMemo(
    () => new Set(projectServiceItems.map((l) => l.serviceItemId)),
    [projectServiceItems],
  );

  const filteredServiceItems = useMemo(
    () =>
      allServiceItems
        .filter((si) => si.isActive && !linkedServiceItemIds.has(si.id))
        .filter((si) => {
          if (selectedServiceTypeIds.length === 0) return true;
          return si.serviceTypeIds.some((id) => selectedServiceTypeIds.includes(id));
        }),
    [allServiceItems, linkedServiceItemIds, selectedServiceTypeIds],
  );

  const linkedServiceItems = useMemo<LinkedServiceItem[]>(
    () =>
      projectServiceItems.map((link) => ({
        removeKey: link.id,
        name: link.serviceItem.name,
        unit: link.serviceItem.unit,
      })),
    [projectServiceItems],
  );

  const availableUsers = users.filter((u) => !assignments.some((a) => a.userId === u.id));
  const teamMembers = useMemo<TeamMember[]>(
    () =>
      assignments.map((a) => ({
        removeKey: a.id,
        name: a.user.name,
        role: a.user.role,
      })),
    [assignments],
  );

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function toggleServiceType(id: string) {
    setSelectedServiceTypeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function addServiceItem(serviceItemId: string) {
    if (!serviceItemId) return;
    try {
      const link = await projectsApi.addServiceItem(project.id, { serviceItemId });
      setProjectServiceItems((prev) => [...prev, link]);
    } catch {
      toast.error('Failed to add service item');
    }
  }

  async function removeServiceItem(linkId: string) {
    try {
      await projectsApi.removeServiceItem(project.id, linkId);
      setProjectServiceItems((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      toast.error('Failed to remove service item');
    }
  }

  async function addTeamMember(userId: string) {
    if (!userId || assignments.some((a) => a.userId === userId)) return;
    try {
      const newAssignment = await projectsApi.addAssignment(project.id, {
        userId,
        role: 'Team Member',
      });
      setAssignments((prev) => [...prev, newAssignment]);
    } catch {
      toast.error('Failed to add team member');
    }
  }

  async function removeTeamMember(assignmentId: string) {
    try {
      await projectsApi.removeAssignment(project.id, assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch {
      toast.error('Failed to remove team member');
    }
  }

  function handleUseSegmentTotal(total: number) {
    form.setValue('contractedValue', total, { shouldValidate: true });
  }

  function handleGeocode(lat: number | null, lng: number | null) {
    setGeocodedLat(lat);
    setGeocodedLng(lng);
  }

  const onSubmit = async (values: EditProjectFormValues) => {
    try {
      setLoading(true);
      const updated = await projectsApi.update(project.id, {
        ...values,
        contractedValue: Number(values.contractedValue),
        endOfProjectValue:
          values.endOfProjectValue != null ? Number(values.endOfProjectValue) : undefined,
        leadId: values.leadId && values.leadId !== 'none' ? values.leadId : undefined,
        projectManagerId: values.projectManagerId || undefined,
        estimatedDueDate: values.estimatedDueDate
          ? new Date(values.estimatedDueDate).toISOString()
          : undefined,
        closedDate: values.closedDate ? new Date(values.closedDate).toISOString() : undefined,
        categoryIds: selectedCategoryIds,
        serviceTypeIds: selectedServiceTypeIds,
        costSegments,
        activeOptionalStages,
        address: values.address || undefined,
        folderPath: values.folderPath || undefined,
        latitude: geocodedLat ?? (values.latitude ? Number(values.latitude) : undefined),
        longitude: geocodedLng ?? (values.longitude ? Number(values.longitude) : undefined),
      });
      toast.success('Project updated successfully');
      onProjectUpdated(updated);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    clients,
    leads,
    users,
    projectStages,
    primaryServiceTypeName,
    riskOptions,
    setRiskOptions,
    countyOptions,
    setCountyOptions,
    serviceCategories,
    selectedCategoryIds,
    selectedServiceTypeIds,
    costSegments,
    setCostSegments,
    activeOptionalStages,
    setActiveOptionalStages,
    // service items
    allServiceItems,
    linkedServiceItems,
    filteredServiceItems,
    addServiceItem,
    removeServiceItem,
    // team members
    teamMembers,
    availableUsers,
    addTeamMember,
    removeTeamMember,
    // handlers
    toggleCategory,
    toggleServiceType,
    handleUseSegmentTotal,
    handleGeocode,
    watchedContractedValue: form.watch('contractedValue'),
    onSubmit,
  };
}
