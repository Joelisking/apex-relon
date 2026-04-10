'use client';

import { useCallback } from 'react';
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

  const { data: queryLeads = [], isLoading, isFetching } = useQuery<Lead[]>({
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

  // Optimistic update helper — same call signature as React.Dispatch<React.SetStateAction<Lead[]>>
  const setLeads = useCallback((updater: Lead[] | ((prev: Lead[]) => Lead[])) => {
    queryClient.setQueryData<Lead[]>(['leads'], (prev) => {
      const prevLeads = prev ?? [];
      return typeof updater === 'function' ? updater(prevLeads) : updater;
    });
  }, [queryClient]);

  const allUsersArr: Manager[] = Array.isArray(allUsers)
    ? allUsers
    : ((allUsers as { users?: Manager[] })?.users ?? []);

  return {
    leads: queryLeads,
    setLeads,
    managers: allUsersArr,
    clients: clientList,
    allUsersArr,
    pipelineStages,
    stagesLoading,
    isLoading,
    isFetching,
    mounted: true, // 'use client' — always mounted, no SSR hydration concern
    queryClient,
  };
}
