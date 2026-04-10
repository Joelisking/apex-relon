'use client';

import { useMemo } from 'react';
import type { Division } from '@/lib/types';

export function usePrimaryJobTypeName(
  selectedJobTypeIds: string[],
  divisions: Division[],
): string | undefined {
  return useMemo(() => {
    if (selectedJobTypeIds.length !== 1) return undefined;
    const id = selectedJobTypeIds[0];
    for (const div of divisions) {
      const jt = (div.jobTypes ?? []).find((s) => s.id === id);
      if (jt) return jt.name;
    }
    return undefined;
  }, [selectedJobTypeIds, divisions]);
}
