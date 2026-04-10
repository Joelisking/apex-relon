import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { getClientDisplayName } from '../clients/client-display.helper';

export interface DashboardMetrics {
  // Revenue metrics
  totalRevenue: number;
  monthlyRevenue: number;
  quarterlyRevenue: number;
  revenueByClient: {
    clientId: string;
    clientName: string;
    revenue: number;
  }[];
  revenueByProject: {
    projectId: string;
    projectName: string;
    revenue: number;
  }[];

  // Conversion metrics
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  winRate: number; // Percentage
  avgDealSize: number;

  // Funnel metrics
  funnelDropOff: {
    stage: string;
    count: number;
    dropOffRate: number; // Percentage lost from previous stage
  }[];

  // Time metrics
  avgTimeToQuote: number; // Days from lead created to quote sent
  avgTimeToClose: number; // Days from lead created to deal closed

  // Project metrics
  totalProjects: number;
  activeProjects: number;
  projectsByStatus: { status: string; count: number }[];
  projectsAtRisk: {
    projectId: string;
    projectName: string;
    reason: string;
  }[];

  // Pipeline health
  pipelineValue: number;
  highValueDeals: {
    leadId: string;
    company: string;
    value: number;
    stage: string;
  }[];
  stalledLeads: {
    leadId: string;
    company: string;
    daysStalled: number;
    stage: string;
  }[];

  // Client metrics
  activeClients: number;
  topClients: {
    clientId: string;
    clientName: string;
    revenue: number;
  }[];

  // Risk indicators
  revenueConcentration: {
    topClientPercentage: number; // % of revenue from top client
    top5ClientsPercentage: number; // % of revenue from top 5 clients
    isHighRisk: boolean; // True if >50% from top 5
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async getMetrics(
    period: 'week' | 'month' | 'quarter' = 'month',
    userId: string = '',
    userPermissions: string[] = [],
  ): Promise<DashboardMetrics> {
    const now = new Date();
    const _periodStart = this.getPeriodStart(period, now);
    const monthStart = this.getPeriodStart('month', now);
    const quarterStart = this.getPeriodStart('quarter', now);
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const sixMonthsAgo = new Date(
      now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000,
    );

    // Scoped filters — applied to all queries based on user permissions
    const lf: Record<string, unknown> = userPermissions.includes('leads:view_all')
      ? {}
      : { OR: [{ assignedToId: userId }, { teamMembers: { some: { userId } } }] };

    const pf: Record<string, unknown> = userPermissions.includes('projects:view_all')
      ? {}
      : { assignments: { some: { userId } } };

    const canViewAllClients = userPermissions.includes('clients:view_all');

    // Run all aggregation queries in parallel — no full table scans
    const [
      stageCounts,
      pipelineAgg,
      projectStatusCounts,
      highValueDeals,
      stalledLeads,
      monthlyRevenueAgg,
      quarterlyRevenueAgg,
      projectsAtRisk,
      timeMetricLeads,
      leanProjects,
    ] = await Promise.all([
      // Lead counts per stage (funnel + totals)
      this.prisma.lead.groupBy({
        by: ['stage'],
        where: lf,
        _count: { id: true },
      }),
      // Open pipeline value and avg deal size
      this.prisma.lead.aggregate({
        where: { stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] }, ...lf },
        _sum: { expectedValue: true },
        _avg: { expectedValue: true },
        _count: { id: true },
      }),
      // Project counts by status
      this.prisma.project.groupBy({
        by: ['status'],
        where: pf,
        _count: { id: true },
      }),
      // Top 5 high-value open deals
      this.prisma.lead.findMany({
        where: { stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] }, ...lf },
        select: {
          id: true,
          company: true,
          expectedValue: true,
          stage: true,
        },
        orderBy: { expectedValue: 'desc' },
        take: 5,
      }),
      // Stalled leads (open + not updated in 30+ days)
      this.prisma.lead.findMany({
        where: {
          stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] },
          updatedAt: { lt: thirtyDaysAgo },
          ...lf,
        },
        select: {
          id: true,
          company: true,
          updatedAt: true,
          stage: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 20,
      }),
      // Revenue from projects completed this month (including approved addenda)
      this.prisma.project.findMany({
        where: {
          status: 'Completed',
          OR: [
            { completedDate: { gte: monthStart, lte: now } },
            { completedDate: null, updatedAt: { gte: monthStart, lte: now } },
          ],
          ...pf,
        },
        select: { contractedValue: true, addenda: { where: { status: { in: ['APPROVED', 'INVOICED'] } }, select: { total: true } } },
      }),
      // Revenue from projects completed this quarter (including approved addenda)
      this.prisma.project.findMany({
        where: {
          status: 'Completed',
          OR: [
            { completedDate: { gte: quarterStart, lte: now } },
            { completedDate: null, updatedAt: { gte: quarterStart, lte: now } },
          ],
          ...pf,
        },
        select: { contractedValue: true, addenda: { where: { status: { in: ['APPROVED', 'INVOICED'] } }, select: { total: true } } },
      }),
      // Projects at risk (minimal fields)
      this.prisma.project.findMany({
        where: {
          OR: [
            { status: 'On Hold' },
            { status: 'Active', startDate: null },
            { status: 'Active', startDate: { lt: sixMonthsAgo } },
          ],
          ...pf,
        },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
        },
      }),
      // Leads with time-tracking fields only (for avg calculations)
      // Limit to last 2 years to avoid a full table scan
      this.prisma.lead.findMany({
        select: {
          createdAt: true,
          quoteSentAt: true,
          dealClosedAt: true,
        },
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000),
          },
          OR: [
            { quoteSentAt: { not: null } },
            { dealClosedAt: { not: null } },
          ],
          ...lf,
        },
      }),
      // Top 10 projects by value (for revenueByProject) — include addenda
      this.prisma.project.findMany({
        select: {
          id: true,
          name: true,
          contractedValue: true,
          addenda: {
            where: { status: { in: ['APPROVED', 'INVOICED'] } },
            select: { total: true },
          },
        },
        where: pf,
        orderBy: { contractedValue: 'desc' },
        take: 10,
      }),
    ]);

    // Client revenue — always derived from completed projects so it stays accurate
    // regardless of whether client.lifetimeRevenue has been maintained.
    let totalRevenue: number;
    let revenueByClient: {
      clientId: string;
      clientName: string;
      revenue: number;
    }[];
    let activeClients: number;

    {
      const projectsWithClients = await this.prisma.project.findMany({
        where: { status: 'Completed', ...pf },
        select: {
          contractedValue: true,
          client: { select: { id: true, name: true, individualName: true, status: true } },
          addenda: {
            where: { status: { in: ['APPROVED', 'INVOICED'] } },
            select: { total: true },
          },
        },
      });
      const clientMap = new Map<
        string,
        { name: string; status: string; revenue: number }
      >();
      for (const proj of projectsWithClients) {
        if (!proj.client) continue;
        const addendaTotal = (proj.addenda ?? []).reduce((s, a) => s + a.total, 0);
        const revenue = (proj.contractedValue ?? 0) + addendaTotal;
        const entry = clientMap.get(proj.client.id);
        if (entry) {
          entry.revenue += revenue;
        } else {
          clientMap.set(proj.client.id, {
            name: getClientDisplayName(proj.client),
            status: proj.client.status,
            revenue,
          });
        }
      }
      const sorted = [...clientMap.entries()].sort(
        (a, b) => b[1].revenue - a[1].revenue,
      );
      totalRevenue = sorted.reduce((sum, [, c]) => sum + c.revenue, 0);
      revenueByClient = sorted.map(([id, c]) => ({
        clientId: id,
        clientName: c.name,
        revenue: c.revenue,
      }));
      // Only users with clients:view_all get the full active client count
      activeClients = canViewAllClients
        ? await this.prisma.client.count({ where: { status: 'Active' } })
        : revenueByClient.filter((c) => clientMap.get(c.clientId)?.status === 'Active').length;
    }

    // ── Derive totals from stage counts ──────────────────────────────
    const stageCountMap = Object.fromEntries(
      stageCounts.map((s) => [s.stage, s._count.id]),
    );
    const totalLeads = Object.values(stageCountMap).reduce(
      (a, b) => a + b,
      0,
    );
    const wonLeads = (stageCountMap['Closed Won'] ?? 0) + (stageCountMap['Won'] ?? 0);
    const lostLeads = (stageCountMap['Closed Lost'] ?? 0) + (stageCountMap['Lost'] ?? 0);
    const closedLeads = wonLeads + lostLeads;
    const winRate =
      closedLeads > 0
        ? Math.round((wonLeads / closedLeads) * 100)
        : 0;

    const pipelineValue = pipelineAgg._sum.expectedValue ?? 0;
    const avgDealSize = Math.round(
      pipelineAgg._avg.expectedValue ?? 0,
    );

    // ── Revenue ───────────────────────────────────────────────────────
    const monthlyRevenue = monthlyRevenueAgg.reduce((sum, p) => {
      const addendaTotal = (p.addenda ?? []).reduce((s, a) => s + a.total, 0);
      return sum + (p.contractedValue ?? 0) + addendaTotal;
    }, 0);
    const quarterlyRevenue = quarterlyRevenueAgg.reduce((sum, p) => {
      const addendaTotal = (p.addenda ?? []).reduce((s, a) => s + a.total, 0);
      return sum + (p.contractedValue ?? 0) + addendaTotal;
    }, 0);

    // ── Client metrics ────────────────────────────────────────────────
    const topClients = revenueByClient.slice(0, 5);
    const revenueConcentration = this.calculateRevenueConcentration(
      revenueByClient,
      totalRevenue,
    );

    // ── Project metrics ──────────────────────────────────────────────
    const statusCountMap = Object.fromEntries(
      projectStatusCounts.map((s) => [s.status, s._count.id]),
    );
    const totalProjects = Object.values(statusCountMap).reduce(
      (a, b) => a + b,
      0,
    );
    const activeProjects = statusCountMap['Active'] ?? 0;

    const allStatuses = [
      'Planning',
      'Active',
      'On Hold',
      'Completed',
      'Cancelled',
    ];
    const projectsByStatus = allStatuses.map((status) => ({
      status,
      count: statusCountMap[status] ?? 0,
    }));

    const computedProjectsAtRisk = projectsAtRisk.map((project) => {
      const reasons: string[] = [];
      if (project.status === 'On Hold')
        reasons.push('Project on hold');
      if (project.status === 'Active' && !project.startDate)
        reasons.push('Active but no start date');
      if (project.status === 'Active' && project.startDate) {
        const monthsActive =
          (now.getTime() - project.startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 30);
        if (monthsActive > 6)
          reasons.push(
            `Active for ${Math.round(monthsActive)} months`,
          );
      }
      return {
        projectId: project.id,
        projectName: project.name,
        reason: reasons.join(', '),
      };
    });

    // ── Funnel ───────────────────────────────────────────────────────
    // Normalize aliases so "Won"→"Closed Won" and "Lost"→"Closed Lost"
    // don't appear as separate rows in the funnel
    const normalizedStageCountMap = { ...stageCountMap };
    if (normalizedStageCountMap['Won']) {
      normalizedStageCountMap['Closed Won'] =
        (normalizedStageCountMap['Closed Won'] ?? 0) + normalizedStageCountMap['Won'];
      delete normalizedStageCountMap['Won'];
    }
    if (normalizedStageCountMap['Lost']) {
      normalizedStageCountMap['Closed Lost'] =
        (normalizedStageCountMap['Closed Lost'] ?? 0) + normalizedStageCountMap['Lost'];
      delete normalizedStageCountMap['Lost'];
    }

    const pipelineStageNames = await this.prisma.pipelineStage.findMany({
      where: { pipelineType: 'prospective_project' },
      orderBy: { sortOrder: 'asc' },
      select: { name: true },
    });
    const funnelDropOff = this.calculateFunnelDropOff(
      normalizedStageCountMap,
      pipelineStageNames.map((s) => s.name),
    );

    // ── Time metrics ─────────────────────────────────────────────────
    const { avgTimeToQuote, avgTimeToClose } =
      this.calculateTimeMetricsFromLeads(timeMetricLeads);

    // ── High value deals ──────────────────────────────────────────────
    const highValueDealsResult = highValueDeals.map((l) => ({
      leadId: l.id,
      company: l.company,
      value: l.expectedValue,
      stage: l.stage,
    }));

    // ── Stalled leads ─────────────────────────────────────────────────
    const stalledLeadsResult = stalledLeads.map((l) => {
      const daysStalled = Math.floor(
        (now.getTime() - l.updatedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        leadId: l.id,
        company: l.company,
        daysStalled,
        stage: l.stage,
      };
    });

    // ── Project revenue ───────────────────────────────────────────────
    const revenueByProject = leanProjects
      .map((p) => {
        const addendaTotal = (p.addenda ?? []).reduce((s, a) => s + a.total, 0);
        return {
          projectId: p.id,
          projectName: p.name,
          revenue: (p.contractedValue ?? 0) + addendaTotal,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      monthlyRevenue,
      quarterlyRevenue,
      revenueByClient,
      revenueByProject,
      totalLeads,
      wonLeads,
      lostLeads,
      winRate,
      avgDealSize,
      funnelDropOff,
      avgTimeToQuote,
      avgTimeToClose,
      totalProjects,
      activeProjects,
      projectsByStatus,
      projectsAtRisk: computedProjectsAtRisk,
      pipelineValue,
      highValueDeals: highValueDealsResult,
      stalledLeads: stalledLeadsResult,
      activeClients,
      topClients,
      revenueConcentration,
    };
  }

  async getRevenueTrend(
    period: 'week' | 'month' | 'quarter' = 'month',
    userId: string = '',
    userPermissions: string[] = [],
  ): Promise<{ month: string; revenue: number }[]> {
    const pf: Record<string, unknown> = userPermissions.includes('projects:view_all')
      ? {}
      : { assignments: { some: { userId } } };

    // Helper: sum revenue for completed projects in a date range.
    // Falls back to updatedAt when completedDate is null (projects completed
    // via EditProjectDialog which does not set completedDate).
    // Revenue = contractedValue + approved/invoiced addenda.
    const bucketRevenue = async (start: Date, end: Date): Promise<number> => {
      const projects = await this.prisma.project.findMany({
        where: {
          status: 'Completed',
          OR: [
            { completedDate: { gte: start, lt: end } },
            { completedDate: null, updatedAt: { gte: start, lt: end } },
          ],
          ...pf,
        },
        select: {
          contractedValue: true,
          addenda: {
            where: { status: { in: ['APPROVED', 'INVOICED'] } },
            select: { total: true },
          },
        },
      });
      return projects.reduce((sum, p) => {
        const addendaTotal = (p.addenda ?? []).reduce((s, a) => s + a.total, 0);
        return sum + (p.contractedValue ?? 0) + addendaTotal;
      }, 0);
    };

    if (period === 'week') {
      const buckets: { month: string; revenue: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        const dayOfYear = Math.floor(
          (start.getTime() - new Date(start.getFullYear(), 0, 0).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const weekNum = Math.ceil(dayOfYear / 7);
        buckets.push({
          month: `W${weekNum} ${start.getFullYear().toString().slice(-2)}`,
          revenue: await bucketRevenue(start, end),
        });
      }
      return buckets;
    }

    if (period === 'quarter') {
      const buckets: { month: string; revenue: number }[] = [];
      const now = new Date();
      const currentQuarterIndex =
        now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
      for (let i = 7; i >= 0; i--) {
        const qi = currentQuarterIndex - i;
        const year = Math.floor(qi / 4);
        const quarter = (qi % 4) + 1;
        const startMonth = (quarter - 1) * 3;
        const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
        const end = new Date(year, startMonth + 3, 1, 0, 0, 0, 0);
        buckets.push({
          month: `Q${quarter} ${year.toString().slice(-2)}`,
          revenue: await bucketRevenue(start, end),
        });
      }
      return buckets;
    }

    // Default: month — last 12 months
    const months: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setMonth(end.getMonth() + 1);
      months.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: await bucketRevenue(d, end),
      });
    }
    return months;
  }

  async getLeadVolumeTrend(userId: string = '', userPermissions: string[] = []) {
    const lf: Record<string, unknown> = userPermissions.includes('leads:view_all')
      ? {}
      : { OR: [{ assignedToId: userId }, { teamMembers: { some: { userId } } }] };

    const weeks: { week: string; count: number; start: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7 - 6);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = await this.prisma.lead.count({
        where: { createdAt: { gte: start, lt: end }, ...lf },
      });
      weeks.push({ week: `W${12 - i}`, count, start: start.toISOString().split('T')[0] });
    }
    return weeks;
  }

  async getPipelineInsights(userId: string = '', userPermissions: string[] = []) {
    const lf: Record<string, unknown> = userPermissions.includes('leads:view_all')
      ? {}
      : { OR: [{ assignedToId: userId }, { teamMembers: { some: { userId } } }] };

    const [leads, pipelineAgg] = await Promise.all([
      this.prisma.lead.findMany({
        where: { stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] }, ...lf },
        select: { id: true, stage: true, urgency: true, expectedValue: true, updatedAt: true },
      }),
      this.prisma.lead.aggregate({
        where: { stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] }, ...lf },
        _sum: { expectedValue: true },
        _count: { id: true },
      }),
    ]);

    const byStage: Record<string, number> = {};
    const byUrgency: Record<string, number> = {};
    let staleLeads = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const lead of leads) {
      byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
      if (lead.urgency) byUrgency[lead.urgency] = (byUrgency[lead.urgency] || 0) + 1;
      if (lead.updatedAt && lead.updatedAt < sevenDaysAgo) staleLeads++;
    }

    const totalLeads = pipelineAgg._count.id;
    const totalValue = pipelineAgg._sum.expectedValue || 0;
    const avgDealSize = totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [wonCount, closedCount] = await Promise.all([
      this.prisma.lead.count({ where: { stage: { in: ['Closed Won', 'Won'] }, updatedAt: { gte: thirtyDaysAgo }, ...lf } }),
      this.prisma.lead.count({ where: { stage: { in: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] }, updatedAt: { gte: thirtyDaysAgo }, ...lf } }),
    ]);
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return this.aiService.analyzePipeline({ totalLeads, byStage, totalValue, avgDealSize, winRate, staleLeads, byUrgency });
  }

  private getPeriodStart(
    period: 'week' | 'month' | 'quarter',
    now: Date,
  ): Date {
    const date = new Date(now);

    switch (period) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() - 3);
        break;
    }

    return date;
  }

  private calculateFunnelDropOff(
    stageCountMap: Record<string, number>,
    stages: string[],
  ): DashboardMetrics['funnelDropOff'] {

    const result: DashboardMetrics['funnelDropOff'] = [];
    let previousCount = stages.length > 0 ? (stageCountMap[stages[0]] ?? 0) : 0;

    stages.forEach((stage, idx) => {
      const count = stageCountMap[stage] ?? 0;
      let dropOffRate = 0;

      if (idx > 0 && previousCount > 0) {
        dropOffRate = Math.round(
          ((previousCount - count) / previousCount) * 100,
        );
      }

      result.push({
        stage,
        count,
        dropOffRate: Math.max(0, dropOffRate),
      });

      previousCount = count;
    });

    return result;
  }

  private calculateTimeMetricsFromLeads(
    leads: {
      createdAt: Date;
      quoteSentAt: Date | null;
      dealClosedAt: Date | null;
    }[],
  ): { avgTimeToQuote: number; avgTimeToClose: number } {
    const leadsWithQuote = leads.filter((l) => l.quoteSentAt);
    const avgTimeToQuote =
      leadsWithQuote.length > 0
        ? Math.round(
            leadsWithQuote.reduce((sum, l) => {
              return (
                sum +
                (l.quoteSentAt!.getTime() - l.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / leadsWithQuote.length,
          )
        : 0;

    const leadsWithClose = leads.filter((l) => l.dealClosedAt);
    const avgTimeToClose =
      leadsWithClose.length > 0
        ? Math.round(
            leadsWithClose.reduce((sum, l) => {
              return (
                sum +
                (l.dealClosedAt!.getTime() - l.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / leadsWithClose.length,
          )
        : 0;

    return { avgTimeToQuote, avgTimeToClose };
  }

  private calculateRevenueConcentration(
    revenueByClient: {
      clientId: string;
      clientName: string;
      revenue: number;
    }[],
    totalRevenue: number,
  ): DashboardMetrics['revenueConcentration'] {
    if (totalRevenue === 0 || revenueByClient.length === 0) {
      return {
        topClientPercentage: 0,
        top5ClientsPercentage: 0,
        isHighRisk: false,
      };
    }

    const topClient = revenueByClient[0];
    const top5Revenue = revenueByClient
      .slice(0, 5)
      .reduce((sum, c) => sum + c.revenue, 0);

    const topClientPercentage = Math.round(
      (topClient.revenue / totalRevenue) * 100,
    );
    const top5ClientsPercentage = Math.round(
      (top5Revenue / totalRevenue) * 100,
    );

    return {
      topClientPercentage,
      top5ClientsPercentage,
      isHighRisk: top5ClientsPercentage > 50,
    };
  }
}
