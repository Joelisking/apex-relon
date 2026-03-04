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
  FormDescription,
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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Manager {
  id: string;
  name: string;
  teamName?: string;
}

interface EditClientDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    role: string;
  };
  managers: Manager[];
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
  segment: z.string().min(1, 'Segment is required'),
  industry: z.string().min(2, 'Industry is required'),
  accountManager: z.string().min(1, 'Account manager is required'),
});

type EditClientFormData = z.infer<typeof editClientSchema>;

export function EditClientDialog({
  client,
  open,
  onOpenChange,
  currentUser,
  managers,
  onClientUpdated,
}: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [segmentOptions, setSegmentOptions] = useState<
    DropdownOption[]
  >([]);
  const [individualTypeOptions, setIndividualTypeOptions] = useState<
    DropdownOption[]
  >([]);

  useEffect(() => {
    settingsApi
      .getDropdownOptions('client_segment')
      .then(setSegmentOptions)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('individual_type')
      .then(setIndividualTypeOptions)
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
    accountManager: c.accountManagerId || c.accountManager?.id || '',
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
        segment: data.segment,
        industry: data.industry,
        accountManager: data.accountManager,
      });

      toast.success('Client updated', {
        description: `${data.name} has been updated successfully.`,
      });

      onClientUpdated?.(updated);
      onOpenChange(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the client.';
      toast.error('Failed to update client', {
        description: msg,
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
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update the details for this client.
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
                    <FormDescription>
                      For sole traders or individuals. Full contacts can be
                      added after creation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="individualType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Individual</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {individualTypeOptions.length > 0
                          ? individualTypeOptions.map((t) => (
                              <SelectItem
                                key={t.value}
                                value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))
                          : [
                              'Owner',
                              'Director',
                              'Architect',
                              'Builder',
                              'PM',
                              'Other',
                            ].map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
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
                    <FormLabel>Segment</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {segmentOptions.length > 0
                          ? segmentOptions.map((s) => (
                              <SelectItem
                                key={s.value}
                                value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))
                          : ['Corporate', 'SME', 'Multinational'].map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ),
                            )}
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="Technology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="accountManager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Manager</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={currentUser.role === 'BDM'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {managers.map((manager) => (
                        <SelectItem
                          key={manager.id}
                          value={manager.id}>
                          {manager.name}{' '}
                          {manager.teamName &&
                            `(${manager.teamName})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
