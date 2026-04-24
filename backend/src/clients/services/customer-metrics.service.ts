import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CustomerMetrics {
  daysSinceLastContact: number;
  totalActivityCount: number;
  recentActivityCount: number;
  totalProjectCount: number;
  activeProjectCount: number;
  completedProjectCount: number;
  totalRevenue: number;
  recentRevenue: number;
  avgProjectValue: number;
  engagementScore: number; // 0-100
}

@Injectable()
export class CustomerMetricsService {
  private readonly logger = new Logger(CustomerMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batch-load metrics for many customers in 2 queries (avoids N+1).
   * Requires pre-loaded projects array on each customer.
   */
  async calculateBatchMetrics(
    customers: { id: string; createdAt: Date; projects?: Record<string, unknown>[] }[],
  ): Promise<Map<string, CustomerMetrics>> {
    if (customers.length === 0) return new Map();

    const ids = customers.map((c) => c.id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [allTimeGroups, recentGroups] = await Promise.all([
      this.prisma.activity.groupBy({
        by: ['clientId'],
        where: { clientId: { in: ids } },
        _count: { id: true },
        _max: { createdAt: true },
      }),
      this.prisma.activity.groupBy({
        by: ['clientId'],
        where: { clientId: { in: ids }, createdAt: { gte: thirtyDaysAgo } },
        _count: { id: true },
      }),
    ]);

    const allTimeMap = new Map(allTimeGroups.map((g) => [g.clientId, g]));
    const recentMap = new Map(recentGroups.map((g) => [g.clientId, g]));

    const result = new Map<string, CustomerMetrics>();

    for (const customer of customers) {
      const allTime = allTimeMap.get(customer.id);
      const recent = recentMap.get(customer.id);
      const totalActivityCount = allTime?._count.id ?? 0;
      const recentActivityCount = recent?._count.id ?? 0;
      const lastActivityAt = allTime?._max.createdAt ?? null;

      const daysSinceLastContact = lastActivityAt
        ? Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const projects = customer.projects ?? [];
      const totalProjectCount = projects.length;
      const activeProjectCount = projects.filter(
        (p: Record<string, unknown>) => p.status === 'Active' || p.status === 'Planning',
      ).length;
      const completedProjectCount = projects.filter(
        (p: Record<string, unknown>) => p.status === 'Completed',
      ).length;

      const totalRevenue = projects.reduce(
        (sum: number, p: Record<string, unknown>) => sum + ((p.contractedValue as number) ?? 0),
        0,
      );
      const recentRevenue = projects
        .filter(
          (p: Record<string, unknown>) =>
            new Date(p.createdAt as string) >= twelveMonthsAgo ||
            (p.completedDate && new Date(p.completedDate as string) >= twelveMonthsAgo),
        )
        .reduce((sum: number, p: Record<string, unknown>) => sum + ((p.contractedValue as number) ?? 0), 0);

      result.set(customer.id, {
        daysSinceLastContact,
        totalActivityCount,
        recentActivityCount,
        totalProjectCount,
        activeProjectCount,
        completedProjectCount,
        totalRevenue,
        recentRevenue,
        avgProjectValue: totalProjectCount > 0 ? totalRevenue / totalProjectCount : 0,
        engagementScore: this.calculateEngagementScore({
          daysSinceLastContact,
          recentActivityCount,
          activeProjectCount,
          totalProjectCount,
          completedProjectCount,
        }),
      });
    }

    return result;
  }

  async calculateMetrics(customerId: string, createdAt: Date): Promise<CustomerMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const latestActivity = await this.prisma.activity.findFirst({
      where: { clientId: customerId },
      orderBy: { createdAt: 'desc' },
    });

    const daysSinceLastContact = latestActivity
      ? Math.floor((now.getTime() - latestActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const [totalActivityCount, recentActivityCount] = await Promise.all([
      this.prisma.activity.count({ where: { clientId: customerId } }),
      this.prisma.activity.count({
        where: { clientId: customerId, createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const projects = await this.prisma.project.findMany({ where: { clientId: customerId } });
    const totalProjectCount = projects.length;
    const activeProjectCount = projects.filter(
      (p) => p.status === 'Active' || p.status === 'Planning',
    ).length;
    const completedProjectCount = projects.filter((p) => p.status === 'Completed').length;
    const totalRevenue = projects.reduce((sum, p) => sum + p.contractedValue, 0);
    const recentRevenue = projects
      .filter(
        (p) =>
          p.createdAt >= twelveMonthsAgo ||
          (p.completedDate && p.completedDate >= twelveMonthsAgo),
      )
      .reduce((sum, p) => sum + p.contractedValue, 0);

    return {
      daysSinceLastContact,
      totalActivityCount,
      recentActivityCount,
      totalProjectCount,
      activeProjectCount,
      completedProjectCount,
      totalRevenue,
      recentRevenue,
      avgProjectValue: totalProjectCount > 0 ? totalRevenue / totalProjectCount : 0,
      engagementScore: this.calculateEngagementScore({
        daysSinceLastContact,
        recentActivityCount,
        activeProjectCount,
        totalProjectCount,
        completedProjectCount,
      }),
    };
  }

  calculateEngagementScore(data: {
    daysSinceLastContact: number;
    recentActivityCount: number;
    activeProjectCount: number;
    totalProjectCount: number;
    completedProjectCount: number;
  }): number {
    let score = 0;

    if (data.daysSinceLastContact <= 7) score += 25;
    else if (data.daysSinceLastContact <= 14) score += 20;
    else if (data.daysSinceLastContact <= 30) score += 15;
    else if (data.daysSinceLastContact <= 60) score += 10;
    else if (data.daysSinceLastContact <= 90) score += 5;

    if (data.recentActivityCount >= 10) score += 25;
    else if (data.recentActivityCount >= 7) score += 20;
    else if (data.recentActivityCount >= 5) score += 15;
    else if (data.recentActivityCount >= 3) score += 10;
    else if (data.recentActivityCount >= 1) score += 5;

    if (data.activeProjectCount >= 3) score += 20;
    else if (data.activeProjectCount === 2) score += 15;
    else if (data.activeProjectCount === 1) score += 10;

    if (data.completedProjectCount >= 5) score += 10;
    else if (data.completedProjectCount >= 3) score += 8;
    else if (data.completedProjectCount >= 2) score += 5;
    else if (data.completedProjectCount >= 1) score += 3;

    if (data.totalProjectCount >= 10) score += 20;
    else if (data.totalProjectCount >= 7) score += 15;
    else if (data.totalProjectCount >= 5) score += 10;
    else if (data.totalProjectCount >= 3) score += 5;

    return Math.min(score, 100);
  }
}
