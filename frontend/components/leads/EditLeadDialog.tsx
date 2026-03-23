'use client';

import { useState, useEffect, useId, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsApi, settingsApi } from '@/lib/api/client';
import { useAuth } from '@/contexts/auth-context';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { MultiCreatableSelect } from '@/components/ui/multi-creatable-select';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import type { DropdownOption, ServiceCategory, Lead } from '@/lib/types';
import { ServiceTypeSelector } from '@/components/settings/ServiceTypeSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Users, X } from 'lucide-react';
import { UserPicker } from '@/components/ui/user-picker';
import { toast } from 'sonner';

interface UserOption {
  id: string;
  name: string;
  role?: string;
  teamName?: string;
}

interface ClientOption {
  id: string;
  name: string;
  individualName?: string;
  segment?: string;
}

interface KnownContact {
  name: string;
  email: string;
  phone: string;
}

interface EditLeadDialogProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { id: string; role: string };
  managers?: UserOption[];
  allUsers?: UserOption[];
  designers?: UserOption[];
  qsUsers?: UserOption[];
  clients?: ClientOption[];
  leads?: Lead[];
  onLeadUpdated?: (lead: Lead) => void;
}

const editLeadSchema = z.object({
  contactName: z
    .string()
    .min(2, 'Contact name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  county: z.array(z.string()).optional(),
  expectedValue: z.number().min(0, 'Value must be positive'),
  contractedValue: z
    .number()
    .min(0, 'Value must be positive')
    .optional(),
  projectName: z.string().min(1, 'Project name is required'),
  stage: z.string().min(1, 'Stage is required'),
  serviceTypeId: z.string().optional(),
  urgency: z.string().min(1, 'Urgency is required'),
  source: z.string().optional(),
  likelyStartDate: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
});

type EditLeadFormData = z.infer<typeof editLeadSchema>;

function toDateString(
  value: string | Date | null | undefined,
): string {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function EditLeadDialog({
  lead,
  open,
  onOpenChange,
  currentUser,
  managers = [],
  allUsers = [],
  clients = [],
  leads = [],
  onLeadUpdated,
}: EditLeadDialogProps) {
  const { hasPermission } = useAuth();
  const canViewAllLeads = hasPermission('leads:view_all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(lead.categoryIds ?? []);
  const [selectedServiceTypeIds, setSelectedServiceTypeIds] = useState<string[]>(lead.serviceTypeIds ?? []);

  const { data: serviceCategories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['service-categories'],
    queryFn: () => settingsApi.getServiceCategories(),
    staleTime: 10 * 60 * 1000,
  });

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function toggleServiceType(id: string) {
    setSelectedServiceTypeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () => pipelineApi.getStages('prospective_project'),
    staleTime: 10 * 60 * 1000,
  });
  const [countyOptions, setCountyOptions] = useState<DropdownOption[]>([]);
  const [urgencyOptions, setUrgencyOptions] = useState<
    DropdownOption[]
  >([]);
  const [sourceOptions, setSourceOptions] = useState<DropdownOption[]>([]);
  const [knownContacts, setKnownContacts] = useState<KnownContact[]>(
    [],
  );
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);

  const datalistId = useId();

  useEffect(() => {
    settingsApi
      .getDropdownOptions('urgency')
      .then(setUrgencyOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('lead_source')
      .then(setSourceOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('county')
      .then(setCountyOptions)
      .catch(console.error);
  }, []);

  const buildDefaults = (l: Lead): EditLeadFormData => ({
    contactName: l.contactName || '',
    email: l.email || '',
    phone: l.phone || '',
    county: Array.isArray(l.county) ? l.county : l.county ? [l.county] : [],
    expectedValue: l.expectedValue ?? 0,
    contractedValue: l.contractedValue ?? undefined,
    projectName: l.projectName || '',
    stage: l.stage || 'New',
    serviceTypeId: l.serviceTypeId || '',
    urgency: l.urgency || 'Medium',
    source: l.source || '',
    likelyStartDate: toDateString(l.likelyStartDate),
    notes: l.notes || '',
    assignedTo:
      l.assignedToId ||
      (!canViewAllLeads ? currentUser.id : ''),
    clientId: l.clientId || '',
  });

  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: buildDefaults(lead),
  });

  // Re-populate form and team members when lead prop changes
  useEffect(() => {
    form.reset(buildDefaults(lead));
    setTeamMemberIds(
      (lead.teamMembers ?? []).map((tm) => tm.userId),
    );
    setSelectedCategoryIds(lead.categoryIds ?? []);
    setSelectedServiceTypeIds(lead.serviceTypeIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const watchedClientId = form.watch('clientId');
  const watchedStage = form.watch('stage');

  // Derive known contacts from past leads on the same client
  const stableLeads = useMemo(() => leads, [JSON.stringify(leads.map(l => l.id))]);
  useEffect(() => {
    if (!watchedClientId) {
      setKnownContacts([]);
      return;
    }
    const clientLeads = stableLeads.filter(
      (l) => l.clientId === watchedClientId && l.id !== lead.id,
    );
    const seen = new Set<string>();
    const contacts: KnownContact[] = [];
    for (const l of clientLeads) {
      if (l.contactName && !seen.has(l.contactName.toLowerCase())) {
        seen.add(l.contactName.toLowerCase());
        contacts.push({
          name: l.contactName,
          email: l.email || '',
          phone: l.phone || '',
        });
      }
    }
    setKnownContacts(contacts);
  }, [watchedClientId, stableLeads, lead.id]);

  function handleContactNameChange(value: string) {
    form.setValue('contactName', value);
    const match = knownContacts.find(
      (c) => c.name.toLowerCase() === value.toLowerCase(),
    );
    if (match) {
      if (match.email) form.setValue('email', match.email);
      if (match.phone) form.setValue('phone', match.phone);
    }
  }

  // Team members
  const addedMembers = allUsers.filter((u) =>
    teamMemberIds.includes(u.id),
  );
  const availableUsers = allUsers.filter(
    (u) => !teamMemberIds.includes(u.id),
  );

  async function addTeamMember(userId: string) {
    if (!userId || teamMemberIds.includes(userId)) return;
    try {
      await leadsApi.addTeamMember(lead.id, userId);
      setTeamMemberIds((prev) => [...prev, userId]);
    } catch {
      toast.error('Failed to add team member');
    }
  }

  async function removeTeamMember(userId: string) {
    try {
      await leadsApi.removeTeamMember(lead.id, userId);
      setTeamMemberIds((prev) => prev.filter((id) => id !== userId));
    } catch {
      toast.error('Failed to remove team member');
    }
  }

  const onSubmit = async (data: EditLeadFormData) => {
    setIsSubmitting(true);
    try {
      const updated = await leadsApi.update(lead.id, {
        contactName: data.contactName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        county: data.county?.length ? data.county : undefined,
        expectedValue: data.expectedValue,
        contractedValue: data.contractedValue ?? undefined,
        projectName: data.projectName,
        stage: data.stage,
        serviceTypeId: selectedServiceTypeIds[0] || undefined,
        categoryIds: selectedCategoryIds,
        serviceTypeIds: selectedServiceTypeIds,
        urgency: data.urgency,
        source: data.source || undefined,
        likelyStartDate: data.likelyStartDate
          ? new Date(data.likelyStartDate)
          : undefined,
        notes: data.notes || undefined,
        assignedToId: data.assignedTo || undefined,
        clientId: data.clientId,
      });

      toast.success('Prospective project updated', {
        description: `"${data.projectName}" has been updated.`,
      });

      onLeadUpdated?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the prospective project.';
      toast.error('Failed to update prospective project', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prospective Project</DialogTitle>
          <DialogDescription>
            Update the details for this prospective project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4">
            {/* Client */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Customer <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.individualName
                            ? `${c.individualName} (${c.name})`
                            : c.name}
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
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project Name{' '}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Office Fitout - Level 3"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Contact Name with autocomplete */}
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        list={datalistId}
                        value={field.value}
                        onChange={(e) =>
                          handleContactNameChange(e.target.value)
                        }
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    {knownContacts.length > 0 && (
                      <datalist id={datalistId}>
                        {knownContacts.map((c) => (
                          <option key={c.name} value={c.name} />
                        ))}
                      </datalist>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@acme.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 555 000 0000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="county"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>County</FormLabel>
                    <FormControl>
                      <MultiCreatableSelect
                        options={countyOptions}
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Select counties"
                        onOptionsChange={setCountyOptions}
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

              <FormField
                control={form.control}
                name="expectedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          field.onChange(
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="likelyStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Likely Start Date</FormLabel>
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
            </div>

            {(watchedStage === 'Closed Won' || watchedStage === 'Won') && (
              <FormField
                control={form.control}
                name="contractedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contracted Value ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <CreatableSelect
                      options={sourceOptions}
                      value={field.value || undefined}
                      onChange={field.onChange}
                      placeholder="How was this sourced?"
                      onOptionsChange={setSourceOptions}
                      onOptionCreated={(label) =>
                        settingsApi.createDropdownOption({
                          category: 'lead_source',
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelineStages.map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ServiceTypeSelector
                categories={serviceCategories}
                selectedCategoryIds={selectedCategoryIds}
                selectedServiceTypeIds={selectedServiceTypeIds}
                onCategoryToggle={toggleCategory}
                onServiceTypeToggle={toggleServiceType}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency</FormLabel>
                    <FormControl>
                      <CreatableSelect
                        options={urgencyOptions}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Select urgency"
                        onOptionsChange={setUrgencyOptions}
                        onOptionCreated={(label) =>
                          settingsApi.createDropdownOption({
                            category: 'urgency',
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
            </div>

            {/* Assignment */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Manager</FormLabel>
                  <FormControl>
                    <UserPicker
                      users={managers}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="None"
                      allowUnassigned
                      unassignedLabel="None"
                      disabled={!canViewAllLeads}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional information about this project..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Members */}
            {allUsers.length > 0 && (
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
