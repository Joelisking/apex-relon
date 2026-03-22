'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
import { pipelineApi, type PipelineStage } from '@/lib/api/pipeline-client';
import type { Lead } from '@/lib/types';

const formSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  status: z.string().default('Planning'),
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  endOfProjectValue: z.coerce.number().optional().nullable(),
  startDate: z.string().optional(),
  estimatedDueDate: z.string().optional(),
  closedDate: z.string().optional(),
  projectManagerId: z.string().optional(),
  designerId: z.string().optional(),
  qsId: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ConvertLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertLeadDialog({
  lead,
  open,
  onOpenChange,
}: ConvertLeadDialogProps) {
  const queryClient = useQueryClient();
  const [isConverting, setIsConverting] = useState(false);
  const [pmUsers, setPmUsers] = useState<UserResponse[]>([]);
  const [projectStages, setProjectStages] = useState<PipelineStage[]>([]);

  const leadClosedDate = lead?.dealClosedAt
    ? (typeof lead.dealClosedAt === 'string'
        ? lead.dealClosedAt.split('T')[0]
        : new Date(lead.dealClosedAt).toISOString().split('T')[0])
    : '';

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      projectName: lead?.projectName || (lead ? `${lead.company} - ${lead.serviceType?.name || 'Project'}` : ''),
      status: '',
      contractedValue: lead?.contractedValue ?? lead?.expectedValue ?? 0,
      endOfProjectValue: undefined,
      startDate: '',
      estimatedDueDate: '',
      closedDate: leadClosedDate,
      projectManagerId: lead?.assignedToId || '',
      designerId: '',
      qsId: '',
      description: lead?.notes || '',
    },
  });

  // Re-sync form when lead or open changes (handles LeadDetailView where component stays mounted)
  useEffect(() => {
    if (open && lead) {
      form.reset({
        projectName:
          lead.projectName ||
          `${lead.company} - ${lead.serviceType?.name || 'Project'}`,
        status: projectStages[0]?.name ?? '',
        contractedValue:
          lead.contractedValue ?? lead.expectedValue ?? 0,
        endOfProjectValue: undefined,
        startDate: '',
        estimatedDueDate: '',
        closedDate: lead.dealClosedAt
          ? (typeof lead.dealClosedAt === 'string'
              ? lead.dealClosedAt.split('T')[0]
              : new Date(lead.dealClosedAt).toISOString().split('T')[0])
          : '',
        projectManagerId: lead.assignedToId || '',
        designerId: '',
        qsId: '',
        description: lead.notes || '',
      });
    }
  }, [open, lead]);

  // Fetch users and stages when dialog opens
  useEffect(() => {
    if (open) {
      usersApi.getUsers(undefined, 'projects:create').then((res) => setPmUsers(res.users || [])).catch(console.error);
      pipelineApi.getStages('project').then((stages) => {
        setProjectStages(stages);
        if (stages.length > 0) {
          form.setValue('status', stages[0].name);
        }
      }).catch(console.error);
    }
  }, [open]);

  const pms = pmUsers;

  const handleSubmit = async (values: FormValues) => {
    if (!lead) return;
    setIsConverting(true);
    try {
      await api.clients.convertLead(
        lead.id,
        values.projectManagerId || undefined,
        {
          projectName: values.projectName,
          contractedValue: values.contractedValue,
          endOfProjectValue: values.endOfProjectValue ?? undefined,
          startDate: values.startDate || undefined,
          estimatedDueDate: values.estimatedDueDate || undefined,
          closedDate: values.closedDate || undefined,
          description: values.description || undefined,
          status: values.status,
        }
      );

      toast.success('Converted to active project!');
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (error) {
      toast.error('Failed to convert', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsConverting(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* <FolderOpen className="h-5 w-5 text-green-600" /> */}
            Convert to Active Project
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <span>Converting prospective project from</span>
            <Badge variant="secondary">{lead.company}</Badge>
            <span>— review and confirm project details below.</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Project Name */}
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
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
                        placeholder="Optional"
                        value={field.value ?? ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date */}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} placeholder="Pick a date" />
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
                          <SelectValue placeholder="Loading stages…" />
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

              {/* Project Manager */}
              <FormField
                control={form.control}
                name="projectManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === 'none' ? '' : val)
                      }
                      value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PM" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {pms.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Project details..."
                      className="resize-none"
                      rows={3}
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
                onClick={() => onOpenChange(false)}
                disabled={isConverting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isConverting}
                className="gap-2">
                {isConverting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Convert to Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
