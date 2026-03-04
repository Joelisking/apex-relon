'use client';

import { useState, useEffect } from 'react';
import { settingsApi } from '@/lib/api/client';
import type { DropdownOption } from '@/lib/types';

/** Fetch and cache dropdown options for a given category. */
export function useDropdownOptions(category: string) {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getDropdownOptions(category)
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  return { options, loading };
}
