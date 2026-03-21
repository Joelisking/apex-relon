'use client';

import { cn } from '@/lib/utils';
import type { ServiceCategory } from '@/lib/types';

interface ServiceTypeSelectorProps {
  categories: ServiceCategory[];
  selectedCategoryIds: string[];
  selectedServiceTypeIds: string[];
  onCategoryToggle: (id: string) => void;
  onServiceTypeToggle: (id: string) => void;
  className?: string;
}

export function ServiceTypeSelector({
  categories,
  selectedCategoryIds,
  selectedServiceTypeIds,
  onCategoryToggle,
  onServiceTypeToggle,
  className,
}: ServiceTypeSelectorProps) {
  // Service categories visible given the current project type selection.
  // If no project types selected, show all.
  const visibleServiceCategories =
    selectedCategoryIds.length === 0
      ? categories.flatMap((c) => c.serviceTypes ?? [])
      : categories
          .filter((c) => selectedCategoryIds.includes(c.id))
          .flatMap((c) => c.serviceTypes ?? []);

  if (categories.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No project types configured. Add them under Settings → Service Categories &amp; Types.
      </p>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Project Type — top-level categories */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">Project Type</span>
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

      {/* Service Categories — service types nested under the selected project types */}
      {visibleServiceCategories.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">Service Categories</span>
            <span className="text-xs text-muted-foreground">Select all that apply</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleServiceCategories.map((st) => {
              const active = selectedServiceTypeIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onServiceTypeToggle(st.id)}
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
