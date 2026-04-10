'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { userRatesApi, payGradesApi, type UserRate, type PayGrade } from '@/lib/api/user-rates-client';

interface UserRatesSectionProps {
  userId: string;
}

export function UserRatesSection({ userId }: UserRatesSectionProps) {
  const [rates, setRates] = useState<UserRate[]>([]);
  const [payGrades, setPayGrades] = useState<PayGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [newRate, setNewRate] = useState({
    rate: '',
    payGradeId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    Promise.all([
      userRatesApi.getForUser(userId),
      payGradesApi.getAll(),
    ])
      .then(([fetchedRates, grades]) => {
        setRates(fetchedRates);
        setPayGrades(grades);
        const defaultGrade = grades.find((g) => g.isDefault);
        if (defaultGrade) {
          setNewRate((p) => ({ ...p, payGradeId: defaultGrade.id }));
        }
      })
      .catch(() => {
        setRates([]);
        setPayGrades([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleAdd() {
    const rateNum = parseFloat(newRate.rate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Enter a valid rate');
      return;
    }
    if (!newRate.payGradeId) {
      toast.error('Select a pay grade');
      return;
    }
    setAdding(true);
    try {
      const created = await userRatesApi.create({
        userId,
        rate: rateNum,
        payGradeId: newRate.payGradeId,
        effectiveFrom: newRate.effectiveFrom,
      });
      setRates((prev) => [...prev, created]);
      const defaultGrade = payGrades.find((g) => g.isDefault);
      setNewRate({
        rate: '',
        payGradeId: defaultGrade?.id ?? '',
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      toast.success('Rate added');
    } catch {
      toast.error('Failed to add rate');
    } finally {
      setAdding(false);
    }
  }

  function RateTable({ items, label }: { items: UserRate[]; label: string }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium">{label}</p>
        <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/40">
          {items.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-mono font-medium">
                ${r.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}/hr
              </span>
              <span className="text-muted-foreground text-xs">
                from {format(new Date(r.effectiveFrom), 'MMM d, yyyy')}
                {r.effectiveTo && ` – ${format(new Date(r.effectiveTo), 'MMM d, yyyy')}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Group rates by pay grade name for display
  const ratesByGrade = payGrades.map((grade) => ({
    grade,
    items: rates.filter((r) => r.payGradeId === grade.id),
  })).filter(({ items }) => items.length > 0);

  return (
    <div className="space-y-3 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Pay Rates</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3 mr-1" />
          Add Rate
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading rates…
        </div>
      ) : (
        <>
          {ratesByGrade.map(({ grade, items }) => (
            <RateTable key={grade.id} items={items} label={grade.name} />
          ))}
          {rates.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">No rates set yet.</p>
          )}
        </>
      )}

      {showForm && (
        <div className="rounded-lg border border-border/50 p-3 space-y-3 bg-muted/30">
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
                onValueChange={(v) => setNewRate((p) => ({ ...p, payGradeId: v }))}>
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
              onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
              disabled={adding}>
              {adding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Rate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
