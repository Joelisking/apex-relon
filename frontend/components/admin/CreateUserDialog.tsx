import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserSchema,
  type CreateUserFormData,
} from '@/lib/validations/user';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  managers?: UserResponse[];
}

export function CreateUserDialog({
  open,
  onOpenChange,
  onUserCreated,
  managers = [],
}: CreateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(
    null,
  );
  const [createdUser, setCreatedUser] = useState<UserResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableRoles, setAvailableRoles] = useState<
    RoleResponse[]
  >([]);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
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

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams', error);
      toast.error('Failed to load teams');
    }
  };

  const loadRoles = async () => {
    try {
      const data = await rolesApi.getAssignable();
      setAvailableRoles(data);
    } catch (error) {
      console.error('Failed to load roles', error);
    }
  };
  const selectedRole = form.watch('role');

  const onSubmit = async (data: CreateUserFormData) => {
    setIsSubmitting(true);
    try {
      // Map form data to API request, ensuring teamId is sent
      // The validation ensures teamId is present for BDM/SALES
      const requestData = {
        ...data,
        teamId: data.teamId,
        // We can omit teamName as the backend handles teamId priority
      };

      const response = await usersApi.createUser(requestData);
      setCreatedUser(response.user);
      setTempPassword(response.tempPassword);

      toast.success('User created successfully', {
        description: `${response.user.name} has been added to the system.`,
      });

      // Don't close dialog immediately - show temp password first
      onUserCreated();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An error occurred while creating the user.';
      toast.error('Failed to create user', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success('Password copied', {
        description:
          'Temporary password has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    form.reset();
    setTempPassword(null);
    setCreatedUser(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Show success state with temp password
  if (tempPassword && createdUser) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              User Created Successfully
            </DialogTitle>
            <DialogDescription>
              Save the temporary password below. It will only be shown
              once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-green-900">
                    User Details:
                  </p>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Name:</strong> {createdUser.name}
                    </p>
                    <p>
                      <strong>Email:</strong> {createdUser.email}
                    </p>
                    <p>
                      <strong>Role:</strong> {createdUser.role}
                    </p>
                    {createdUser.teamName && (
                      <p>
                        <strong>Team:</strong> {createdUser.teamName}
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Temporary Password
              </label>
              <div className="flex gap-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="font-mono bg-gray-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  className="shrink-0">
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A welcome email has been sent to {createdUser.email}{' '}
                with login instructions.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                The user must change this password after their first
                login for security.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show form for creating user
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. A temporary password will be
            generated and sent via email.
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
                      {availableRoles.map((role) => (
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
                        value={field.value}>
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
                      <FormDescription>
                        The team this user belongs to
                      </FormDescription>
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
                        value={field.value}>
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
                      <FormDescription>
                        The manager this sales user will report to
                      </FormDescription>
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
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
