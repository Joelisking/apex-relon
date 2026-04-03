'use client';

import { UserPicker } from '@/components/ui/user-picker';
import { Badge } from '@/components/ui/badge';
import { Users, X } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

interface ProjectTeamMembersFieldProps {
  users: TeamMember[];
  assignedMembers: TeamMember[];
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}

export function ProjectTeamMembersField({
  users,
  assignedMembers,
  onAdd,
  onRemove,
}: ProjectTeamMembersFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Team Members</span>
      </div>

      {assignedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignedMembers.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1">
              <span className="text-sm font-medium">{u.name}</span>
              {u.role && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {u.role}
                </Badge>
              )}
              <button
                type="button"
                onClick={() => onRemove(u.id)}
                className="ml-0.5 text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <UserPicker
          users={users}
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
