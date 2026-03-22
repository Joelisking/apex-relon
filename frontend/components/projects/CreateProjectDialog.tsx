'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, X } from 'lucide-react';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { UserPicker } from '@/components/ui/user-picker';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects-client';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import { clientsApi, leadsApi, settingsApi } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import type { DropdownOption, ServiceCategory } from '@/lib/types';
import { ServiceTypeSelector } from '@/components/settings/ServiceTypeSelector';

const formSchema = z.object({
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
  county: z.string().optional(),
  description: z.string().optional(),
});

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
  currentUserId?: string; // Optional but kept for API compatibility
  initialClientId?: string; // Pre-select and lock client (e.g. when creating from client detail page)
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  initialClientId,
}: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  const [clients, setClients] = useState<
    {
      id: string;
      name: string;
      individualName?: string;
      county?: string | null;
    }[]
  >([]);
  const [leads, setLeads] = useState<
    { id: string; contactName: string; company: string }[]
  >([]);
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>(
    [],
  );
  const [riskOptions, setRiskOptions] = useState<DropdownOption[]>(
    [],
  );
  const [countyOptions, setCountyOptions] = useState<
    DropdownOption[]
  >([]);
  const [pendingTeamMemberIds, setPendingTeamMemberIds] = useState<
    string[]
  >([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    string[]
  >([]);
  const [selectedServiceTypeIds, setSelectedServiceTypeIds] =
    useState<string[]>([]);

  const { data: serviceCategories = [] } = useQuery<
    ServiceCategory[]
  >({
    queryKey: ['service-categories'],
    queryFn: () => settingsApi.getServiceCategories(),
    staleTime: 10 * 60 * 1000,
  });

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id],
    );
  }

  function toggleServiceType(id: string) {
    setSelectedServiceTypeIds((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id],
    );
  }

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      clientId: initialClientId ?? '',
      name: '',
      status: '',
      contractedValue: 0,
      endOfProjectValue: 0,
    },
  });

  // Fetch clients, users, and stages on mount
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const [clientsData, leadsData, usersRes, stages] =
            await Promise.all([
              clientsApi.getAll(),
              leadsApi.getAll(),
              usersApi.getUsersDirectory(),
              pipelineApi.getStages('project'),
            ]);
          const mappedClients = clientsData.map((c) => ({
            ...c,
            individualName: c.individualName ?? undefined,
          }));
          setClients(mappedClients);
          setLeads(Array.isArray(leadsData) ? leadsData : []);
          setUsers(usersRes.users || []);
          setProjectStages(stages);
          setIsLoadingStages(false);

          // If a client is pre-selected, auto-fill county from that client
          if (initialClientId) {
            form.setValue('clientId', initialClientId);
            const preselected = mappedClients.find((c) => c.id === initialClientId);
            if (preselected?.county) form.setValue('county', preselected.county);
          }
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-select first stage once stages are loaded
  useEffect(() => {
    if (projectStages.length > 0 && !form.getValues('status')) {
      form.setValue('status', projectStages[0].name, {
        shouldDirty: true,
      });
    }
  }, [projectStages]);

  // Auto-generate name and populate county when client changes
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      if (client.county) form.setValue('county', client.county);
    }
    form.setValue('clientId', clientId);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      await projectsApi.create({
        ...values,
        contractedValue: Number(values.contractedValue),
        endOfProjectValue: values.endOfProjectValue
          ? Number(values.endOfProjectValue)
          : undefined,
        leadId: values.leadId || undefined,
        estimatedDueDate: values.estimatedDueDate
          ? new Date(values.estimatedDueDate).toISOString()
          : undefined,
        closedDate: values.closedDate
          ? new Date(values.closedDate).toISOString()
          : undefined,
        teamMemberIds:
          pendingTeamMemberIds.length > 0
            ? pendingTeamMemberIds
            : undefined,
        categoryIds:
          selectedCategoryIds.length > 0
            ? selectedCategoryIds
            : undefined,
        serviceTypeIds:
          selectedServiceTypeIds.length > 0
            ? selectedServiceTypeIds
            : undefined,
      });
      toast.success('Project created successfully');
      onProjectCreated();
      onOpenChange(false);
      form.reset();
      setPendingTeamMemberIds([]);
      setSelectedCategoryIds([]);
      setSelectedServiceTypeIds([]);
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pms = users;

  const availableUsers = users.filter(
    (u) => !pendingTeamMemberIds.includes(u.id),
  );
  const addedMembers = users.filter((u) =>
    pendingTeamMemberIds.includes(u.id),
  );

  function addTeamMember(userId: string) {
    if (userId && !pendingTeamMemberIds.includes(userId)) {
      setPendingTeamMemberIds((prev) => [...prev, userId]);
    }
  }

  function removeTeamMember(userId: string) {
    setPendingTeamMemberIds((prev) =>
      prev.filter((id) => id !== userId),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialClientId
              ? `Create Project for ${clients.find((c) => c.id === initialClientId)?.name ?? clients.find((c) => c.id === initialClientId)?.individualName ?? 'Customer'}`
              : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Client - Required (hidden when pre-selected via initialClientId) */}
              {!initialClientId && (
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select
                        onValueChange={handleClientChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem
                              key={client.id}
                              value={client.id}>
                              {client.name
                                ? `${client.name}`
                                : client.individualName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Linked Prospective Project (Lead) */}
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Prospective Project</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(
                          val === 'none' ? undefined : val,
                        )
                      }
                      value={field.value ?? 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.contactName} — {lead.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Project Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Office Renovation"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stage */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingStages}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingStages
                                ? 'Loading stages…'
                                : 'Select stage'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectStages.map((stage) => (
                          <SelectItem
                            key={stage.id}
                            value={stage.name}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        type="number"
                        min="0"
                        step="0.01"
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
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        value={field.value ?? 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? 0
                              : e.target.value,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Est Due Date */}
              <FormField
                control={form.control}
                name="estimatedDueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Due Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick a date"
                      />
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
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Pick a date"
                      />
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
                <ServiceTypeSelector
                  categories={serviceCategories}
                  selectedCategoryIds={selectedCategoryIds}
                  selectedServiceTypeIds={selectedServiceTypeIds}
                  onCategoryToggle={toggleCategory}
                  onServiceTypeToggle={toggleServiceType}
                />
              </div>

              {/* Risk Status */}
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
                        onOptionsChange={setRiskOptions}
                        onOptionCreated={(label) =>
                          settingsApi.createDropdownOption({
                            category: 'project_risk_status',
                            value: label
                              .toLowerCase()
                              .replace(/\s+/g, '_'),
                            label,
                          })
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
                        users={pms}
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
            </div>

            <FormField
              control={form.control}
              name="county"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>County</FormLabel>
                  <FormControl>
                    <CreatableSelect
                      options={countyOptions}
                      value={field.value || undefined}
                      onChange={field.onChange}
                      placeholder="Select county"
                      onOptionsChange={setCountyOptions}
                      onOptionCreated={(label) =>
                        settingsApi.createDropdownOption({
                          category: 'county',
                          value: label
                            .toLowerCase()
                            .replace(/[.\s]+/g, '_'),
                          label,
                        })
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Project details..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Members */}
            {users.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    Team Members
                  </span>
                </div>

                {addedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {addedMembers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
                        <span className="text-sm font-medium">
                          {u.name}
                        </span>
                        {u.role && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[10px]">
                            {u.role}
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTeamMember(u.id)}
                          className="ml-0.5 text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {availableUsers.length > 0 && (
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (val) addTeamMember(val);
                    }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Add a team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                          {u.role && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {u.role}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
