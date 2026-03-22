'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { projectsApi, type ProjectAssignment } from '@/lib/api/projects-client';
import { usersApi } from '@/lib/api/users-client';
import { rolesApi } from '@/lib/api/roles-client';
import { useAuth } from '@/contexts/auth-context';

interface ProjectAssignmentPanelProps {
  projectId: string;
  /** Existing named-role user IDs to exclude from the assignable list */
  excludeUserIds?: string[];
}

export function ProjectAssignmentPanel({
  projectId,
  excludeUserIds = [],
}: ProjectAssignmentPanelProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  const qk = ['project-assignments', projectId];

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: () => projectsApi.getAssignments(projectId),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getUsersDirectory(),
  });

  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const crewRoles = rolesData.map((r) => r.label);

  const allUsers = usersData?.users ?? [];
  const assignedUserIds = new Set(assignments.map((a) => a.userId));

  // Users available to add: not already assigned, not in named roles
  const availableUsers = allUsers.filter(
    (u) => !assignedUserIds.has(u.id) && !excludeUserIds.includes(u.id),
  );

  const addMutation = useMutation({
    mutationFn: () =>
      projectsApi.addAssignment(projectId, {
        userId: selectedUserId,
        role: selectedRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: ['calendar-projects'] });
      setSelectedUserId('');
      setSelectedRole('');
      toast.success('Crew member assigned');
    },
    onError: () => toast.error('Failed to assign crew member'),
  });

  const removeMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      projectsApi.removeAssignment(projectId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: ['calendar-projects'] });
      toast.success('Assignment removed');
    },
    onError: () => toast.error('Failed to remove assignment'),
  });

  const canAdd = selectedUserId && selectedRole;

  return (
    <div className="space-y-4">
      {/* Current assignments */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading crew...
        </div>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No crew members assigned yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a: ProjectAssignment) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{a.user.name}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {a.role}
                </Badge>
              </div>
              {hasPermission('projects:edit') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(a.id)}
                  disabled={removeMutation.isPending}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form — only shown when user can edit */}
      {hasPermission('projects:edit') && <div className="flex items-center gap-2">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Select crew member..." />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((u) => (
              <SelectItem key={u.id} value={u.id} className="text-xs">
                {u.name}
                <span className="ml-1 text-muted-foreground">· {u.role}</span>
              </SelectItem>
            ))}
            {availableUsers.length === 0 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                All users are already assigned
              </div>
            )}
          </SelectContent>
        </Select>

        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue placeholder="Role..." />
          </SelectTrigger>
          <SelectContent>
            {crewRoles.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!canAdd || addMutation.isPending}
          onClick={() => addMutation.mutate()}>
          {addMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>}
    </div>
  );
}
