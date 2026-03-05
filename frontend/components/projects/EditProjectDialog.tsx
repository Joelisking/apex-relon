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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi, type Project } from '@/lib/api/projects-client';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
import { clientsApi, leadsApi, settingsApi } from '@/lib/api/client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import type { DropdownOption } from '@/lib/types';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  clientId: z.string().min(1, 'Client is required'),
  leadId: z.string().optional(),
  status: z.string(),
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  endOfProjectValue: z.coerce.number().optional().nullable(),
  estimatedDueDate: z.string().optional(),
  closedDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  designerId: z.string().optional(),
  qsId: z.string().optional(),
  riskStatus: z.string().optional(),
  description: z.string().optional(),
  executingCompany: z.string().optional(),
});

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (updated: Project) => void;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<
    { id: string; name: string; individualName?: string }[]
  >([]);
  const [leads, setLeads] = useState<
    { id: string; contactName: string; company: string }[]
  >([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);
  const [riskOptions, setRiskOptions] = useState<DropdownOption[]>(
    [],
  );
  const [executingCompanyOptions, setExecutingCompanyOptions] =
    useState<DropdownOption[]>([]);

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: project.name,
      clientId: project.clientId,
      leadId: project.leadId ?? undefined,
      status: project.status ?? 'Planning',
      contractedValue: project.contractedValue ?? 0,
      endOfProjectValue: project.endOfProjectValue ?? undefined,
      estimatedDueDate: toDateInput(project.estimatedDueDate),
      closedDate: toDateInput(project.closedDate),
      projectManagerId: project.projectManagerId ?? undefined,
      designerId: project.designerId ?? undefined,
      qsId: project.qsId ?? undefined,
      riskStatus: project.riskStatus ?? 'On Track',
      description: project.description ?? '',
      executingCompany: project.executingCompany ?? undefined,
    },
  });

  // Re-sync form when project changes (e.g. dialog re-opened for a different project)
  useEffect(() => {
    form.reset({
      name: project.name,
      clientId: project.clientId,
      leadId: project.leadId ?? undefined,
      status: project.status ?? 'Planning',
      contractedValue: project.contractedValue ?? 0,
      endOfProjectValue: project.endOfProjectValue ?? undefined,
      estimatedDueDate: toDateInput(project.estimatedDueDate),
      closedDate: toDateInput(project.closedDate),
      projectManagerId: project.projectManagerId ?? undefined,
      designerId: project.designerId ?? undefined,
      qsId: project.qsId ?? undefined,
      riskStatus: project.riskStatus ?? 'On Track',
      description: project.description ?? '',
      executingCompany: project.executingCompany ?? undefined,
    });
  }, [project.id]);

  useEffect(() => {
    pipelineApi.getStages('project').then(setProjectStages).catch(console.error);
    settingsApi
      .getDropdownOptions('project_risk_status')
      .then(setRiskOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('executing_company')
      .then(setExecutingCompanyOptions)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      try {
        const [clientsData, leadsData, usersRes] = await Promise.all([
          clientsApi.getAll(),
          leadsApi.getAll(),
          usersApi.getUsers(),
        ]);

        setClients(
          clientsData.map((c) => ({
            ...c,
            individualName: c.individualName ?? undefined,
          })),
        );
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setUsers(usersRes.users || []);
      } catch (error) {
        console.error('Failed to load form data', error);
      }
    };
    fetchData();
  }, [open]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const updated = await projectsApi.update(project.id, {
        ...values,
        contractedValue: Number(values.contractedValue),
        endOfProjectValue:
          values.endOfProjectValue != null
            ? Number(values.endOfProjectValue)
            : undefined,
        leadId:
          values.leadId && values.leadId !== 'none'
            ? values.leadId
            : undefined,
        estimatedDueDate: values.estimatedDueDate
          ? new Date(values.estimatedDueDate).toISOString()
          : undefined,
        closedDate: values.closedDate
          ? new Date(values.closedDate).toISOString()
          : undefined,
      });
      toast.success('Project updated successfully');
      onProjectUpdated(updated);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const designers = users.filter((u) => u.role === 'DESIGNER');
  const qss = users.filter((u) => u.role === 'QS');
  const pms = users.filter((u) =>
    ['ADMIN', 'CEO', 'SALES', 'BDM'].includes(u.role),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Client */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem
                            key={client.id}
                            value={client.id}>
                            {client.individualName
                              ? `${client.individualName} (${client.name})`
                              : client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Linked Prospective Project */}
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

              {/* Executing Company */}
              <FormField
                control={form.control}
                name="executingCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Executing Company</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(
                          val === 'none' ? undefined : val,
                        )
                      }
                      value={field.value ?? 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {executingCompanyOptions.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectStages.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
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
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : e.target.value,
                          )
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

              {/* Risk Status */}
              <FormField
                control={form.control}
                name="riskStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risk Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? 'On Track'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(riskOptions.length > 0
                          ? riskOptions
                          : ['On Track', 'At Risk', 'Blocked'].map(
                              (r) => ({ value: r, label: r }),
                            )
                        ).map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PM" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pms.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Designer */}
              <FormField
                control={form.control}
                name="designerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designer</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Designer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {designers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* QS */}
              <FormField
                control={form.control}
                name="qsId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QS</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select QS" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {qss.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
