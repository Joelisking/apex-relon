'use client';

import { useState, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsApi, settingsApi } from '@/lib/api/client';
import { contactsApi } from '@/lib/api/contacts-client';
import { useAuth } from '@/contexts/auth-context';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { MultiCreatableSelect } from '@/components/ui/multi-creatable-select';
import { ClientPicker } from '@/components/ui/client-picker';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import type {
  DropdownOption,
  Division,
  Lead,
} from '@/lib/types';
import { JobTypeSelector } from '@/components/settings/JobTypeSelector';
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
import {
  Loader2,
  Users,
  X,
} from 'lucide-react';
import { AddressAutocompleteWithParts } from '@/components/ui/address-autocomplete-parts';
import { UserPicker } from '@/components/ui/user-picker';
import { Checkbox } from '@/components/ui/checkbox';
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
  county?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  contacts?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }[];
}

// A known contact derived from a previous lead on the same client
interface KnownContact {
  name: string;
  email: string;
  phone: string;
}

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    role: string;
  };
  managers: UserOption[];
  allUsers?: UserOption[];
  clients?: ClientOption[];
  leads?: Lead[]; // existing leads used to suggest past contacts
  onLeadCreated?: (lead: Lead) => void;
}

const createLeadSchema = z.object({
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
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  stage: z.string().min(1, 'Stage is required'),
  jobTypeId: z.string().optional(),
  urgency: z.string().min(1, 'Urgency is required'),
  source: z.string().optional(),
  likelyStartDate: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

export function CreateLeadDialog({
  open,
  onOpenChange,
  currentUser,
  managers,
  allUsers = [],
  clients = [],
  leads = [],
  onLeadCreated,
}: CreateLeadDialogProps) {
  const { hasPermission } = useAuth();
  const canViewAllLeads = hasPermission('leads:view_all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<
    string[]
  >([]);
  const [selectedJobTypeIds, setSelectedJobTypeIds] =
    useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: divisions = [] } = useQuery<
    Division[]
  >({
    queryKey: ['divisions'],
    queryFn: () => settingsApi.getDivisions(),
    staleTime: 10 * 60 * 1000,
  });

  function toggleDivision(id: string) {
    setSelectedDivisionIds((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id],
    );
  }

  function toggleJobType(id: string) {
    setSelectedJobTypeIds((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id],
    );
  }

  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ['pipeline-stages', 'prospective_project'],
    queryFn: () => pipelineApi.getStages('prospective_project'),
    staleTime: 10 * 60 * 1000,
  });
  const [urgencyOptions, setUrgencyOptions] = useState<DropdownOption[]>([]);
  const [sourceOptions, setSourceOptions] = useState<DropdownOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<DropdownOption[]>([]);
  const [pendingTeamMemberIds, setPendingTeamMemberIds] = useState<
    string[]
  >([]);
  const [knownContacts, setKnownContacts] = useState<KnownContact[]>(
    [],
  );
  const [autoLinkedContactId, setAutoLinkedContactId] = useState<string | null>(null);
  const [useClientAddress, setUseClientAddress] = useState(false);
  const datalistId = useId();

  // Set stage to first pipeline stage whenever dialog opens
  useEffect(() => {
    if (!open || pipelineStages.length === 0) return;
    form.setValue('stage', pipelineStages[0].name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pipelineStages]);

  useEffect(() => {
    if (!open) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const form = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      contactName: '',
      email: '',
      phone: '',
      county: [],
      expectedValue: 0,
      contractedValue: undefined,
      projectName: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      stage: '',
      jobTypeId: '',
      urgency: '',
      source: '',
      likelyStartDate: '',
      notes: '',
      assignedTo: !canViewAllLeads ? currentUser.id : '',
      clientId: '',
    },
  });

  const watchedStage = form.watch('stage');
  const watchedClientId = form.watch('clientId');

  // Auto-fill contact fields and build known contacts list when client changes
  useEffect(() => {
    setUseClientAddress(false);
    form.setValue('address', '');
    form.setValue('city', '');
    form.setValue('state', '');
    form.setValue('zip', '');

    if (!watchedClientId) {
      setKnownContacts([]);
      return;
    }

    const client = clients.find((c) => c.id === watchedClientId);
    if (client) {
      const primaryContact = client.contacts?.[0];
      const contactName = primaryContact
        ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
        : client.individualName || '';
      form.setValue('contactName', contactName);
      form.setValue(
        'email',
        primaryContact?.email || client.email || '',
      );
      form.setValue(
        'phone',
        primaryContact?.phone || client.phone || '',
      );
      if (client.county) form.setValue('county', [client.county]);
      setAutoLinkedContactId(primaryContact?.id ?? null);
    } else {
      setAutoLinkedContactId(null);
    }

    const clientLeads = leads.filter(
      (l) => l.clientId === watchedClientId,
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
  }, [watchedClientId, leads]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill email/phone when a known contact name is typed/selected
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

  const selectedClient = clients.find(
    (c) => c.id === watchedClientId,
  );

  function parseClientAddress(full: string) {
    const parts = full.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return { street: '', city: '', state: '', zip: '' };
    if (parts.length === 1) return { street: parts[0], city: '', state: '', zip: '' };
    if (parts.length === 2) return { street: parts[0], city: parts[1], state: '', zip: '' };
    const street = parts[0];
    const city = parts[1];
    const stateZipRaw = parts.slice(2).join(', ').trim();
    const m = stateZipRaw.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    return {
      street,
      city,
      state: m ? m[1] : stateZipRaw,
      zip: m ? m[2] : '',
    };
  }

  function handleUseClientAddress(checked: boolean) {
    setUseClientAddress(checked);
    if (checked && selectedClient?.address) {
      const parsed = parseClientAddress(selectedClient.address);
      form.setValue('address', parsed.street);
      form.setValue('city', parsed.city);
      form.setValue('state', parsed.state);
      form.setValue('zip', parsed.zip);
    } else {
      form.setValue('address', '');
      form.setValue('city', '');
      form.setValue('state', '');
      form.setValue('zip', '');
    }
  }

  // Team members
  const addedMembers = allUsers.filter((u) =>
    pendingTeamMemberIds.includes(u.id),
  );
  const availableUsers = allUsers.filter(
    (u) => !pendingTeamMemberIds.includes(u.id),
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

  const onSubmit = async (data: CreateLeadFormData) => {
    setIsSubmitting(true);
    try {
      const lead = await leadsApi.create({
        contactName: data.contactName,
        company: selectedClient?.name || '',
        email: data.email || undefined,
        phone: data.phone || undefined,
        county: data.county?.length ? data.county : undefined,
        expectedValue: data.expectedValue,
        contractedValue: data.contractedValue ?? undefined,
        projectName: data.projectName,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        zip: data.zip || undefined,
        stage: data.stage,
        jobTypeId: selectedJobTypeIds[0] || undefined,
        categoryIds:
          selectedDivisionIds.length > 0
            ? selectedDivisionIds
            : undefined,
        jobTypeIds:
          selectedJobTypeIds.length > 0
            ? selectedJobTypeIds
            : undefined,
        urgency: data.urgency,
        source: data.source || undefined,
        likelyStartDate: data.likelyStartDate
          ? new Date(data.likelyStartDate)
          : undefined,
        notes: data.notes || undefined,
        assignedToId: data.assignedTo || undefined,
        clientId: data.clientId,
        teamMemberIds:
          pendingTeamMemberIds.length > 0
            ? pendingTeamMemberIds
            : undefined,
      });

      // Auto-link the primary contact from the selected client
      if (autoLinkedContactId) {
        try {
          await contactsApi.linkToLead(lead.id, autoLinkedContactId);
        } catch {
          // Non-fatal — lead was created successfully, contact link failed silently
        }
      }

      toast.success('Prospective project created', {
        description: `"${data.projectName}" has been added to the pipeline.`,
      });

      onLeadCreated?.(lead);
      form.reset();
      setAutoLinkedContactId(null);
      setPendingTeamMemberIds([]);
      setSelectedDivisionIds([]);
      setSelectedJobTypeIds([]);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred while creating the prospective project.';
      toast.error('Failed to create prospective project', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setAutoLinkedContactId(null);
    setPendingTeamMemberIds([]);
    setSelectedDivisionIds([]);
    setSelectedJobTypeIds([]);
    setUseClientAddress(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">
            Create Prospective Project
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a new prospective project and link it to an existing
            client.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6">
            {/* ── Project ─────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Project
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Customer{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <ClientPicker
                          clients={clients}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select a customer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Project Name{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., CR 500W – Boundary Survey"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t border-border/50" />

            {/* ── Contact ─────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Contact
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Jane Smith"
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
                          placeholder="jane@client.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
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
            </div>

            {/* Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Project Address
                </p>
                {selectedClient?.address && (
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox
                      checked={useClientAddress}
                      onCheckedChange={(checked) => handleUseClientAddress(!!checked)}
                    />
                    <span className="text-xs text-muted-foreground">Same as client address</span>
                  </label>
                )}
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AddressAutocompleteWithParts
                        value={field.value ?? ''}
                        placeholder="Street address"
                        onChange={(street, parts) => {
                          field.onChange(street);
                          if (parts) {
                            form.setValue('city', parts.city);
                            form.setValue('state', parts.state);
                            form.setValue('zip', parts.zip);
                          }
                        }}
                        disabled={useClientAddress}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="City" disabled={useClientAddress} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="State" disabled={useClientAddress} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="ZIP" disabled={useClientAddress} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border-t border-border/50" />

            {/* ── Pipeline ────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Pipeline
              </p>
              <div className="grid grid-cols-3 gap-3">
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

              {/* Project Type & Job Types — full width */}
              <JobTypeSelector
                categories={divisions}
                selectedCategoryIds={selectedDivisionIds}
                selectedJobTypeIds={selectedJobTypeIds}
                onCategoryToggle={toggleDivision}
                onJobTypeToggle={toggleJobType}
              />
            </div>

            <div className="border-t border-border/50" />

            {/* ── Assignment ──────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Assignment
              </p>
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

              {allUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Team Members
                    </span>
                  </div>
                  {addedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {addedMembers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
                          <span className="text-sm">{u.name}</span>
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
            </div>

            <div className="border-t border-border/50" />

            {/* ── Notes ───────────────────────────────────────────── */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional context, site details, special requirements…"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-1">
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
                    Creating…
                  </>
                ) : (
                  'Create Prospective Project'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
