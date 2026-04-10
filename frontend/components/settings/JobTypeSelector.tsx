'use client';

import { cn } from '@/lib/utils';
import type { Division } from '@/lib/types';

interface JobTypeSelectorProps {
  categories: Division[];
  selectedCategoryIds: string[];
  selectedJobTypeIds: string[];
  onCategoryToggle: (id: string) => void;
  onJobTypeToggle: (id: string) => void;
  className?: string;
}

export function JobTypeSelector({
  categories,
  selectedCategoryIds,
  selectedJobTypeIds,
  onCategoryToggle,
  onJobTypeToggle,
  className,
}: JobTypeSelectorProps) {
  const visibleJobTypes =
    selectedCategoryIds.length === 0
      ? categories.flatMap((c) => c.jobTypes ?? [])
      : categories
          .filter((c) => selectedCategoryIds.includes(c.id))
          .flatMap((c) => c.jobTypes ?? []);

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No project types configured. Add them under Settings → Divisions &amp; Job Types.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Division — top-level categories */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">Division</span>
          <span className="text-xs text-muted-foreground">Select one or more</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryToggle(cat.id)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all',
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-foreground border-border hover:border-primary/60',
                )}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Types — nested under the selected divisions */}
      {visibleJobTypes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">Job Types</span>
            <span className="text-xs text-muted-foreground">Select all that apply</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleJobTypes.map((st) => {
              const active = selectedJobTypeIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onJobTypeToggle(st.id)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs border transition-all',
                    active
                      ? 'bg-primary/10 text-primary border-primary/50 font-semibold'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-muted',
                  )}
                >
                  {st.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
