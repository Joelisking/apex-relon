'use client';

import { useMemo } from 'react';
import type { ServiceCategory } from '@/lib/types';

export function usePrimaryServiceTypeName(
  selectedServiceTypeIds: string[],
  serviceCategories: ServiceCategory[],
): string | undefined {
  return useMemo(() => {
    if (selectedServiceTypeIds.length !== 1) return undefined;
    const id = selectedServiceTypeIds[0];
    for (const cat of serviceCategories) {
      const st = (cat.serviceTypes ?? []).find((s) => s.id === id);
      if (st) return st.name;
    }
    return undefined;
  }, [selectedServiceTypeIds, serviceCategories]);
}
