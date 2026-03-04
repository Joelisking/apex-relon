'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TeamList } from './teams/TeamList';
import { usersApi } from '@/lib/api/users-client';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { CreateTeamDialog } from './teams/CreateTeamDialog';
import { useAuth } from '@/contexts/auth-context';

interface AdminTeamsViewProps {
  currentUser: {
    id: string;
    role: string;
    name: string;
  };
}

export default function AdminTeamsView({
  currentUser,
}: AdminTeamsViewProps) {
  const { hasPermission } = useAuth();
  const { data } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.getUsers(),
    staleTime: 2 * 60 * 1000,
  });
  const users = data?.users ?? [];

  const { data: managersData } = useQuery({
    queryKey: ['admin-users-managers'],
    queryFn: () => usersApi.getUsers(undefined, 'teams:be_manager'),
    staleTime: 2 * 60 * 1000,
  });
  const managers = managersData?.users ?? [];
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-display tracking-tight">
            Teams
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage teams and team assignments
          </p>
        </div>
        <div>
          {hasPermission('teams:create') && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create Team
            </Button>
          )}
        </div>
      </div>
      <TeamList
        managers={managers}
        allUsers={users}
        currentUserRole={currentUser.role}
      />

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTeamCreated={() => {}}
        managers={managers}
      />
    </div>
  );
}
