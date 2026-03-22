import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users, Crown, Network } from 'lucide-react';
import { toast } from 'sonner';
import { Team } from '@/lib/types';
import { getTeams, deleteTeam } from '@/lib/api/teams-client';
import { CreateTeamDialog } from './CreateTeamDialog';
import { EditTeamDialog } from './EditTeamDialog';
import { TeamDetailDialog } from './TeamDetailDialog';
import { UserResponse } from '@/lib/api/users-client';
import { useAuth } from '@/contexts/auth-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTable } from '@/components/ui/data-table';
import { createTeamColumns } from './columns-teams';

interface TeamListProps {
  managers: UserResponse[];
  allUsers: UserResponse[];
  currentUserRole: string;
}

export function TeamList({ managers, allUsers }: TeamListProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { data: teams = [], isLoading: loading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => getTeams(),
    staleTime: 2 * 60 * 1000,
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailTeamId, setDetailTeamId] = useState<string | null>(
    null,
  );

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTeam(teamToDelete.id);
      toast.success('Team deleted successfully');
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
    } catch (error) {
      const err = error as Error;
      if (err.message && err.message.includes('existing members')) {
        toast.error('Cannot delete team with members', {
          description: 'Please reassign all members before deleting.',
        });
      } else {
        toast.error('Failed to delete team', {
          description: err.message || 'Unknown error occurred',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const canManageTeams = hasPermission('teams:edit');

  const columns = useMemo(
    () =>
      createTeamColumns({
        canManageTeams,
        onEdit: (team) => {
          setTeamToEdit(team);
          setEditDialogOpen(true);
        },
        onDelete: (team) => {
          setTeamToDelete(team);
          setDeleteDialogOpen(true);
        },
      }),
    [canManageTeams],
  );

  const totalMembers = teams.reduce(
    (acc, t) => acc + (t._count?.members || 0),
    0,
  );
  const teamsWithManager = teams.filter((t) => t.managerId).length;

  return (
    <div className="space-y-6">
      {/* Stat strip */}
      {!loading && teams.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border/60">
            {[
              {
                label: 'Total Teams',
                sublabel: 'Active groups',
                value: teams.length,
                icon: Network,
                highlight: true,
              },
              {
                label: 'Total Members',
                sublabel: 'Across all teams',
                value: totalMembers,
                icon: Users,
              },
              {
                label: 'With Team Lead',
                sublabel: 'Teams assigned',
                value: teamsWithManager,
                icon: Crown,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="relative bg-card px-5 py-4">
                  {s.highlight && (
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-destructive/50 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground font-medium">
                      {s.label}
                    </p>
                  </div>
                  <p className="text-[22px] font-bold tabular-nums leading-none text-foreground mb-1">
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.sublabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Teams table */}
      <div>
        {/* {canManageTeams && (
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Create Team
          </Button>
        )} */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">
                No teams found. Create one to get started.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={teams}
              globalFilter
              onRowClick={(team) => setDetailTeamId(team.id)}
              exportFilename="teams"
            />
          )}
        </div>
      </div>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTeamCreated={() =>
          queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
        }
        managers={managers}
      />

      <EditTeamDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onTeamUpdated={() =>
          queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
        }
        team={teamToEdit}
        managers={managers}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{teamToDelete?.name}</strong>? This action
              cannot be undone.
              <br />
              <br />
              Note: You cannot delete a team that has active members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TeamDetailDialog
        teamId={detailTeamId}
        open={!!detailTeamId}
        onClose={() => setDetailTeamId(null)}
        managers={managers}
        allUsers={allUsers}
        canEdit={canManageTeams}
        onTeamUpdated={() =>
          queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
        }
      />
    </div>
  );
}
