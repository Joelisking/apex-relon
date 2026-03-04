import { useState } from 'react';

/**
 * Tracks raw string values for numeric inputs so the user can type decimals
 * and clear the field without the controlled value fighting them.
 * Commit the numeric value on blur via `commitRaw`.
 */
export function useNumericInput() {
  const [rawValues, setRawValues] = useState<Record<string, string>>({});

  const getRaw = (key: string, numeric: number) =>
    key in rawValues ? rawValues[key] : String(numeric);

  const setRaw = (key: string, val: string) =>
    setRawValues((prev) => ({ ...prev, [key]: val }));

  const clearRaw = (key: string) =>
    setRawValues((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const parseRaw = (key: string): number => {
    const raw = rawValues[key];
    if (raw === undefined) return NaN;
    const num = parseFloat(raw);
    return isNaN(num) ? 0 : num;
  };

  return { rawValues, getRaw, setRaw, clearRaw, parseRaw };
}
