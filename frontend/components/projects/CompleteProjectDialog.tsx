'use client';

import { useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectsApi, type Project } from '@/lib/api/projects-client';

const formSchema = z.object({
  endOfProjectValue: z.coerce
    .number()
    .min(0, 'Value must be positive'),
  completedDate: z.string().min(1, 'Completed date is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface CompleteProjectDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedProject: Project) => void;
}

export function CompleteProjectDialog({
  project,
  open,
  onOpenChange,
  onSuccess,
}: CompleteProjectDialogProps) {
  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      endOfProjectValue: 0,
      completedDate: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (open && project) {
      form.reset({
        endOfProjectValue:
          project.endOfProjectValue ?? project.contractedValue ?? 0,
        completedDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [open, project, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!project) return;
    try {
      const updated = await projectsApi.update(project.id, {
        status: 'Completed',
        endOfProjectValue: values.endOfProjectValue,
        completedDate: values.completedDate,
      });
      onOpenChange(false);
      onSuccess(updated);
    } catch {
      toast.error('Failed to update project');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Mark Project as Completed</DialogTitle>
          </div>
          <DialogDescription>
            {project?.name} — confirm the final project value and
            completion date.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="endOfProjectValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End of Project Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="completedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completed Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      clearable={false}
                      placeholder="Pick completion date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Mark as Completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
