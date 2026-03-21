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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  managers: UserOption[];
  serviceTypes?: ServiceType[];
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
  managers,
  serviceTypes = [],
  designers = [],
  qsUsers = [],
  clients = [],
  leads = [],
  onLeadUpdated,
}: EditLeadDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<
    PipelineStage[]
  >([]);
  const [urgencyOptions, setUrgencyOptions] = useState<
    DropdownOption[]
  >([]);
  const [executingCompanyOptions, setExecutingCompanyOptions] =
    useState<DropdownOption[]>([]);
  const [knownContacts, setKnownContacts] = useState<KnownContact[]>(
    [],
  );
  const datalistId = useId();

  useEffect(() => {
    pipelineApi
      .getStages('prospective_project')
      .then(setPipelineStages)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('urgency')
      .then(setUrgencyOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('executing_company')
      .then(setExecutingCompanyOptions)
      .catch(console.error);
  }, []);

  const buildDefaults = (l: Lead): EditLeadFormData => ({
    contactName: l.contactName || '',
    email: l.email || '',
    phone: l.phone || '',
    expectedValue: l.expectedValue ?? 0,
    contractedValue: l.contractedValue ?? undefined,
    projectName: l.projectName || '',
    stage: l.stage || 'New',
    serviceTypeId: l.serviceTypeId || '',
    urgency: (l.urgency as 'Low' | 'Medium' | 'High') || 'Medium',
    likelyStartDate: toDateString(l.likelyStartDate),
    notes: l.notes || '',
    assignedTo:
      l.assignedToId ||
      (currentUser.role === 'BDM' ? currentUser.id : ''),
    clientId: l.clientId || '',
    qsId: l.qsId || '',
    designerId: l.designerId || '',
    executingCompany: l.executingCompany || '',
  });

  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadSchema),
    defaultValues: buildDefaults(lead),
  });

  // Re-populate form when the lead prop changes (e.g. dialog opens for a different lead)
  useEffect(() => {
    form.reset(buildDefaults(lead));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const watchedClientId = form.watch('clientId');
  const watchedStage = form.watch('stage');

  // Derive known contacts from past leads on the same client
  useEffect(() => {
    if (!watchedClientId) {
      setKnownContacts([]);
      return;
    }
    const clientLeads = leads.filter(
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
  }, [watchedClientId, leads, lead.id]);

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

  const onSubmit = async (data: EditLeadFormData) => {
    setIsSubmitting(true);
    try {
      const updated = await leadsApi.update(lead.id, {
        contactName: data.contactName,
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
                    Client <span className="text-red-500">*</span>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
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
                    <FormLabel>Designer</FormLabel>
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
                    <FormLabel>QS</FormLabel>
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
