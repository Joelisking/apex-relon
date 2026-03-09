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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects-client';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
import { clientsApi, leadsApi } from '@/lib/api/client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';

const formSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  leadId: z.string().optional(),
  name: z.string().min(1, 'Project name is required'),
  status: z.string().default('Planning'),
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  endOfProjectValue: z.coerce.number().optional().nullable(),
  estimatedDueDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  description: z.string().optional(),
});

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
  currentUserId?: string; // Optional but kept for API compatibility
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<
    { id: string; name: string; individualName?: string }[]
  >([]);
  const [leads, setLeads] = useState<
    { id: string; contactName: string; company: string }[]
  >([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      status: 'Planning',
      contractedValue: 0,
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
              usersApi.getUsers(),
              pipelineApi.getStages('project'),
            ]);
          setClients(clientsData.map((c) => ({ ...c, individualName: c.individualName ?? undefined })));
          setLeads(Array.isArray(leadsData) ? leadsData : []);
          setUsers(usersRes.users || []);
          setProjectStages(stages);
          // Default status to first stage
          if (stages.length > 0 && !form.getValues('status')) {
            form.setValue('status', stages[0].name);
          }
        } catch (error) {
          console.error('Failed to load form data', error);
        }
      };
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-generate name when client changes
  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client && !form.getValues('name')) {
      const displayName =
        client.individualName || client.name;
      form.setValue('name', `${displayName} - Project`);
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
      });
      toast.success('Project created successfully');
      onProjectCreated();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to create project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pms = users.filter((u) =>
    ['ADMIN', 'CEO', 'SALES', 'BDM'].includes(u.role),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Client - Required */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select
                      onValueChange={handleClientChange}
                      defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projectStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.name}>
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

              {/* Est Due Date - Native Date Input */}
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

              {/* Project Manager */}
              <FormField
                control={form.control}
                name="projectManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}>
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
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
