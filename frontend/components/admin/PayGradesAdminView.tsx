'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { payGradesApi, type PayGrade } from '@/lib/api/user-rates-client';
import { PayGradeDialog } from './PayGradeDialog';

export function PayGradesAdminView() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PayGrade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: payGrades = [], isLoading } = useQuery<PayGrade[]>({
    queryKey: ['pay-grades'],
    queryFn: () => payGradesApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payGradesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-grades'] });
      setDeletingId(null);
      toast.success('Pay grade deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete pay grade'),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(grade: PayGrade) {
    setEditing(grade);
    setDialogOpen(true);
  }

  function handleClose() {
    setDialogOpen(false);
    setEditing(null);
  }

  const deletingGrade = payGrades.find((g) => g.id === deletingId) ?? null;

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Pay Grades</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Categories used to organize hourly labor rates. Each user gets one rate per grade on
            the Pay Rates page. The default grade applies when no INDOT zone matches the project.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Grade
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 p-4 bg-muted/20 text-sm space-y-1">
        <p className="font-medium text-sm">How pay grades fit together</p>
        <p className="text-muted-foreground text-sm">
          Pay grades are the columns of the rate matrix. Each user is assigned an hourly rate per
          grade on the Pay Rates page. INDOT projects route to a specific grade based on the
          project&apos;s county via INDOT Pay Zones.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : payGrades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pay grades configured yet.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create first grade
          </Button>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[110px] text-center">Default</TableHead>
                <TableHead className="w-[90px] text-center">Active</TableHead>
                <TableHead className="w-[80px] text-center">Order</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payGrades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{grade.code}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {grade.description || <span className="italic">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {grade.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={grade.isActive ? 'outline' : 'secondary'}
                      className="text-xs"
                    >
                      {grade.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {grade.sortOrder}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(grade)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive disabled:opacity-30"
                        onClick={() => setDeletingId(grade.id)}
                        disabled={grade.isDefault}
                        title={grade.isDefault ? 'Cannot delete the default grade' : 'Delete'}
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

      <PayGradeDialog open={dialogOpen} onClose={handleClose} editing={editing} />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(v) => {
          if (!v) setDeletingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pay grade?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingGrade?.name ? (
                <>
                  Permanently delete <span className="font-medium">{deletingGrade.name}</span>?
                  This will fail if any user rates or INDOT pay zones still reference it.
                </>
              ) : (
                'This will permanently delete the pay grade.'
              )}
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
