'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { usersApi, type UserDirectoryItem } from '@/lib/api/users-client';
import { useAuth } from '@/contexts/auth-context';

interface ProxyUserPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSelected: (user: UserDirectoryItem) => void;
}

export function ProxyUserPickerDialog({
  open,
  onOpenChange,
  onUserSelected,
}: ProxyUserPickerDialogProps) {
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => usersApi.getUsersDirectory(),
    enabled: open,
  });

  // Exclude the currently logged-in user — no point logging for yourself via this flow
  const teamMembers = (data?.users ?? []).filter((u) => u.id !== currentUser?.id);

  const handleContinue = () => {
    const selected = teamMembers.find((u) => u.id === selectedUserId);
    if (!selected) return;
    onUserSelected(selected);
    onOpenChange(false);
    setSelectedUserId('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setSelectedUserId('');
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log Time for Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select team member</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <SearchableSelect
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                placeholder="Choose a team member…"
                searchPlaceholder="Search by name or role…"
                emptyMessage="No team members found."
                options={teamMembers.map((u) => ({
                  value: u.id,
                  label: u.name,
                  keywords: u.role,
                }))}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!selectedUserId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
