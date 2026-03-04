'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

/**
 * Feature flag — set to `true` to enable the currency switcher (USD ↔ GHS).
 * When `false` the app behaves exactly as before: always USD, no toggle shown.
 */
export const ENABLE_CURRENCY_SWITCHER = false;

export type Currency = 'USD' | 'GHS';

interface CurrencyContextValue {
  currency: Currency;
  symbol: string;
  setCurrency: (c: Currency) => void;
  /** Format a raw number, e.g. 123456 → "$123k" or "₵123k" */
  fmt: (value: number | null | undefined) => string;
  /** Full-precision format, e.g. 1234 → "$1,234" */
  fmtFull: (value: number | null | undefined) => string;
}

const SYMBOLS: Record<Currency, string> = { USD: '$', GHS: '₵' };
const STORAGE_KEY = 'crm_currency';

function compactFormat(symbol: string, v: number): string {
  if (v >= 1_000_000)
    return `${symbol}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)
    return `${symbol}${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`;
  return `${symbol}${v.toLocaleString()}`;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  symbol: '$',
  setCurrency: () => {},
  fmt: (v) => `$${(v ?? 0).toLocaleString()}`,
  fmtFull: (v) => `$${(v ?? 0).toLocaleString()}`,
});

export function CurrencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (!ENABLE_CURRENCY_SWITCHER) return 'USD';
    if (typeof window === 'undefined') return 'USD';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'GHS' ? 'GHS' : 'USD';
  });

  const setCurrency = useCallback((c: Currency) => {
    if (!ENABLE_CURRENCY_SWITCHER) return;
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const symbol = SYMBOLS[currency];

  const fmt = useCallback(
    (v: number | null | undefined) =>
      compactFormat(symbol, Math.abs(v ?? 0)),
    [symbol],
  );

  const fmtFull = useCallback(
    (v: number | null | undefined) =>
      `${symbol}${(v ?? 0).toLocaleString()}`,
    [symbol],
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, symbol, setCurrency, fmt, fmtFull }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
