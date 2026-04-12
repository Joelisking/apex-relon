'use client';

import { useState, useRef, useLayoutEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Check, X, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { userRatesApi, type PayGrade, type UserRate } from '@/lib/api/user-rates-client';

interface Props {
  userId: string;
  grade: PayGrade;
  rate: UserRate | null;
}

export function UserRateGradeCell({ userId, grade, rate }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setValue(rate ? String(rate.rate) : '');
    setEditing(true);
  }

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['user-rates', userId] });
  }

  const createMutation = useMutation({
    mutationFn: (newRate: number) =>
      userRatesApi.create({
        userId,
        rate: newRate,
        payGradeId: grade.id,
        effectiveFrom: new Date().toISOString().split('T')[0],
      }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast.success('Rate set');
    },
    onError: () => toast.error('Failed to set rate'),
  });

  const updateMutation = useMutation({
    mutationFn: (newRate: number) => userRatesApi.update(rate!.id, { rate: newRate }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast.success('Rate updated');
    },
    onError: () => toast.error('Failed to update rate'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => userRatesApi.delete(rate!.id),
    onSuccess: () => {
      invalidate();
      toast.success('Rate cleared');
    },
    onError: () => toast.error('Failed to clear rate'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  function commit() {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid rate');
      return;
    }
    if (rate) {
      if (num === rate.rate) {
        setEditing(false);
        return;
      }
      updateMutation.mutate(num);
    } else {
      createMutation.mutate(num);
    }
  }

  function cancel() {
    setEditing(false);
    setValue('');
  }

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground font-medium flex items-center gap-1.5">
        {grade.name}
        {grade.isDefault && (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
            default
          </Badge>
        )}
      </p>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            disabled={isPending}
            className="h-7 w-24 text-sm font-mono"
          />
          <span className="text-xs text-muted-foreground">/hr</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
            onClick={commit}
            disabled={isPending}
            title="Save"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={cancel}
            disabled={isPending}
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : rate ? (
        <div className="group flex items-center gap-2">
          <span className="font-mono font-medium text-sm">
            ${rate.rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span className="text-muted-foreground text-xs font-normal">/hr</span>
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={startEditing}
              title="Edit rate"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={isPending}
              title="Clear rate"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={startEditing}
        >
          <Plus className="h-3 w-3 mr-1" />
          Set rate
        </Button>
      )}
    </div>
  );
}
