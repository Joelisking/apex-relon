'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { UserResponse } from '@/lib/api/users-client';
import type { UserRate, PayGrade } from '@/lib/api/user-rates-client';
import { UserRateGradeCell } from './UserRateGradeCell';

interface Props {
  user: UserResponse;
  payGrades: PayGrade[];
  rates: UserRate[];
}

export function UserRateRow({ user, payGrades, rates }: Props) {
  const [expanded, setExpanded] = useState(false);

  const ratesByGradeId = new Map(rates.map((r) => [r.payGradeId, r]));
  const defaultGrade = payGrades.find((g) => g.isDefault);
  const defaultRate = defaultGrade ? ratesByGradeId.get(defaultGrade.id) : undefined;
  const configuredCount = rates.length;

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
        {!expanded &&
          (defaultRate ? (
            <span className="text-muted-foreground font-mono text-xs">
              ${defaultRate.rate.toFixed(2)}/hr base
              {configuredCount > 1 && (
                <span className="ml-2 text-muted-foreground/70">
                  +{configuredCount - 1} more
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs italic">No rates set</span>
          ))}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-4 bg-muted/10">
          {payGrades.map((grade) => (
            <UserRateGradeCell
              key={grade.id}
              userId={user.id}
              grade={grade}
              rate={ratesByGradeId.get(grade.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
