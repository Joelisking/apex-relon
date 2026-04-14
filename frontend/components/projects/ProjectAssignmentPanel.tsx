'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { projectsApi, type ProjectAssignment } from '@/lib/api/projects-client';
import { usersApi } from '@/lib/api/users-client';
import { rolesApi } from '@/lib/api/roles-client';
import { getTeams, getTeam } from '@/lib/api/teams-client';
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
  const [selectedTeamId, setSelectedTeamId] = useState('');

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

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => getTeams(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamDetail, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team', selectedTeamId],
    queryFn: () => getTeam(selectedTeamId),
    enabled: !!selectedTeamId,
    staleTime: 60_000,
  });

  const crewRoles = rolesData.map((r) => r.label);
  const allUsers = usersData?.users ?? [];
  const assignedUserIds = new Set(assignments.map((a) => a.userId));

  // Users available to add individually: not already assigned, not in named roles
  const availableUsers = allUsers.filter(
    (u) => !assignedUserIds.has(u.id) && !excludeUserIds.includes(u.id),
  );

  // Team members that aren't already assigned (and not in named roles)
  const teamMembersToAdd =
    teamDetail?.members?.filter(
      (m) => !assignedUserIds.has(m.id) && !excludeUserIds.includes(m.id),
    ) ?? [];

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

  const addTeamMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        teamMembersToAdd.map((member) => {
          const roleLabel =
            rolesData.find((r) => r.key === member.role)?.label ?? member.role ?? '';
          return projectsApi.addAssignment(projectId, {
            userId: member.id,
            role: roleLabel,
          });
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      queryClient.invalidateQueries({ queryKey: ['calendar-projects'] });
      const teamName = teams.find((t) => t.id === selectedTeamId)?.name ?? 'Team';
      toast.success(`${teamMembersToAdd.length} member${teamMembersToAdd.length !== 1 ? 's' : ''} added from ${teamName}`);
      setSelectedTeamId('');
    },
    onError: () => toast.error('Failed to add team members'),
  });

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    const user = availableUsers.find((u) => u.id === userId);
    if (user) {
      const roleLabel = rolesData.find((r) => r.key === user.role)?.label ?? user.role ?? '';
      setSelectedRole(roleLabel);
    }
  };

  const userOptions = availableUsers.map((u) => ({
    value: u.id,
    label: u.name,
    keywords: u.role,
  }));

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
    keywords: t.type,
  }));

  const alreadyAssignedCount =
    (teamDetail?.members?.length ?? 0) - teamMembersToAdd.length;

  const canAdd = selectedUserId && selectedRole;
  const canAddTeam = selectedTeamId && teamMembersToAdd.length > 0 && !isLoadingTeam;

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

      {hasPermission('projects:edit') && (
        <div className="space-y-2">
          {/* Add individual member */}
          <div className="flex items-center gap-2">
            <SearchableSelect
              value={selectedUserId}
              onValueChange={handleUserChange}
              options={userOptions}
              placeholder="Select crew member..."
              searchPlaceholder="Search by name..."
              emptyMessage="All users are already assigned"
              className="flex-1 h-8 text-xs"
            />

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
          </div>

          {/* Add entire team */}
          <div className="flex items-center gap-2">
            <SearchableSelect
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              options={teamOptions}
              placeholder="Or select a team..."
              searchPlaceholder="Search teams..."
              emptyMessage="No teams found"
              className="flex-1 h-8 text-xs"
            />

            {/* Member preview badge */}
            {selectedTeamId && !isLoadingTeam && teamDetail && (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {teamMembersToAdd.length} new
                {alreadyAssignedCount > 0 && `, ${alreadyAssignedCount} already assigned`}
              </span>
            )}
            {selectedTeamId && isLoadingTeam && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
            )}

            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 text-xs shrink-0"
              disabled={!canAddTeam || addTeamMutation.isPending}
              onClick={() => addTeamMutation.mutate()}>
              {addTeamMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              Add Team
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
