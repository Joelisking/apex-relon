'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Check, Loader2 } from 'lucide-react';
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

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => adminApi.getTenantSettings() as Promise<TenantSettings>,
    staleTime: 5 * 60 * 1000,
  });

  const currentMode: ClientDisplayMode =
    localMode ?? (settings?.clientDisplayMode as ClientDisplayMode) ?? 'COMPANY';

  const isDirty =
    localMode !== null && localMode !== settings?.clientDisplayMode;

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
    </div>
  );
}
