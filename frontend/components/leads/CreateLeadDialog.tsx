'use client';

import { useState, useEffect, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { leadsApi, settingsApi } from '@/lib/api/client';
import {
  pipelineApi,
  type PipelineStage,
} from '@/lib/api/pipeline-client';
import type { DropdownOption } from '@/lib/types';
import type { ServiceType, Lead } from '@/lib/types';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PendingRep {
  name: string;
  phone: string;
  email: string;
}

interface UserOption {
  id: string;
  name: string;
  teamName?: string;
}

interface ClientOption {
  id: string;
  name: string;
  individualName?: string;
  segment?: string;
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
  serviceTypes?: ServiceType[];
  designers?: UserOption[];
  qsUsers?: UserOption[];
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
  expectedValue: z.number().min(0, 'Value must be positive'),
  contractedValue: z
    .number()
    .min(0, 'Value must be positive')
    .optional(),
  projectName: z.string().min(1, 'Project name is required'),
  stage: z.string().min(1, 'Stage is required'),
  serviceTypeId: z.string().optional(),
  urgency: z.enum(['Low', 'Medium', 'High']),
  likelyStartDate: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().min(1, 'Client is required'),
  qsId: z.string().optional(),
  designerId: z.string().optional(),
  executingCompany: z.string().optional(),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

export function CreateLeadDialog({
  open,
  onOpenChange,
  currentUser,
  managers,
  serviceTypes = [],
  designers = [],
  qsUsers = [],
  clients = [],
  leads = [],
  onLeadCreated,
}: CreateLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<
    PipelineStage[]
  >([]);
  const [urgencyOptions, setUrgencyOptions] = useState<
    DropdownOption[]
  >([]);
  const [executingCompanyOptions, setExecutingCompanyOptions] =
    useState<DropdownOption[]>([]);
  const [pendingReps, setPendingReps] = useState<PendingRep[]>([]);
  const [newRep, setNewRep] = useState<PendingRep>({
    name: '',
    phone: '',
    email: '',
  });
  const [knownContacts, setKnownContacts] = useState<KnownContact[]>(
    [],
  );
  const datalistId = useId();

  useEffect(() => {
    pipelineApi
      .getStages('prospective_project')
      .then((stages) => {
        setPipelineStages(stages);
        if (
          stages.length > 0 &&
          !stages.find((s) => s.name === form.getValues('stage'))
        ) {
          form.setValue('stage', stages[0].name);
        }
      })
      .catch(console.error);
    settingsApi
      .getDropdownOptions('urgency')
      .then(setUrgencyOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('executing_company')
      .then(setExecutingCompanyOptions)
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      contactName: '',
      email: '',
      phone: '',
      expectedValue: 0,
      contractedValue: undefined,
      projectName: '',
      stage: 'New',
      serviceTypeId: '',
      urgency: 'Medium',
      likelyStartDate: '',
      notes: '',
      assignedTo: currentUser.role === 'BDM' ? currentUser.id : '',
      clientId: '',
      qsId: '',
      designerId: '',
      executingCompany: '',
    },
  });

  const watchedStage = form.watch('stage');
  const watchedClientId = form.watch('clientId');

  // Derive known contacts from past leads whenever the selected client changes
  useEffect(() => {
    if (!watchedClientId) {
      setKnownContacts([]);
      return;
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
  }, [watchedClientId, leads]);

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

  const onSubmit = async (data: CreateLeadFormData) => {
    if (
      newRep.name.trim() ||
      newRep.phone.trim() ||
      newRep.email.trim()
    ) {
      toast.warning('Rep not added', {
        description:
          'You have rep details filled in but haven\'t clicked "Add Rep". Add the rep or clear the fields before submitting.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const lead = await leadsApi.create({
        contactName: data.contactName,
        company: selectedClient?.name || '',
        email: data.email || undefined,
        phone: data.phone || undefined,
        expectedValue: data.expectedValue,
        contractedValue: data.contractedValue ?? undefined,
        projectName: data.projectName,
        stage: data.stage,
        serviceTypeId: data.serviceTypeId || undefined,
        urgency: data.urgency,
        likelyStartDate: data.likelyStartDate
          ? new Date(data.likelyStartDate)
          : undefined,
        notes: data.notes || undefined,
        assignedToId: data.assignedTo || undefined,
        clientId: data.clientId,
        qsId: data.qsId || undefined,
        designerId: data.designerId || undefined,
        executingCompany: data.executingCompany || undefined,
      });

      // Create any reps that were added during the form
      if (pendingReps.length > 0) {
        await Promise.all(
          pendingReps.map((rep) =>
            leadsApi.createRep(lead.id, {
              name: rep.name,
              phone: rep.phone || undefined,
              email: rep.email || undefined,
            }),
          ),
        );
      }

      toast.success('Prospective project created', {
        description: `"${data.projectName}" has been added to the pipeline.`,
      });

      onLeadCreated?.(lead);
      form.reset();
      setPendingReps([]);
      setNewRep({ name: '', phone: '', email: '' });
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
    setPendingReps([]);
    setNewRep({ name: '', phone: '', email: '' });
    onOpenChange(false);
  };

  function addPendingRep() {
    if (!newRep.name.trim()) return;
    setPendingReps((prev) => [...prev, { ...newRep }]);
    setNewRep({ name: '', phone: '', email: '' });
  }

  function removePendingRep(index: number) {
    setPendingReps((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prospective Project</DialogTitle>
          <DialogDescription>
            Add a new prospective project and link it to an existing
            client.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4">
            {/* Client - required */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
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

            {/* Project Name - full width to signal importance */}
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

            {/* Executing Company */}
            <FormField
              control={form.control}
              name="executingCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Executing Company</FormLabel>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === 'none' ? '' : val)
                    }
                    value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {executingCompanyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Contact Name with autocomplete from previous leads */}
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+61 400 000 000"
                        {...field}
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

            {watchedStage === 'Won' && (
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
                        {pipelineStages.length > 0
                          ? pipelineStages.map((s) => (
                              <SelectItem key={s.name} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))
                          : [
                              'New',
                              'Contacted',
                              'Quoted',
                              'Negotiation',
                              'Won',
                              'Lost',
                            ].map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
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
                name="serviceTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? '' : val)
                      }
                      value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {serviceTypes.map((st) => (
                          <SelectItem key={st.id} value={st.id}>
                            {st.name}
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {urgencyOptions.length > 0
                          ? urgencyOptions.map((o) => (
                              <SelectItem
                                key={o.value}
                                value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))
                          : ['Low', 'Medium', 'High'].map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Assignment */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? '' : val)
                      }
                      value={field.value || 'none'}
                      disabled={currentUser.role === 'BDM'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} {m.teamName && `(${m.teamName})`}
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
                name="designerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designer </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? '' : val)
                      }
                      value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select designer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {designers.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
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
                name="qsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QS </FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? '' : val)
                      }
                      value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select QS" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {qsUsers.map((q) => (
                          <SelectItem key={q.id} value={q.id}>
                            {q.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Project Reps */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  Project Reps
                </span>
              </div>

              {pendingReps.length > 0 && (
                <div className="space-y-2">
                  {pendingReps.map((rep, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium">
                          {rep.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[rep.phone, rep.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removePendingRep(index)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Name *"
                    className="h-8 text-sm"
                    value={newRep.name}
                    onChange={(e) =>
                      setNewRep((r) => ({
                        ...r,
                        name: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPendingRep();
                      }
                    }}
                  />
                  <Input
                    placeholder="Phone"
                    className="h-8 text-sm"
                    value={newRep.phone}
                    onChange={(e) =>
                      setNewRep((r) => ({
                        ...r,
                        phone: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPendingRep();
                      }
                    }}
                  />
                  <Input
                    placeholder="Email"
                    className="h-8 text-sm"
                    value={newRep.email}
                    onChange={(e) =>
                      setNewRep((r) => ({
                        ...r,
                        email: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPendingRep();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!newRep.name.trim()}
                  onClick={addPendingRep}>
                  <Plus className="h-3 w-3" />
                  Add Rep
                </Button>
              </div>
            </div>

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
                    Creating...
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
