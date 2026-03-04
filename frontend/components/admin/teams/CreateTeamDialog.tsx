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
import { createTeam } from '@/lib/api/teams-client';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';
import { UserResponse } from '@/lib/api/users-client';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: () => void;
  managers: UserResponse[];
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
  managers,
}: CreateTeamDialogProps) {
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
        if (opts.length > 0 && !formData.type) {
          setFormData((prev) => ({ ...prev, type: opts[0].value }));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createTeam({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        managerId: formData.managerId,
      });

      toast.success('Team created successfully');
      onTeamCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: '',
        description: '',
        type: teamTypes[0]?.value || '',
        managerId: '',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create team';
      toast.error('Failed to create team', {
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
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team and assign a team lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. Sales Team Alpha"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Team Type</Label>
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
            <Label htmlFor="manager">Team Lead</Label>
            <Select
              value={formData.managerId}
              required
              onValueChange={(value) =>
                setFormData({ ...formData, managerId: value })
              }>
              <SelectTrigger>
                <SelectValue placeholder="Select team lead" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
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
            <Button
              type="submit"
              disabled={loading || !formData.managerId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
