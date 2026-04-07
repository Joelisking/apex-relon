'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { clientsApi, settingsApi } from '@/lib/api/client';
import type { Client, DropdownOption } from '@/lib/types';
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
import { AddressAutocompleteWithParts } from '@/components/ui/address-autocomplete-parts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditCustomerDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientUpdated?: (client: Client) => void;
}

const editClientSchema = z.object({
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

type EditClientFormData = z.infer<typeof editClientSchema>;

export function EditCustomerDialog({
  client,
  open,
  onOpenChange,
  onClientUpdated,
}: EditCustomerDialogProps) {
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

  const buildDefaults = (c: Client): EditClientFormData => ({
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    website: c.website || '',
    individualName: c.individualName || '',
    individualType: c.individualType || undefined,
    segment: c.segment || '',
    industry: c.industry || '',
  });

  const form = useForm<EditClientFormData>({
    resolver: zodResolver(editClientSchema),
    defaultValues: buildDefaults(client),
  });

  // Re-populate when client prop changes
  useEffect(() => {
    form.reset(buildDefaults(client));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const onSubmit = async (data: EditClientFormData) => {
    setIsSubmitting(true);
    try {
      const updated = await clientsApi.update(client.id, {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        website: data.website || undefined,
        individualName: data.individualName || undefined,
        individualType: data.individualType || undefined,
        segment: data.segment || undefined,
        industry: data.industry || undefined,
      });

      toast.success('Customer updated', {
        description: `${data.name} has been updated successfully.`,
      });

      onClientUpdated?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the customer.';
      toast.error('Failed to update customer', {
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset(buildDefaults(client));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the details for this customer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4">
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
                    <AddressAutocompleteWithParts
                      value={field.value ?? ''}
                      placeholder="123 Main St, City, State 12345"
                      onChange={(street, parts) => {
                        if (parts) {
                          const full = [street, parts.city, `${parts.state} ${parts.zip}`.trim()]
                            .filter(Boolean)
                            .join(', ');
                          field.onChange(full);
                        } else {
                          field.onChange(street);
                        }
                      }}
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
