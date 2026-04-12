'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api/users-client';
import { payGradesApi, type PayGrade } from '@/lib/api/user-rates-client';
import { UserRateRow } from './UserRateRow';

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
  const activeGrades = payGrades.filter((g) => g.isActive);
  const isLoading = usersLoading || gradesLoading;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
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
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/pay-grades">
            <Layers className="h-4 w-4 mr-1.5" />
            Manage Pay Grades
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border/50 p-4 bg-muted/20 text-sm space-y-1">
        <p className="font-medium text-sm">How pay grades work</p>
        <p className="text-muted-foreground text-sm">
          <strong>Base Rate</strong> applies to standard (non-INDOT) projects. INDOT projects use
          the rate from the pay grade assigned to the project&apos;s county via INDOT Pay Zones. If
          no INDOT rate is set for a user, the base rate is used as a fallback.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : activeGrades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No active pay grades.</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/admin/pay-grades">Create a pay grade</Link>
          </Button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <UserRateRow key={user.id} user={user} payGrades={activeGrades} />
          ))}
        </div>
      )}
    </div>
  );
}
