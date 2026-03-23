'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Check, Loader2, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api/client';
import { toast } from 'sonner';
import type { TenantSettings } from '@/lib/types';

type ClientDisplayMode = 'COMPANY' | 'CONTACT';

interface ModeOption {
  value: ClientDisplayMode;
  label: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: 'COMPANY',
    label: 'Company Name',
    description:
      'Always show the company or organisation name as the primary client identifier.',
  },
  {
    value: 'CONTACT',
    label: 'Contact Name',
    description:
      'Show the individual contact name when available, with company name as subtitle.',
  },
];

export function AdminGeneralSettingsView() {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [localMode, setLocalMode] = useState<ClientDisplayMode | null>(null);
  const [localStuckDays, setLocalStuckDays] = useState<number | null>(null);
  const [localCriticalStageDays, setLocalCriticalStageDays] = useState<number | null>(null);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => adminApi.getTenantSettings() as Promise<TenantSettings>,
    staleTime: 5 * 60 * 1000,
  });

  const currentMode: ClientDisplayMode =
    localMode ?? (settings?.clientDisplayMode as ClientDisplayMode) ?? 'COMPANY';

  const stuckDays = localStuckDays ?? settings?.bottleneckStuckDays ?? 14;
  const criticalStageDays = localCriticalStageDays ?? settings?.bottleneckCriticalStageDays ?? 14;

  const isDisplayDirty = localMode !== null && localMode !== settings?.clientDisplayMode;
  const isThresholdsDirty =
    (localStuckDays !== null && localStuckDays !== settings?.bottleneckStuckDays) ||
    (localCriticalStageDays !== null && localCriticalStageDays !== settings?.bottleneckCriticalStageDays);

  // Keep old name for the display-mode save handler
  const isDirty = isDisplayDirty;

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    try {
      await adminApi.updateTenantSettings({ clientDisplayMode: currentMode });
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      setLocalMode(null);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveThresholds = async () => {
    if (!isThresholdsDirty) return;
    setIsSavingThresholds(true);
    try {
      await adminApi.updateTenantSettings({
        bottleneckStuckDays: stuckDays,
        bottleneckCriticalStageDays: criticalStageDays,
      });
      await queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['bottleneck-widget-summary'] });
      setLocalStuckDays(null);
      setLocalCriticalStageDays(null);
      toast.success('Thresholds saved');
    } catch {
      toast.error('Failed to save thresholds');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-display tracking-tight">
          General Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure display and behaviour preferences for this tenant.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Card header */}
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Display Settings
          </span>
        </div>

        {/* Option rows */}
        {isLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {MODE_OPTIONS.map((option, index) => {
              const isSelected = currentMode === option.value;
              const isLast = index === MODE_OPTIONS.length - 1;
              return (
                <div
                  key={option.value}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setLocalMode(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLocalMode(option.value);
                    }
                  }}
                  className={[
                    'px-5 py-4 flex items-start gap-3 cursor-pointer transition-colors',
                    !isLast && 'border-b border-border/40',
                    isSelected ? 'bg-muted/40' : 'hover:bg-muted/30',
                  ]
                    .filter(Boolean)
                    .join(' ')}>
                  {/* Custom radio indicator */}
                  <div
                    className={[
                      'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      isSelected
                        ? 'border-foreground bg-foreground'
                        : 'border-border bg-background',
                    ].join(' ')}>
                    {isSelected && (
                      <Check className="h-2.5 w-2.5 text-background" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Save row */}
            <div className="px-5 py-4 flex justify-end">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="gap-1.5">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Analytics Thresholds */}
      <div className="mt-8 rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2.5">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Bottleneck Analysis Thresholds
          </span>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/40">
              <div className="px-5 py-4 flex items-center justify-between gap-8">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Stuck Project Threshold</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A project is flagged as "stuck" if it has had no activity for this many days.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={stuckDays}
                    onChange={(e) => setLocalStuckDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>

              <div className="px-5 py-4 flex items-center justify-between gap-8">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">Critical Stage Threshold</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A pipeline stage is flagged as "critical" if leads spend more than this many days in it on average.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={criticalStageDays}
                    onChange={(e) => setLocalCriticalStageDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveThresholds}
                disabled={!isThresholdsDirty || isSavingThresholds}
                className="gap-1.5">
                {isSavingThresholds && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
