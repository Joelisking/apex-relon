'use client';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/client';
import type { TenantSettings } from '@/lib/types';

export function useTenantSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => adminApi.getTenantSettings() as Promise<TenantSettings>,
    staleTime: 5 * 60 * 1000,
  });
  return {
    settings: data,
    clientDisplayMode: data?.clientDisplayMode ?? 'COMPANY',
    isLoading,
  };
}
