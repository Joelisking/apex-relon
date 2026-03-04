import { apiFetch } from './client';

export interface ForecastSummary {
  weightedPipeline: number;
  thisMonthTarget: number;
  wonThisMonth: number;
  forecastAccuracy: number; // percentage — based on last month's won vs target
}

export interface ForecastMonth {
  month: number;
  year: number;
  label: string; // e.g. "Mar 2026"
  target: number;
  weighted: number;
  won: number;
}

export interface ForecastTarget {
  id: string;
  month: number;
  year: number;
  targetAmount: number;
  currency: string;
}

export const forecastApi = {
  getSummary: () =>
    apiFetch<ForecastSummary>('/forecast/summary'),

  getMonthly: (months = 6) =>
    apiFetch<ForecastMonth[]>(`/forecast/monthly?months=${months}`),

  getTargets: () =>
    apiFetch<ForecastTarget[]>('/forecast/targets'),

  upsertTarget: (data: { month: number; year: number; targetAmount: number }) =>
    apiFetch<ForecastTarget>('/forecast/targets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
