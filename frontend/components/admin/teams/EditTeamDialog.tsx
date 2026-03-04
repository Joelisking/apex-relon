import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateTeam } from '@/lib/api/teams-client';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';
import { Team } from '@/lib/types';
import { UserResponse } from '@/lib/api/users-client';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamUpdated: () => void;
  team: Team | null;
  managers: UserResponse[];
}

export function EditTeamDialog({
  open,
  onOpenChange,
  onTeamUpdated,
  team,
  managers,
}: EditTeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teamTypes, setTeamTypes] = useState<DropdownOption[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    managerId: '',
  });

  useEffect(() => {
    settingsApi
      .getDropdownOptions('team_type')
      .then((opts) => {
        setTeamTypes(opts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (team && open) {
      setFormData({
        name: team.name,
        description: team.description || '',
        type: team.type,
        managerId: team.managerId || '',
      });
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;

    setLoading(true);
    try {
      await updateTeam(team.id, {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        managerId: formData.managerId || undefined,
      });

      toast.success('Team updated successfully');
      onTeamUpdated();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update team';
      toast.error('Failed to update team', {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update team details and team lead assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Team Name</Label>
            <Input
              id="edit-name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Sales Team Alpha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-type">Team Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {teamTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-manager">Team Lead</Label>
            <Select
              value={formData.managerId}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  managerId: value === 'none' ? '' : value,
                })
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select team lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Team Lead</SelectItem>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Brief description of the team's purpose"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
