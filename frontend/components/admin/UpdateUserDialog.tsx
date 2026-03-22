import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateUserSchema,
  type UpdateUserFormData,
} from '@/lib/validations/user';
import {
  usersApi,
  type UserResponse,
  type UpdateUserRequest,
} from '@/lib/api/users-client';
import { rolesApi, type RoleResponse } from '@/lib/api/roles-client';
import { getTeams } from '@/lib/api/teams-client';
import { Team } from '@/lib/types';
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
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
  user: UserResponse | null;
  currentUserRole: string;
  managers?: UserResponse[];
}

export function UpdateUserDialog({
  open,
  onOpenChange,
  onUserUpdated,
  user,
  currentUserRole,
  managers = [],
}: UpdateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleResponse[]>([]);

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      email: '',
      name: '',
      role: undefined,
      teamId: '',
      managerId: '',
    },
  });

  useEffect(() => {
    if (open) {
      loadTeams();
      loadRoles();
    }
  }, [open]);

  useEffect(() => {
    if (user && open) {
      form.reset({
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId || user.team?.id || '',
        managerId: user.managerId || '',
      });
    }
  }, [user, open, form]);

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch {
      toast.error('Failed to load teams');
    }
  };

  const loadRoles = async () => {
    try {
      const data = await rolesApi.getAll();
      setAvailableRoles(data);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };

  const getAllowedRoles = (): RoleResponse[] => {
    if (currentUserRole === 'BDM') {
      return availableRoles.filter((r) => r.key === 'SALES');
    }
    if (currentUserRole === 'ADMIN') {
      return availableRoles.filter((r) => r.key !== 'CEO' && r.key !== 'ADMIN');
    }
    if (currentUserRole === 'CEO') {
      return availableRoles.filter((r) => r.key !== 'CEO');
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();
  const selectedRole = form.watch('role');

  const onSubmit = async (data: UpdateUserFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Map form data to API request
      const requestData: UpdateUserRequest = {
        name: data.name,
        email: data.email,
        role: data.role,
        teamId: data.teamId || undefined,
        managerId: data.managerId || undefined,
      };

      await usersApi.updateUser(user.id, requestData);

      toast.success('User updated successfully', {
        description: `${data.name} has been updated.`,
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An error occurred while updating the user.';
      toast.error('Failed to update user', {
        description: message,
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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and permissions.
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@apexsurveying.net"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole &&
              ['BDM', 'SALES'].includes(selectedRole) && (
                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            {selectedRole === 'SALES' &&
              currentUserRole !== 'BDM' &&
              managers.length > 0 && (
                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manager</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}>
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
                              {manager.name} (
                              {manager.teamName || 'No Team'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
