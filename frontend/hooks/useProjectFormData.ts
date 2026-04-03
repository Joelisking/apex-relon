'use client';

import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DropdownOption } from '@/lib/types';
import type { UserDirectoryItem } from '@/lib/api/users-client';
import { usersApi } from '@/lib/api/users-client';
import { clientsApi, leadsApi, settingsApi } from '@/lib/api/client';

interface UseProjectFormDataResult {
  clients: { id: string; name: string; individualName?: string; county?: string | null }[];
  leads: { id: string; contactName: string; company: string }[];
  users: UserDirectoryItem[];
  riskOptions: DropdownOption[];
  setRiskOptions: Dispatch<SetStateAction<DropdownOption[]>>;
  countyOptions: DropdownOption[];
  setCountyOptions: Dispatch<SetStateAction<DropdownOption[]>>;
}

export function useProjectFormData(enabled: boolean): UseProjectFormDataResult {
  const [clients, setClients] = useState<
    { id: string; name: string; individualName?: string; county?: string | null }[]
  >([]);
  const [leads, setLeads] = useState<
    { id: string; contactName: string; company: string }[]
  >([]);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [riskOptions, setRiskOptions] = useState<DropdownOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    if (!enabled) return;

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
      } catch (error) {
        console.error('Failed to load form data', error);
      }
    };

    fetchData();

    settingsApi
      .getDropdownOptions('project_risk_status')
      .then(setRiskOptions)
      .catch(console.error);

    settingsApi
      .getDropdownOptions('county')
      .then(setCountyOptions)
      .catch(console.error);
  }, [enabled]);

  return {
    clients,
    leads,
    users,
    riskOptions,
    setRiskOptions,
    countyOptions,
    setCountyOptions,
  };
}
