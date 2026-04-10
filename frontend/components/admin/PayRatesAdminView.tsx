'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Plus, Loader2, DollarSign } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usersApi, type UserResponse } from '@/lib/api/users-client';
import { userRatesApi, payGradesApi, type UserRate, type PayGrade } from '@/lib/api/user-rates-client';

interface UserRateRowProps {
  user: UserResponse;
  payGrades: PayGrade[];
}

function UserRateRow({ user, payGrades }: UserRateRowProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newRate, setNewRate] = useState({
    rate: '',
    payGradeId: payGrades.find((g) => g.isDefault)?.id ?? '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const { data: rates = [], isLoading } = useQuery<UserRate[]>({
    queryKey: ['user-rates', user.id],
    queryFn: () => userRatesApi.getForUser(user.id),
    enabled: expanded,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      userRatesApi.create({
        userId: user.id,
        rate: parseFloat(newRate.rate),
        payGradeId: newRate.payGradeId,
        effectiveFrom: newRate.effectiveFrom,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rates', user.id] });
      setNewRate({
        rate: '',
        payGradeId: payGrades.find((g) => g.isDefault)?.id ?? '',
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      toast.success('Rate added');
    },
    onError: () => toast.error('Failed to add rate'),
  });

  function handleAdd() {
    const rateNum = parseFloat(newRate.rate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Enter a valid rate');
      return;
    }
    if (!newRate.payGradeId) {
      toast.error('Select a pay grade');
      return;
    }
    createMutation.mutate();
  }

  const ratesByGrade = payGrades.map((grade) => ({
    grade,
    items: rates.filter((r) => r.payGradeId === grade.id),
  }));

  const defaultGrade = payGrades.find((g) => g.isDefault);
  const defaultRate = rates.find((r) => r.payGradeId === defaultGrade?.id);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium">{user.name}</span>
          <Badge variant="outline" className="text-xs">
            {user.role}
          </Badge>
        </div>
        {defaultRate && !expanded && (
          <span className="text-muted-foreground font-mono text-xs">
            ${defaultRate.rate.toFixed(2)}/hr base
          </span>
        )}
        {!defaultRate && !expanded && (
          <span className="text-muted-foreground text-xs italic">No rates set</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-4 bg-muted/10">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {ratesByGrade.map(({ grade, items }) => (
                <div key={grade.id} className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium flex items-center gap-1.5">
                    {grade.name}
                    {grade.isDefault && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">default</Badge>
                    )}
                  </p>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-1">Not configured</p>
                  ) : (
                    <div className="rounded-md border border-border/40 divide-y divide-border/30 overflow-hidden">
                      {items.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm bg-background">
                          <span className="font-mono font-medium text-sm">
                            ${r.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr
                          </span>
                          <span className="text-muted-foreground text-xs">
                            from {format(new Date(r.effectiveFrom), 'MMM d, yyyy')}
                            {r.effectiveTo && ` – ${format(new Date(r.effectiveTo), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {showForm && (
                <div className="rounded-lg border border-border/50 p-3 space-y-3 bg-background">
                  <p className="text-xs font-medium">Add Rate</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Rate ($/hr)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={newRate.rate}
                        onChange={(e) => setNewRate((p) => ({ ...p, rate: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pay Grade</Label>
                      <Select
                        value={newRate.payGradeId}
                        onValueChange={(v) => setNewRate((p) => ({ ...p, payGradeId: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {payGrades.map((grade) => (
                            <SelectItem key={grade.id} value={grade.id}>
                              {grade.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Effective From</Label>
                      <Input
                        type="date"
                        value={newRate.effectiveFrom}
                        onChange={(e) => setNewRate((p) => ({ ...p, effectiveFrom: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAdd}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {!showForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rate
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function PayRatesAdminView() {
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: () => usersApi.getUsers(),
  });

  const { data: payGrades = [], isLoading: gradesLoading } = useQuery<PayGrade[]>({
    queryKey: ['pay-grades'],
    queryFn: () => payGradesApi.getAll(),
  });

  const users = usersData?.users ?? [];
  const isLoading = usersLoading || gradesLoading;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Pay Rates</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Configure hourly labor rates per employee and pay grade. Rates apply to time entries
            automatically based on project type.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 p-4 bg-muted/20 text-sm space-y-1">
        <p className="font-medium text-sm">How pay grades work</p>
        <p className="text-muted-foreground text-sm">
          <strong>Base Rate</strong> applies to standard (non-INDOT) projects. INDOT projects use the
          rate from the pay grade assigned to the project&apos;s county via INDOT Pay Zones. If no INDOT
          rate is set for a user, the base rate is used as a fallback.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <UserRateRow key={user.id} user={user} payGrades={payGrades} />
          ))}
        </div>
      )}
    </div>
  );
}
