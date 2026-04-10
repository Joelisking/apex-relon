'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Loader2, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api/client';
import { payGradesApi, indotPayZonesApi, type PayGrade, type IndotPayZone } from '@/lib/api/user-rates-client';
import type { DropdownOption } from '@/lib/types';

interface ZoneFormState {
  name: string;
  payGradeId: string;
  counties: string[];
}

const EMPTY_FORM: ZoneFormState = { name: '', payGradeId: '', counties: [] };

interface CountyMultiSelectProps {
  selected: string[];
  options: DropdownOption[];
  onChange: (selected: string[]) => void;
}

function CountyMultiSelect({ selected, options, onChange }: CountyMultiSelectProps) {
  const available = options.filter((o) => !selected.includes(o.label));

  function add(label: string) {
    onChange([...selected, label]);
  }

  function remove(label: string) {
    onChange(selected.filter((s) => s !== label));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {selected.length === 0 && (
          <span className="text-muted-foreground text-sm italic">No counties selected</span>
        )}
        {selected.map((county) => (
          <Badge key={county} variant="secondary" className="gap-1 pr-1">
            {county}
            <button
              type="button"
              onClick={() => remove(county)}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {available.length > 0 && (
        <Select onValueChange={add}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Add county…" />
          </SelectTrigger>
          <SelectContent>
            {available.map((o) => (
              <SelectItem key={o.id} value={o.label}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

interface ZoneDialogProps {
  open: boolean;
  onClose: () => void;
  initialValues?: ZoneFormState & { id?: string };
  payGrades: PayGrade[];
  counties: DropdownOption[];
}

function ZoneDialog({ open, onClose, initialValues, payGrades, counties }: ZoneDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!initialValues?.id;

  const [form, setForm] = useState<ZoneFormState>(
    initialValues
      ? { name: initialValues.name, payGradeId: initialValues.payGradeId, counties: initialValues.counties }
      : EMPTY_FORM,
  );

  function reset() {
    setForm(EMPTY_FORM);
  }

  const createMutation = useMutation({
    mutationFn: () => indotPayZonesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indot-pay-zones'] });
      toast.success('Zone created');
      reset();
      onClose();
    },
    onError: () => toast.error('Failed to create zone'),
  });

  const updateMutation = useMutation({
    mutationFn: () => indotPayZonesApi.update(initialValues!.id!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indot-pay-zones'] });
      toast.success('Zone updated');
      onClose();
    },
    onError: () => toast.error('Failed to update zone'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    if (!form.payGradeId) {
      toast.error('Select a pay grade');
      return;
    }
    if (isEdit) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit INDOT Pay Zone' : 'New INDOT Pay Zone'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Zone Name</Label>
            <Input
              placeholder="e.g. Northeast Indiana"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pay Grade</Label>
            <Select
              value={form.payGradeId}
              onValueChange={(v) => setForm((p) => ({ ...p, payGradeId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pay grade…" />
              </SelectTrigger>
              <SelectContent>
                {payGrades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                    {grade.isDefault && (
                      <span className="text-muted-foreground ml-1 text-xs">(default)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time entries for projects in these counties will use this pay grade to determine
              the labor rate.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Counties</Label>
            <CountyMultiSelect
              selected={form.counties}
              options={counties}
              onChange={(c) => setForm((p) => ({ ...p, counties: c }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Zone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IndotPayZonesAdminView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<IndotPayZone | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: zones = [], isLoading: zonesLoading } = useQuery<IndotPayZone[]>({
    queryKey: ['indot-pay-zones'],
    queryFn: () => indotPayZonesApi.getAll(),
  });

  const { data: payGrades = [], isLoading: gradesLoading } = useQuery<PayGrade[]>({
    queryKey: ['pay-grades'],
    queryFn: () => payGradesApi.getAll(),
  });

  const { data: countyOptions = [], isLoading: countiesLoading } = useQuery<DropdownOption[]>({
    queryKey: ['dropdown-options', 'county'],
    queryFn: () => settingsApi.getDropdownOptions('county'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => indotPayZonesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indot-pay-zones'] });
      setDeletingId(null);
      toast.success('Zone deleted');
    },
    onError: () => toast.error('Failed to delete zone'),
  });

  const isLoading = zonesLoading || gradesLoading || countiesLoading;

  function openCreate() {
    setEditingZone(null);
    setDialogOpen(true);
  }

  function openEdit(zone: IndotPayZone) {
    setEditingZone(zone);
    setDialogOpen(true);
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">INDOT Pay Zones</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Map Indiana counties to INDOT pay grades. When a time entry is logged against an INDOT
            project, the county determines which pay grade — and therefore which hourly rate — applies.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Zone
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 p-4 bg-muted/20 text-sm space-y-1">
        <p className="font-medium text-sm">Lookup chain</p>
        <p className="text-muted-foreground text-sm font-mono text-xs">
          Project (INDOT) → county → Zone → Pay Grade → User Rate → hourly rate
        </p>
        <p className="text-muted-foreground text-sm">
          A project marked INDOT must have at least one county set. If no zone covers the
          project&apos;s county, the user&apos;s base rate is used as a fallback.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No INDOT pay zones configured yet.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create first zone
          </Button>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Pay Grade</TableHead>
                <TableHead>Counties</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {zone.payGrade.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {zone.counties.length === 0 ? (
                        <span className="text-muted-foreground text-xs italic">None</span>
                      ) : (
                        zone.counties.slice(0, 5).map((county) => (
                          <Badge key={county} variant="secondary" className="text-xs">
                            {county}
                          </Badge>
                        ))
                      )}
                      {zone.counties.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{zone.counties.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(zone)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(zone.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ZoneDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingZone(null);
        }}
        initialValues={
          editingZone
            ? {
                id: editingZone.id,
                name: editingZone.name,
                payGradeId: editingZone.payGradeId,
                counties: editingZone.counties,
              }
            : undefined
        }
        payGrades={payGrades}
        counties={countyOptions}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(v) => { if (!v) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete zone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the zone permanently. Time entries already saved are not affected —
              their rates are stored as snapshots.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
