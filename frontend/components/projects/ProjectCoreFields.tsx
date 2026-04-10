'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { MultiCreatableSelect } from '@/components/ui/multi-creatable-select';
import { Textarea } from '@/components/ui/textarea';
import { UserPicker } from '@/components/ui/user-picker';
import { settingsApi } from '@/lib/api/client';
import { JobTypeSelector } from '@/components/settings/JobTypeSelector';
import { ProjectStageSection } from './ProjectStageSection';
import type { DropdownOption, Division } from '@/lib/types';
import type { PipelineStage } from '@/lib/api/pipeline-client';

interface Client {
  id: string;
  name: string;
  individualName?: string;
}

interface Lead {
  id: string;
  contactName: string;
  company: string;
}

interface User {
  id: string;
  name: string;
  role?: string;
}

export interface ProjectCoreFieldsProps {
  // Client/lead
  clients: Client[];
  leads: Lead[];
  users: User[];
  onClientChange?: (clientId: string) => void;
  hideClient?: boolean;

  // Stage
  projectStages: PipelineStage[];
  primaryJobTypeName?: string;
  isLoadingStages?: boolean;
  activeOptionalStages: string[];
  onOptionalStageChange: (stages: string[]) => void;
  stageIdPrefix: string;
  statusLabel?: string;

  // Divisions / job types
  divisions: Division[];
  selectedDivisionIds: string[];
  selectedJobTypeIds: string[];
  onDivisionToggle: (id: string) => void;
  onJobTypeToggle: (id: string) => void;

  // Risk / dropdown options
  riskOptions: DropdownOption[];
  onRiskOptionsChange: (opts: DropdownOption[]) => void;
  countyOptions: DropdownOption[];
  onCountyOptionsChange: (opts: DropdownOption[]) => void;

  // End-of-project value behaviour differs between create/edit
  endOfProjectValueDefault?: number | string;
}

export function ProjectCoreFields({
  clients,
  leads,
  users,
  onClientChange,
  hideClient = false,
  projectStages,
  primaryJobTypeName,
  isLoadingStages,
  activeOptionalStages,
  onOptionalStageChange,
  stageIdPrefix,
  statusLabel,
  divisions,
  selectedDivisionIds,
  selectedJobTypeIds,
  onDivisionToggle,
  onJobTypeToggle,
  riskOptions,
  onRiskOptionsChange,
  countyOptions,
  onCountyOptionsChange,
  endOfProjectValueDefault = '',
}: ProjectCoreFieldsProps) {
  const form = useFormContext();

  return (
    <>
      {/* Client */}
      {!hideClient && (
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer *</FormLabel>
              <FormControl>
                <UserPicker
                  users={clients.map((c) => ({
                    id: c.id,
                    name: c.individualName ? `${c.individualName} (${c.name})` : c.name,
                  }))}
                  value={field.value}
                  onChange={onClientChange ?? field.onChange}
                  placeholder="Search customers..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Lead */}
      <FormField
        control={form.control}
        name="leadId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Linked Prospective Project</FormLabel>
            <FormControl>
              <UserPicker
                users={leads.map((l) => ({ id: l.id, name: `${l.contactName} — ${l.company}` }))}
                value={field.value ?? ''}
                onChange={(val) => field.onChange(val || undefined)}
                placeholder="Search prospects... (optional)"
                allowUnassigned
                unassignedLabel="None"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Office Renovation" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Stage + optional stages */}
      <ProjectStageSection
        projectStages={projectStages}
        primaryJobTypeName={primaryJobTypeName}
        isLoadingStages={isLoadingStages}
        activeOptionalStages={activeOptionalStages}
        onOptionalStageChange={onOptionalStageChange}
        idPrefix={stageIdPrefix}
        statusLabel={statusLabel}
      />

      {/* Project Manager */}
      <FormField
        control={form.control}
        name="projectManagerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Project Manager</FormLabel>
            <FormControl>
              <UserPicker
                users={users}
                value={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Select PM"
                allowUnassigned
                unassignedLabel="None"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Contracted Value */}
      <FormField
        control={form.control}
        name="contractedValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contracted Value ($)</FormLabel>
            <FormControl>
              <Input
                type="number" min="0" step="0.01"
                {...field}
                onFocus={(e) => e.target.select()}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* End of Project Value */}
      <FormField
        control={form.control}
        name="endOfProjectValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>End of Project Value ($)</FormLabel>
            <FormControl>
              <Input
                type="number" min="0" step="0.01"
                {...field}
                value={field.value ?? endOfProjectValueDefault}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? endOfProjectValueDefault : e.target.value)
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Estimated Due Date */}
      <FormField
        control={form.control}
        name="estimatedDueDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estimated Due Date</FormLabel>
            <FormControl>
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Closed Date */}
      <FormField
        control={form.control}
        name="closedDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Closed Date</FormLabel>
            <FormControl>
              <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Service Categories & Types */}
      <div>
        <p className="text-sm font-medium leading-none mb-2">
          Service Categories &amp; Types
        </p>
        <JobTypeSelector
          categories={divisions}
          selectedCategoryIds={selectedDivisionIds}
          selectedJobTypeIds={selectedJobTypeIds}
          onCategoryToggle={onDivisionToggle}
          onJobTypeToggle={onJobTypeToggle}
        />
      </div>

      <FormField
        control={form.control}
        name="riskStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risk Status</FormLabel>
            <FormControl>
              <CreatableSelect
                options={riskOptions}
                value={field.value || undefined}
                onChange={field.onChange}
                placeholder="Select risk status"
                onOptionsChange={onRiskOptionsChange}
                onOptionCreated={(label) =>
                  settingsApi.createDropdownOption({
                    category: 'project_risk_status',
                    value: label.toLowerCase().replace(/\s+/g, '_'),
                    label,
                  })
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* County */}
      <FormField
        control={form.control}
        name="county"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>County</FormLabel>
            <FormControl>
              <MultiCreatableSelect
                options={countyOptions}
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Select counties"
                onOptionsChange={onCountyOptionsChange}
                onOptionCreated={(label) =>
                  settingsApi.createDropdownOption({
                    category: 'county',
                    value: label.toLowerCase().replace(/[.\s]+/g, '_'),
                    label,
                  })
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Project details..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
