import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ProjectProfitability {
  projectId: string;
  revenue: number;
  laborCost: number;
  directCost: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  proposedHours: number;
  actualHours: number;
  hoursVariance: number;
  laborByUser: { userId: string; userName: string; hours: number; cost: number }[];
}

@Injectable()
export class ProjectsProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(projectId: string): Promise<ProjectProfitability> {
    const [project, timeEntries, costLogs, costBreakdown] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { contractedValue: true, primaryCostBreakdownId: true },
      }),
      this.prisma.timeEntry.findMany({
        where: { projectId },
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.costLog.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
      this.prisma.costBreakdown.findFirst({
        where: { projectId },
        include: {
          lines: {
            include: { roleEstimates: { select: { estimatedHours: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const revenue = project?.contractedValue ?? 0;
    const directCost = costLogs._sum.amount ?? 0;

    // Labor cost and breakdown by user
    const userMap = new Map<string, { name: string; hours: number; cost: number }>();
    let laborCost = 0;
    let actualHours = 0;

    for (const entry of timeEntries) {
      laborCost += entry.totalCost ?? 0;
      actualHours += entry.hours;

      const uid = entry.userId;
      const existing = userMap.get(uid);
      if (existing) {
        existing.hours += entry.hours;
        existing.cost += entry.totalCost ?? 0;
      } else {
        userMap.set(uid, {
          name: entry.user.name,
          hours: entry.hours,
          cost: entry.totalCost ?? 0,
        });
      }
    }

    // Proposed hours from the primary cost breakdown (or most recent)
    const targetBreakdown =
      project?.primaryCostBreakdownId
        ? costBreakdown
        : costBreakdown;

    const proposedHours =
      targetBreakdown?.lines.reduce(
        (sum, line) =>
          sum + line.roleEstimates.reduce((s, re) => s + re.estimatedHours, 0),
        0,
      ) ?? 0;

    const totalCost = laborCost + directCost;
    const grossProfit = revenue - totalCost;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      projectId,
      revenue,
      laborCost,
      directCost,
      totalCost,
      grossProfit,
      margin,
      proposedHours,
      actualHours,
      hoursVariance: actualHours - proposedHours,
      laborByUser: [...userMap.entries()].map(([userId, d]) => ({
        userId,
        userName: d.name,
        hours: d.hours,
        cost: d.cost,
      })),
    };
  }

  /**
   * Recalculates and persists Project.totalCost = labor + direct costs.
   * Called after every TimeEntry and CostLog create/update/delete.
   */
  async recalculateProjectCost(projectId: string): Promise<void> {
    const [laborAgg, directAgg] = await Promise.all([
      this.prisma.timeEntry.aggregate({
        where: { projectId },
        _sum: { totalCost: true },
      }),
      this.prisma.costLog.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
    ]);

    const laborCost = laborAgg._sum.totalCost ?? 0;
    const directCost = directAgg._sum.amount ?? 0;

    await this.prisma.project.update({
      where: { id: projectId },
      data: { totalCost: laborCost + directCost },
    });
  }
}
