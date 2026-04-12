'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { userRatesApi, payGradesApi, type UserRate, type PayGrade } from '@/lib/api/user-rates-client';
import { UserRateGradeCell } from './UserRateGradeCell';

interface UserRatesSectionProps {
  userId: string;
}

export function UserRatesSection({ userId }: UserRatesSectionProps) {
  const { data: rates = [], isLoading: ratesLoading } = useQuery<UserRate[]>({
    queryKey: ['user-rates', userId],
    queryFn: () => userRatesApi.getForUser(userId),
  });

  const { data: payGrades = [], isLoading: gradesLoading } = useQuery<PayGrade[]>({
    queryKey: ['pay-grades'],
    queryFn: () => payGradesApi.getAll(),
  });

  const ratesByGradeId = new Map(rates.map((r) => [r.payGradeId, r]));
  const activeGrades = payGrades.filter((g) => g.isActive);
  const isLoading = ratesLoading || gradesLoading;

  return (
    <div className="space-y-3 pt-2 border-t border-border/40">
      <p className="text-sm font-semibold">Pay Rates</p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading rates…
        </div>
      ) : activeGrades.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No active pay grades configured.</p>
      ) : (
        <div className="space-y-3">
          {activeGrades.map((grade) => (
            <UserRateGradeCell
              key={grade.id}
              userId={userId}
              grade={grade}
              rate={ratesByGradeId.get(grade.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
