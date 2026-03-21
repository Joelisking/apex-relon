'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { projectsApi } from '@/lib/api/projects-client';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';
import { getActivityIcon } from '@/lib/activity-icon-map';
import { formatDistanceToNow, format } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  activityDate: string;
  activityTime: string;
  reason: string;
  notes?: string;
  meetingType?: string;
  userId: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface ProjectActivityTimelineProps {
  projectId: string;
  activities: Activity[];
  currentUserId: string;
  onActivityAdded: () => void;
}

export function ProjectActivityTimeline({
  projectId,
  activities,
  currentUserId,
  onActivityAdded,
}: ProjectActivityTimelineProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activityTypes, setActivityTypes] = useState<
    DropdownOption[]
  >([]);
  const [meetingTypes, setMeetingTypes] = useState<DropdownOption[]>(
    [],
  );
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
    settingsApi
      .getDropdownOptions('activity_type')
      .then(setActivityTypes)
      .catch(console.error);
    settingsApi
      .getDropdownOptions('meeting_type')
      .then(setMeetingTypes)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (
      activityTypes.length > 0 &&
      !activityTypes.find((t) => t.value === activityType)
    ) {
      setActivityType(activityTypes[0].value);
    }
  }, [activityTypes]);

  useEffect(() => {
    if (
      meetingTypes.length > 0 &&
      !meetingTypes.find((t) => t.value === meetingType)
    ) {
      setMeetingType(meetingTypes[0].value);
    }
  }, [meetingTypes]);

  const selectedTypeOpt = activityTypes.find(
    (t) => t.value === activityType,
  );
  const hasMeetingSubtype =
    selectedTypeOpt?.metadata?.hasMeetingType ??
    activityType === 'meeting';

  const getChipClasses = (type: string) => {
    const opt = activityTypes.find((t) => t.value === type);
    return (
      opt?.metadata?.chipClasses ??
      'text-gray-700 bg-gray-50 border-gray-200'
    );
  };

  const getNodeClass = (type: string) => {
    const opt = activityTypes.find((t) => t.value === type);
    return opt?.metadata?.nodeClass ?? 'bg-gray-400';
  };

  const getTypeIcon = (type: string) => {
    const opt = activityTypes.find((t) => t.value === type);
    return getActivityIcon(opt?.metadata?.icon as string | undefined);
  };

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
      setAddDialogOpen(false);
      onActivityAdded();
    } catch (error) {
      toast.error('Failed to add activity', {
        description:
          error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await projectsApi.deleteActivity(projectId, activityId);
      toast.success('Activity deleted');
      onActivityAdded();
    } catch (error) {
      toast.error('Failed to delete activity', {
        description:
          error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Activity Timeline
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          className="h-7 gap-1.5 text-xs px-2.5">
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-border/40 border-dashed bg-muted/10 py-8 text-center">
          <p className="text-[11px] text-muted-foreground/50">
            No activities yet
          </p>
        </div>
      ) : (
        <div className="relative space-y-2">
          <div className="absolute left-2.25 top-5 bottom-5 w-px bg-border/40 pointer-events-none" />

          {activities.map((activity) => {
            const chipClasses = getChipClasses(activity.type);
            const nodeColor = getNodeClass(activity.type);
            const ChipIcon = getTypeIcon(activity.type);
            const typeLabel =
              activityTypes.find((t) => t.value === activity.type)
                ?.label ?? activity.type;

            return (
              <div key={activity.id} className="flex gap-3">
                <div
                  className={`mt-3.5 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background ${nodeColor}`}
                />
                <div className="flex-1 rounded-xl border border-border/40 bg-muted/20 px-3.5 py-2.5 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 border shrink-0 ${chipClasses} capitalize`}>
                      <ChipIcon className="h-2.5 w-2.5" />
                      {typeLabel}
                    </span>

                    {activity.meetingType && (
                      <span className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 border text-muted-foreground bg-muted/40 border-border/50 capitalize shrink-0">
                        {meetingTypes.find(
                          (t) => t.value === activity.meetingType,
                        )?.label ?? activity.meetingType}
                      </span>
                    )}

                    <span className="text-[11px] font-semibold text-foreground">
                      {activity.user.name}
                    </span>

                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {format(
                            new Date(activity.activityDate),
                            'MMM d',
                          )}
                        </span>
                        {' · '}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {activity.activityTime}
                        </span>
                        {' · '}
                        {formatDistanceToNow(
                          new Date(activity.createdAt),
                          { addSuffix: true },
                        )}
                      </span>

                      {activity.userId === currentUserId && (
                        <button
                          onClick={() => setDeleteConfirmId(activity.id)}
                          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[12px] text-foreground leading-snug">
                    {activity.reason}
                  </p>

                  {activity.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap leading-snug">
                      {activity.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this activity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteConfirmId) {
                  handleDeleteActivity(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>
              Record an activity for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Activity Type
              </Label>
              <Select
                value={activityType}
                onValueChange={setActivityType}>
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
                <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
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
                <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
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
                <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                  Meeting Type
                </Label>
                <Select
                  value={meetingType}
                  onValueChange={setMeetingType}>
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
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., Project status update"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground font-semibold">
                Notes{' '}
                <span className="normal-case tracking-normal font-normal text-muted-foreground/60">
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
                onClick={() => setAddDialogOpen(false)}>
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
    </div>
  );
}
