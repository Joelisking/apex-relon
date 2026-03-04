'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Crown,
  Users,
  Mail,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Team } from '@/lib/types';
import {
  getTeam,
  updateTeam,
  addTeamMember,
  removeTeamMember,
} from '@/lib/api/teams-client';
import { UserResponse } from '@/lib/api/users-client';

const ROLE_COLORS: Record<string, string> = {
  CEO: 'bg-violet-100/70 text-violet-900',
  ADMIN: 'bg-blue-100/70   text-blue-900',
  BDM: 'bg-orange-100/70  text-orange-900',
  SALES: 'bg-emerald-100/70 text-emerald-900',
  DESIGNER: 'bg-rose-100/70   text-rose-900',
  QS: 'bg-cyan-100/70   text-cyan-900',
};

const ROLE_DOT: Record<string, string> = {
  CEO: 'bg-violet-400',
  ADMIN: 'bg-blue-400',
  BDM: 'bg-orange-400',
  SALES: 'bg-emerald-400',
  DESIGNER: 'bg-rose-400',
  QS: 'bg-cyan-400',
};

const TYPE_COLORS: Record<string, string> = {
  Sales: 'bg-emerald-100/70 text-emerald-900',
  Design: 'bg-rose-100/70   text-rose-900',
  QS: 'bg-cyan-100/70   text-cyan-900',
};

const TYPE_DOT: Record<string, string> = {
  Sales: 'bg-emerald-400',
  Design: 'bg-rose-400',
  QS: 'bg-cyan-400',
};

function RolePill({ role }: { role: string }) {
  const colors =
    ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground';
  const dot = ROLE_DOT[role] ?? 'bg-muted-foreground/30';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      {role}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Active';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isActive
          ? 'bg-emerald-100/70 text-emerald-900'
          : 'bg-muted text-muted-foreground'
      }`}>
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`}
      />
      {status}
    </span>
  );
}

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface TeamDetailDialogProps {
  teamId: string | null;
  open: boolean;
  onClose: () => void;
  managers: UserResponse[];
  allUsers: UserResponse[];
  canEdit: boolean;
  onTeamUpdated: () => void;
}

export function TeamDetailDialog({
  teamId,
  open,
  onClose,
  managers,
  allUsers,
  canEdit,
  onTeamUpdated,
}: TeamDetailDialogProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState<
    string | null
  >(null);
  const [changingManager, setChangingManager] = useState(false);

  const loadTeam = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await getTeam(teamId);
      setTeam(data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId && open) {
      loadTeam();
    } else {
      setTeam(null);
      setSelectedUserId('');
    }
  }, [teamId, open]);

  const availableUsers = useMemo(() => {
    if (!team) return [];
    const memberIds = new Set(team.members?.map((m) => m.id) || []);
    return allUsers.filter(
      (u) => !memberIds.has(u.id) && u.status === 'Active',
    );
  }, [team, allUsers]);

  const handleAddMember = async () => {
    if (!teamId || !selectedUserId) return;
    setAddingMember(true);
    try {
      await addTeamMember(teamId, selectedUserId);
      toast.success('Member added');
      setSelectedUserId('');
      await loadTeam();
      onTeamUpdated();
    } catch {
      toast.error('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    setRemovingMemberId(userId);
    try {
      await removeTeamMember(teamId, userId);
      toast.success('Member removed');
      await loadTeam();
      onTeamUpdated();
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleChangeManager = async (managerId: string) => {
    if (!teamId) return;
    setChangingManager(true);
    try {
      await updateTeam(teamId, {
        managerId: managerId === 'none' ? undefined : managerId,
      });
      toast.success('Manager updated');
      await loadTeam();
      onTeamUpdated();
    } catch {
      toast.error('Failed to update manager');
    } finally {
      setChangingManager(false);
    }
  };

  const memberCount = team?.members?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {loading ? 'Loading…' : (team?.name ?? 'Team not found')}
          </DialogTitle>
          {!loading && team && (
            <DialogDescription>
              {team.description || 'Team details and members'}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : team ? (
          <div className="space-y-5">
            {/* Type + member count chips */}
            <div className="flex items-center gap-1.5">
              {team.type && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    TYPE_COLORS[team.type] ??
                    'bg-muted text-muted-foreground'
                  }`}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_DOT[team.type] ?? 'bg-muted-foreground/30'}`}
                  />
                  {team.type}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border text-muted-foreground bg-muted border-border/60">
                <Users className="h-2.5 w-2.5" />
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-border/40" />

            {/* Manager Section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5 mb-3">
                <Crown className="h-3 w-3 text-muted-foreground/40" />
                Team Manager
              </p>

              {canEdit ? (
                <div className="space-y-2.5">
                  <Select
                    value={team.managerId || 'none'}
                    onValueChange={handleChangeManager}
                    disabled={changingManager}>
                    <SelectTrigger className="h-8 text-xs">
                      {changingManager ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Updating…
                        </div>
                      ) : (
                        <SelectValue placeholder="Select a manager" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {team.manager && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20">
                      <div
                        className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold shrink-0"
                        style={{ fontSize: '9px' }}>
                        {avatarInitials(team.manager.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {team.manager.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                          {team.manager.email}
                        </p>
                      </div>
                      <RolePill role={team.manager.role || 'BDM'} />
                    </div>
                  )}
                </div>
              ) : team.manager ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20">
                  <div
                    className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold shrink-0"
                    style={{ fontSize: '9px' }}>
                    {avatarInitials(team.manager.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {team.manager.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      {team.manager.email}
                    </p>
                  </div>
                  <RolePill role={team.manager.role || 'BDM'} />
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 border-dashed py-4 px-3">
                  <p className="text-xs text-muted-foreground/50 text-center">
                    No manager assigned
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/40" />

            {/* Members Section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground flex items-center gap-1.5 mb-3">
                <Users className="h-3 w-3 text-muted-foreground/40" />
                Members
              </p>

              {/* Add member row */}
              {canEdit && availableUsers.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}>
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Select a user to add…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 shrink-0"
                    onClick={handleAddMember}
                    disabled={!selectedUserId || addingMember}>
                    {addingMember ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    Add
                  </Button>
                </div>
              )}

              {team.members && team.members.length > 0 ? (
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20 hover:border-border/60 transition-colors">
                      <div
                        className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold shrink-0"
                        style={{ fontSize: '9px' }}>
                        {avatarInitials(member.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RolePill role={member.role} />
                        <StatusPill status={member.status} />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 ml-0.5"
                            disabled={removingMemberId === member.id}
                            onClick={() =>
                              handleRemoveMember(member.id)
                            }>
                            {removingMemberId === member.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 border-dashed py-6 px-3">
                  <p className="text-xs text-muted-foreground/50 text-center">
                    No members in this team
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground/50">
              Team not found
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
