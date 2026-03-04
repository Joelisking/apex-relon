'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Trophy, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import type { Lead } from '@/lib/types';

const formSchema = z.object({
  contractedValue: z.coerce.number().min(0, 'Value must be positive'),
  dealClosedAt: z.string().min(1, 'Close date is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface CloseWonDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedLead: Lead, convertToProject: boolean) => void;
}

export function CloseWonDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: CloseWonDialogProps) {
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      contractedValue: 0,
      dealClosedAt: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (open && lead) {
      form.reset({
        contractedValue:
          lead.contractedValue ?? lead.expectedValue ?? 0,
        dealClosedAt: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, lead, form]);

  const handleSubmit = async (
    values: FormValues,
    convertToProject: boolean,
  ) => {
    if (!lead) return;
    try {
      await api.leads.update(lead.id, {
        stage: 'Won',
        contractedValue: values.contractedValue,
        dealClosedAt: values.dealClosedAt,
      });
      const updatedLead: Lead = {
        ...lead,
        contractedValue: values.contractedValue,
        dealClosedAt: values.dealClosedAt,
      };
      onOpenChange(false);
      onSuccess(updatedLead, convertToProject);
    } catch {
      toast.error('Failed to update deal details');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Close Won Deal</DialogTitle>
          </div>
          <DialogDescription>
            {lead?.company}
            {lead?.projectName ? ` · ${lead.projectName}` : ''}
            {lead?.expectedValue != null &&
              ` — expected value $${lead.expectedValue.toLocaleString()}.`}
          </DialogDescription>
        </DialogHeader>

        {lead?.expectedValue != null && (
          <div className="rounded-lg border bg-muted/50 px-3.5 py-2.5">
            <p className="text-xs font-medium text-muted-foreground">
              Expected value
            </p>
            <p className="text-lg font-semibold tabular-nums">
              ${lead.expectedValue.toLocaleString()}
            </p>
          </div>
        )}

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="contractedValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contracted Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dealClosedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Close Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      clearable={false}
                      placeholder="Pick close date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="sm:mr-auto">
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={form.handleSubmit((values) =>
                  handleSubmit(values, false),
                )}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="mr-2 h-4 w-4" />
                )}
                Mark as Won
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={form.handleSubmit((values) =>
                  handleSubmit(values, true),
                )}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-2 h-4 w-4" />
                )}
                Won & Convert
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
