'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api/projects-client';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import { clientsApi, leadsApi, settingsApi } from '@/lib/api/client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import { usePrimaryJobTypeName } from './usePrimaryJobTypeName';
import type { DropdownOption, Division } from '@/lib/types';
import type { TeamMember } from '@/components/projects/ProjectTeamMembersSection';

export const createProjectSchema = z.object({
  isIndot: z.boolean().default(false),
  clientId: z.string().min(1, 'Client is required'),
  leadId: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  status: z.string().default(''),
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  endOfProjectValue: z.coerce.number().optional().nullable(),
  estimatedDueDate: z.string().optional(),
  closedDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  riskStatus: z.string().optional(),
  county: z.array(z.string()).optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

interface Options {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
  initialClientId?: string;
}

export function useCreateProjectForm({
  open,
  onOpenChange,
  onProjectCreated,
  initialClientId,
}: Options) {
  const [loading, setLoading] = useState(false);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  const [clients, setClients] = useState<
    { id: string; name: string; individualName?: string; county?: string | null; address?: string | null }[]
  >([]);
  const [leads, setLeads] = useState<{ id: string; contactName: string; company: string }[]>([]);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);
  const [riskOptions, setRiskOptions] = useState<DropdownOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<DropdownOption[]>([]);
  const [pendingTeamMemberIds, setPendingTeamMemberIds] = useState<string[]>([]);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedJobTypeIds, setSelectedJobTypeIds] = useState<string[]>([]);
  const [activeOptionalStages, setActiveOptionalStages] = useState<string[]>([]);
  const [geocodedLat, setGeocodedLat] = useState<number | null>(null);
  const [geocodedLng, setGeocodedLng] = useState<number | null>(null);

  const { data: divisions = [] } = useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: () => settingsApi.getDivisions(),
    staleTime: 10 * 60 * 1000,
  });

  const form = useForm<CreateProjectFormValues, unknown, CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema) as Resolver<CreateProjectFormValues>,
    defaultValues: {
      isIndot: false,
      clientId: initialClientId ?? '',
      name: '',
      status: '',
      contractedValue: 0,
      endOfProjectValue: 0,
    },
  });

  const primaryJobTypeName = usePrimaryJobTypeName(selectedJobTypeIds, divisions);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [clientsData, leadsData, usersRes] = await Promise.all([
          clientsApi.getAll(),
          leadsApi.getAll(),
          usersApi.getUsersDirectory(),
        ]);
        const mappedClients = clientsData.map((c) => ({
          ...c,
          individualName: c.individualName ?? undefined,
        }));
        setClients(mappedClients);
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setUsers(usersRes.users || []);
        if (initialClientId) {
          form.setValue('clientId', initialClientId);
          const preselected = mappedClients.find((c) => c.id === initialClientId);
          if (preselected?.county) form.setValue('county', [preselected.county]);
        }
      } catch (error) {
        console.error('Failed to load form data', error);
      }
    };
    fetchData();
    settingsApi.getDropdownOptions('project_risk_status').then(setRiskOptions).catch(console.error);
    settingsApi.getDropdownOptions('county').then(setCountyOptions).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIsLoadingStages(true);
    pipelineApi
      .getStages('project', primaryJobTypeName)
      .then((stages) => {
        setProjectStages(stages);
        const cur = form.getValues('status');
        if (!stages.find((s) => s.name === cur)) {
          form.setValue('status', stages[0]?.name ?? '', { shouldDirty: true });
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingStages(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, primaryJobTypeName]);

  const availableUsers = users.filter((u) => !pendingTeamMemberIds.includes(u.id));
  const teamMembers = useMemo<TeamMember[]>(
    () =>
      users
        .filter((u) => pendingTeamMemberIds.includes(u.id))
        .map((u) => ({ removeKey: u.id, name: u.name, role: u.role })),
    [users, pendingTeamMemberIds],
  );

  function toggleDivision(id: string) {
    setSelectedDivisionIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function toggleJobType(id: string) {
    setSelectedJobTypeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function addTeamMember(userId: string) {
    if (userId && !pendingTeamMemberIds.includes(userId)) {
      setPendingTeamMemberIds((prev) => [...prev, userId]);
    }
  }

  function removeTeamMember(key: string) {
    setPendingTeamMemberIds((prev) => prev.filter((id) => id !== key));
  }

  function handleClientChange(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (client?.county) form.setValue('county', [client.county]);
    form.setValue('clientId', clientId);
  }

  function handleGeocode(lat: number | null, lng: number | null) {
    setGeocodedLat(lat);
    setGeocodedLng(lng);
  }

  function reset() {
    form.reset();
    setPendingTeamMemberIds([]);
    setSelectedDivisionIds([]);
    setSelectedJobTypeIds([]);
    setActiveOptionalStages([]);
    setGeocodedLat(null);
    setGeocodedLng(null);
  }

  const onSubmit = async (values: CreateProjectFormValues) => {
    try {
      setLoading(true);
      await projectsApi.create({
        ...values,
        contractedValue: Number(values.contractedValue),
        endOfProjectValue: values.endOfProjectValue ? Number(values.endOfProjectValue) : undefined,
        leadId: values.leadId || undefined,
        estimatedDueDate: values.estimatedDueDate
          ? new Date(values.estimatedDueDate).toISOString()
          : undefined,
        closedDate: values.closedDate ? new Date(values.closedDate).toISOString() : undefined,
        teamMemberIds: pendingTeamMemberIds.length > 0 ? pendingTeamMemberIds : undefined,
        categoryIds: selectedDivisionIds.length > 0 ? selectedDivisionIds : undefined,
        jobTypeIds: selectedJobTypeIds.length > 0 ? selectedJobTypeIds : undefined,
        activeOptionalStages,
        address: values.address || undefined,
        latitude: geocodedLat ?? (values.latitude ? Number(values.latitude) : undefined),
        longitude: geocodedLng ?? (values.longitude ? Number(values.longitude) : undefined),
      });
      toast.success('Project created successfully');
      onProjectCreated();
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    loading,
    isLoadingStages,
    clients,
    leads,
    users,
    projectStages,
    primaryJobTypeName,
    riskOptions,
    setRiskOptions,
    countyOptions,
    setCountyOptions,
    divisions,
    selectedDivisionIds,
    selectedJobTypeIds,
    activeOptionalStages,
    setActiveOptionalStages,
    // team members
    teamMembers,
    availableUsers,
    addTeamMember,
    removeTeamMember,
    // handlers
    toggleDivision,
    toggleJobType,
    handleClientChange,
    handleGeocode,
    onSubmit,
  };
}
