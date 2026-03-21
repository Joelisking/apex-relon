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
  // Service types visible given the current category selection.
  // If no categories selected, show all.
  const visibleTypes =
    selectedCategoryIds.length === 0
      ? categories.flatMap((c) => c.serviceTypes ?? [])
      : categories
          .filter((c) => selectedCategoryIds.includes(c.id))
          .flatMap((c) => c.serviceTypes ?? []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Categories */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          Categories <span className="text-muted-foreground/50">(select one or more)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = selectedCategoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryToggle(cat.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                )}>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Types */}
      {visibleTypes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Service Types <span className="text-muted-foreground/50">(select one or more)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleTypes.map((st) => {
              const active = selectedServiceTypeIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onServiceTypeToggle(st.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs border transition-colors',
                    active
                      ? 'bg-primary/10 text-primary border-primary/40 font-medium'
                      : 'bg-muted/40 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground',
                  )}>
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
