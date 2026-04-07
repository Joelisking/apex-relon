'use client';

import { Badge } from '@/components/ui/badge';
import { UserPicker } from '@/components/ui/user-picker';
import { Users, X } from 'lucide-react';

export interface TeamMember {
  /** For create: user.id. For edit: assignment.id. */
  removeKey: string;
  name: string;
  role?: string;
}

interface ProjectTeamMembersSectionProps {
  members: TeamMember[];
  availableUsers: Array<{ id: string; name: string; role?: string }>;
  onAdd: (userId: string) => void;
  onRemove: (key: string) => void;
}

export function ProjectTeamMembersSection({
  members,
  availableUsers,
  onAdd,
  onRemove,
}: ProjectTeamMembersSectionProps) {
  if (members.length === 0 && availableUsers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Team Members</span>
      </div>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <div
              key={m.removeKey}
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
              <span className="text-sm font-medium">{m.name}</span>
              {m.role && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {m.role}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => onRemove(m.removeKey)}
                className="ml-0.5 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableUsers.length > 0 && (
        <UserPicker
          users={availableUsers}
          value=""
          onChange={(val) => {
            if (val) onAdd(val);
          }}
          placeholder="Add a team member..."
        />
      )}
    </div>
  );
}
