'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lead } from '@/lib/types';
import { api } from '@/lib/api/client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';

interface Manager {
  id: string;
  name: string;
  email: string;
  role?: string;
  teamName?: string;
}

export function useLeadsData() {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const { data: queryLeads, isLoading, isFetching } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => api.leads.getAll(),
    staleTime: 60 * 1000,
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => api.admin.getUsers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientList = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => api.clients.getAll(),
    staleTime: 60 * 1000,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const { data: pipelineStages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () => pipelineApi.getStages('prospective_project'),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (queryLeads) setLeads(queryLeads);
  }, [queryLeads]);

  const allUsersArr: Manager[] = Array.isArray(allUsers)
    ? allUsers
    : ((allUsers as { users?: Manager[] })?.users ?? []);

  return {
    leads,
    setLeads,
    managers: allUsersArr,
    clients: clientList,
    allUsersArr,
    pipelineStages,
    stagesLoading,
    isLoading,
    isFetching,
    mounted,
    queryClient,
  };
}
