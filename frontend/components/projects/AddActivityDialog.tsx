'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects-client';
import { getActivityIcon } from '@/lib/activity-icon-map';
import type { DropdownOption } from '@/lib/types';

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  activityTypes: DropdownOption[];
  meetingTypes: DropdownOption[];
  onActivityAdded: () => void;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  projectId,
  activityTypes,
  meetingTypes,
  onActivityAdded,
}: AddActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [activityTime, setActivityTime] = useState(
    new Date().toTimeString().slice(0, 5),
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [meetingType, setMeetingType] = useState('virtual');

  useEffect(() => {
    if (
      activityTypes.length > 0 &&
      !activityTypes.find((t) => t.value === activityType)
    ) {
      setActivityType(activityTypes[0].value);
    }
  }, [activityTypes, activityType]);

  useEffect(() => {
    if (
      meetingTypes.length > 0 &&
      !meetingTypes.find((t) => t.value === meetingType)
    ) {
      setMeetingType(meetingTypes[0].value);
    }
  }, [meetingTypes, meetingType]);

  const selectedTypeOpt = activityTypes.find(
    (t) => t.value === activityType,
  );
  const hasMeetingSubtype =
    selectedTypeOpt?.metadata?.hasMeetingType ?? activityType === 'meeting';

  const handleAddActivity = async () => {
    if (!reason.trim()) {
      toast.error('Please enter a reason for the activity');
      return;
    }
    setIsSubmitting(true);
    try {
      await projectsApi.createActivity(projectId, {
        type: activityType,
        activityDate,
        activityTime,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        meetingType: hasMeetingSubtype ? meetingType : undefined,
      });

      toast.success('Activity added');
      setReason('');
      setNotes('');
      setActivityType(activityTypes[0]?.value ?? 'call');
      setActivityDate(new Date().toISOString().split('T')[0]);
      setActivityTime(new Date().toTimeString().slice(0, 5));
      setMeetingType(meetingTypes[0]?.value ?? 'virtual');
      onOpenChange(false);
      onActivityAdded();
    } catch (error) {
      toast.error('Failed to add activity', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>
            Record an activity for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
              Activity Type
            </Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((t) => {
                  const Icon = getActivityIcon(
                    t.metadata?.icon as string | undefined,
                  );
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Date
              </Label>
              <DatePicker
                value={activityDate}
                onChange={setActivityDate}
                clearable={false}
                placeholder="Pick date"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Time
              </Label>
              <Input
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
              />
            </div>
          </div>

          {hasMeetingSubtype && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Meeting Type
              </Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g., Project status update"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-semibold">
              Notes{' '}
              <span className="normal-case tracking-normal font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddActivity}
              disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Activity'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
