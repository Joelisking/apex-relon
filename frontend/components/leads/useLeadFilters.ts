'use client';

import { useState } from 'react';
import type { Lead } from '@/lib/types';
import { DATE_PRESET_ALL, type DatePresetFilterValue } from '@/components/ui/date-preset-filter';
import { passesFilter, type FilterValues, type FilterDef } from '@/components/ui/filter-bar';

function inRange(dateStr: string | null | undefined, range: DatePresetFilterValue['range']): boolean {
  if (!range?.from && !range?.to) return true;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (range.from && d < range.from) return false;
  if (range.to) {
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    if (d > to) return false;
  }
  return true;
}

export function useLeadFilters(leads: Lead[]) {
  const [createdFilter, setCreatedFilter] = useState<DatePresetFilterValue>(DATE_PRESET_ALL);
  const [startFilter, setStartFilter] = useState<DatePresetFilterValue>(DATE_PRESET_ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [facets, setFacetsState] = useState<FilterValues>({});

  function setFacet(id: string, values: string[]) {
    setFacetsState((prev) => ({ ...prev, [id]: values }));
  }

  function clearAllFilters() {
    setCreatedFilter(DATE_PRESET_ALL);
    setStartFilter(DATE_PRESET_ALL);
    setSearchQuery('');
    setFacetsState({});
  }

  const filteredLeads = leads.filter((l) => {
    if (!inRange(l.createdAt as string | undefined, createdFilter.range)) return false;
    if (!inRange(l.likelyStartDate as string | undefined, startFilter.range)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const searchable = [l.contactName, l.company, l.projectName, ...(l.county ?? []), l.source]
        .filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    if (!passesFilter(l.stage, facets.stage ?? [])) return false;
    if (!passesFilter(l.urgency, facets.urgency ?? [])) return false;
    if (!passesFilter(l.source, facets.source ?? [])) return false;
    if ((facets.county ?? []).length > 0 && !(l.county ?? []).some((c) => (facets.county ?? []).includes(c))) return false;
    if (!passesFilter(l.serviceType?.name, facets.serviceType ?? [])) return false;
    if (!passesFilter(l.aiRiskLevel, facets.aiRiskLevel ?? [])) return false;
    const owner = (l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || 'Unassigned';
    if (!passesFilter(owner, facets.owner ?? [])) return false;
    return true;
  });

  const isFiltered =
    createdFilter.preset !== 'all' ||
    startFilter.preset !== 'all' ||
    !!searchQuery.trim() ||
    Object.values(facets).some((v) => v.length > 0);

  const leadFilterDefs: FilterDef[] = [
    {
      id: 'stage',
      title: 'Stage',
      options: [...new Set(leads.map((l) => l.stage).filter(Boolean))].map((v) => ({
        label: v!, value: v!,
        count: leads.filter((l) => l.stage === v).length,
      })),
    },
    {
      id: 'urgency',
      title: 'Urgency',
      options: [...new Set(leads.map((l) => l.urgency).filter(Boolean))].map((v) => ({
        label: v!, value: v!,
        count: leads.filter((l) => l.urgency === v).length,
      })),
    },
    {
      id: 'source',
      title: 'Source',
      options: [...new Set(leads.map((l) => l.source).filter(Boolean))].map((v) => ({
        label: v!, value: v!,
        count: leads.filter((l) => l.source === v).length,
      })),
    },
    {
      id: 'county',
      title: 'County',
      options: [...new Set(leads.flatMap((l) => l.county ?? []).filter(Boolean))].map((v) => ({
        label: v, value: v,
        count: leads.filter((l) => (l.county ?? []).includes(v)).length,
      })),
    },
    {
      id: 'serviceType',
      title: 'Service Type',
      options: [...new Set(leads.map((l) => l.serviceType?.name).filter(Boolean))].map((v) => ({
        label: v!, value: v!,
        count: leads.filter((l) => l.serviceType?.name === v).length,
      })),
    },
    {
      id: 'aiRiskLevel',
      title: 'AI Risk',
      options: [...new Set(leads.map((l) => l.aiRiskLevel).filter(Boolean))].map((v) => ({
        label: v!, value: v!,
        count: leads.filter((l) => l.aiRiskLevel === v).length,
      })),
    },
    {
      id: 'owner',
      title: 'Owner',
      options: [...new Set(leads.map((l) => (l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || 'Unassigned'))].map((v) => ({
        label: v, value: v,
        count: leads.filter((l) => ((l as unknown as { assignedTo?: { name?: string } }).assignedTo?.name || 'Unassigned') === v).length,
      })),
    },
  ];

  return {
    createdFilter, setCreatedFilter,
    startFilter, setStartFilter,
    searchQuery, setSearchQuery,
    facets, setFacet,
    clearAllFilters,
    filteredLeads,
    isFiltered,
    leadFilterDefs,
  };
}
