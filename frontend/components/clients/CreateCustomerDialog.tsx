'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsApi, settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';
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
import { CreatableSelect } from '@/components/ui/creatable-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  individualName: z.string().optional(),
  individualType: z.string().optional(),
  segment: z.string().optional(),
  industry: z.string().optional(),
});

type CreateClientFormData = z.infer<typeof createClientSchema>;

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState<DropdownOption[]>([]);
  const [individualTypeOptions, setIndividualTypeOptions] = useState<DropdownOption[]>([]);
  const [industryOptions, setIndustryOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    settingsApi
      .getDropdownOptions('client_segment')
      .then(setSegmentOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('individual_type')
      .then(setIndividualTypeOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('client_industry')
      .then(setIndustryOptions)
      .catch(console.error);
  }, []);

  const form = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      individualName: '',
      individualType: undefined,
      segment: undefined,
      industry: undefined,
    },
  });

  const onSubmit = async (data: CreateClientFormData) => {
    setIsSubmitting(true);
    try {
      await clientsApi.create({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        website: data.website || undefined,
        individualName: data.individualName || undefined,
        individualType: data.individualType || undefined,
        segment: data.segment || '',
        industry: data.industry || '',
      });

      toast.success('Customer created successfully', {
        description: `${data.name} has been added to your customers.`,
      });

      form.reset();
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast.error('Failed to create customer', {
        description:
          (error instanceof Error ? error.message : null) ||
          'An error occurred while creating the customer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your portfolio.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Acme Corporation"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="individualName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="individualType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Role</FormLabel>
                    <FormControl>
                      <CreatableSelect
                        options={individualTypeOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select role"
                        onOptionsChange={setIndividualTypeOptions}
                        onOptionCreated={(label) =>
                          settingsApi.createDropdownOption({
                            category: 'individual_type',
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contact@acme.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+1 (555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, City, State 12345"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://acme.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Company Type</FormLabel>
                    <FormControl>
                      <CreatableSelect
                        options={segmentOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select company type"
                        onOptionsChange={setSegmentOptions}
                        onOptionCreated={(label) =>
                          settingsApi.createDropdownOption({
                            category: 'client_segment',
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

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <CreatableSelect
                        options={industryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select industry"
                        onOptionsChange={setIndustryOptions}
                        onOptionCreated={(label) =>
                          settingsApi.createDropdownOption({
                            category: 'client_industry',
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
                  'Create Client'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
