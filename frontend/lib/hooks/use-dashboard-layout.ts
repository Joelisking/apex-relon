'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { dashboardLayoutApi } from '@/lib/api/dashboard-layout';
import type { WidgetConfig } from '@/lib/types/dashboard-layout';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export function useDashboardLayout() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storageKey = `dashboard-layout-draft-${user?.id ?? 'anon'}`;
  const [localWidgets, setLocalWidgets] = useState<
    WidgetConfig[] | null
  >(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data, isLoading: queryIsLoading, error } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: () => dashboardLayoutApi.getLayout(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Initialize from localStorage draft or server data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    if (!localWidgets && data) {
      const draft = localStorage.getItem(storageKey);
      if (draft) {
        try {
          setLocalWidgets(JSON.parse(draft));
          setHasUnsavedChanges(true);
        } catch {
          setLocalWidgets(data.widgets);
        }
      } else {
        setLocalWidgets(data.widgets);
      }
    }
  }, [data, localWidgets, user, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateWidgets = useCallback((widgets: WidgetConfig[]) => {
    setLocalWidgets(widgets);
    setHasUnsavedChanges(true);
    localStorage.setItem(storageKey, JSON.stringify(widgets));
  }, [storageKey]);

  const saveMutation = useMutation({
    mutationFn: (widgets: WidgetConfig[]) =>
      dashboardLayoutApi.saveLayout(widgets),
    onSuccess: () => {
      localStorage.removeItem(storageKey);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({
        queryKey: ['dashboard-layout'],
      });
      toast.success('Dashboard layout saved');
    },
    onError: () => {
      toast.error('Failed to save layout');
    },
  });

  const saveLayout = useCallback(() => {
    if (localWidgets) {
      saveMutation.mutate(localWidgets);
    }
  }, [localWidgets, saveMutation]);

  const resetToDefaults = useCallback(async (role: string) => {
    try {
      const [defaults] = await Promise.all([
        dashboardLayoutApi.getRoleDefaults(role),
        dashboardLayoutApi.resetLayout(),
      ]);
      localStorage.removeItem(storageKey);
      setLocalWidgets(defaults.widgets);
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
      toast.info('Layout reset to role defaults');
    } catch {
      toast.error('Failed to load defaults');
    }
  }, [storageKey, queryClient]);

  const addWidget = useCallback(
    (widget: WidgetConfig) => {
      const current = localWidgets || [];
      const updated = [...current, widget];
      updateWidgets(updated);
    },
    [localWidgets, updateWidgets],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const current = localWidgets || [];
      const updated = current.filter((w) => w.id !== widgetId);
      updateWidgets(updated);
    },
    [localWidgets, updateWidgets],
  );

  const updateWidgetConfig = useCallback(
    (widgetId: string, config: Partial<WidgetConfig['config']>) => {
      const current = localWidgets || [];
      const updated = current.map((w) =>
        w.id === widgetId
          ? { ...w, config: { ...w.config, ...config } }
          : w,
      );
      updateWidgets(updated);
    },
    [localWidgets, updateWidgets],
  );

  return {
    widgets: localWidgets || [],
    isLoading: queryIsLoading || (!localWidgets && !error),
    hasUnsavedChanges,
    isSaving: saveMutation.isPending,
    saveLayout,
    updateWidgets,
    addWidget,
    removeWidget,
    updateWidgetConfig,
    resetToDefaults,
    error,
  };
}
