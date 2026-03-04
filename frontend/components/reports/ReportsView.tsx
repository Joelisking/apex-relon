'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportFilters } from './ReportFilters';
import { LeadsReportTab } from './leads/LeadsReportTab';
import { ProjectsReportTab } from './projects/ProjectsReportTab';
import { ClientsReportTab } from './clients/ClientsReportTab';
import { RepsReportTab } from './reps/RepsReportTab';
import {
  ReportFilters as ReportFiltersType,
  leadsReportsApi,
  projectsReportsApi,
  clientsReportsApi,
  repsReportsApi,
} from '@/lib/api/reports';
import { BarChart3 } from 'lucide-react';

export function ReportsView() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('leads');
  const [filters, setFilters] = useState<ReportFiltersType>({ period: 'month' });
  // Track which tabs have ever been active so we only mount them once visited
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(
    new Set(['leads']),
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMountedTabs((prev) => new Set([...prev, tab]));
  };

  // Prefetch remaining tabs sequentially after the first tab loads
  useEffect(() => {
    const STALE = 5 * 60 * 1000;
    let cancelled = false;

    const run = async () => {
      await queryClient.prefetchQuery({
        queryKey: ['report-leads', filters],
        queryFn: async () => {
          const [overview, stageAnalysis, conversionFunnel, revenueByRep, overdueLeads] = await Promise.all([
            leadsReportsApi.getOverview(filters),
            leadsReportsApi.getStageAnalysis(filters),
            leadsReportsApi.getConversionFunnel(filters),
            leadsReportsApi.getRevenueByRep(filters),
            leadsReportsApi.getOverdue(filters),
          ]);
          return { overview, stageAnalysis, conversionFunnel, revenueByRep, overdueLeads };
        },
        staleTime: STALE,
      });
      if (cancelled) return;

      await queryClient.prefetchQuery({
        queryKey: ['report-projects', filters],
        queryFn: async () => {
          const [overview, profitability, riskDistribution] = await Promise.all([
            projectsReportsApi.getOverview(filters),
            projectsReportsApi.getProfitability(filters),
            projectsReportsApi.getRiskDistribution(filters),
          ]);
          return { overview, profitability, riskDistribution };
        },
        staleTime: STALE,
      });
      if (cancelled) return;

      await queryClient.prefetchQuery({
        queryKey: ['report-clients', filters],
        queryFn: async () => {
          const [overview, revenueAnalysis, healthTrends, retentionMetrics, engagementTrends, healthScoreTrends] = await Promise.all([
            clientsReportsApi.getOverview(filters),
            clientsReportsApi.getRevenueAnalysis(filters),
            clientsReportsApi.getHealthTrends(filters),
            clientsReportsApi.getRetentionMetrics(filters),
            clientsReportsApi.getEngagementTrends(filters),
            clientsReportsApi.getHealthScoreTrends(filters),
          ]);
          return { overview, revenueAnalysis, healthTrends, retentionMetrics, engagementTrends, healthScoreTrends };
        },
        staleTime: STALE,
      });
      if (cancelled) return;

      await queryClient.prefetchQuery({
        queryKey: ['report-reps', filters],
        queryFn: async () => {
          const [overview, performance, stageTime] = await Promise.all([
            repsReportsApi.getOverview(filters),
            repsReportsApi.getPerformance(filters),
            repsReportsApi.getStageTime(filters),
          ]);
          return { overview, performance, stageTime };
        },
        staleTime: STALE,
      });
    };

    run();
    return () => { cancelled = true; };
  }, [filters, queryClient]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            <h1 className="text-3xl font-display">Reports & Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive insights across all business metrics
          </p>
        </div>
        <ReportFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="reps">Sales Reps</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6">
          {mountedTabs.has('leads') && <LeadsReportTab filters={filters} />}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {mountedTabs.has('projects') && <ProjectsReportTab filters={filters} />}
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          {mountedTabs.has('clients') && <ClientsReportTab filters={filters} />}
        </TabsContent>

        <TabsContent value="reps" className="space-y-6">
          {mountedTabs.has('reps') && <RepsReportTab filters={filters} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
