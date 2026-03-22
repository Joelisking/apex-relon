import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ReportFiltersDto } from '../dto/report-filters.dto';

interface ReportUser {
  id: string;
  role: string;
  email: string;
  teamId?: string;
  canViewAll?: boolean;
}

export interface ProjectsOverview {
  totalProjects: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
  projectsByStatus: { status: string; count: number }[];
  onTimeProjects: number;
  overdueProjects: number;
}

export interface ProfitabilityData {
  projectId: string;
  projectName: string;
  clientName: string;
  status: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  startDate: Date | null;
  completedDate: Date | null;
}

export interface RiskDistribution {
  riskStatus: string;
  count: number;
  totalValue: number;
}

@Injectable()
export class ProjectsReportingService {
  constructor(private prisma: PrismaService) {}

  async getOverview(
    filters: ReportFiltersDto,
    user: ReportUser,
  ): Promise<ProjectsOverview> {
    const projects = await this.getFilteredProjects(filters, user);

    const totalRevenue = projects.reduce(
      (sum, p) => sum + (p.contractedValue || 0),
      0,
    );
    const totalCost = projects.reduce(
      (sum, p) => sum + (p.totalCost || 0),
      0,
    );
    const totalProfit = totalRevenue - totalCost;
    const avgMargin =
      totalRevenue > 0
        ? Math.round((totalProfit / totalRevenue) * 100)
        : 0;

    // Group by status
    const statusMap = new Map<string, number>();
    projects.forEach((project) => {
      statusMap.set(
        project.status,
        (statusMap.get(project.status) || 0) + 1,
      );
    });

    const projectsByStatus = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        count,
      }),
    );

    // Calculate on-time vs overdue
    const now = new Date();
    let onTimeProjects = 0;
    let overdueProjects = 0;

    projects.forEach((project) => {
      if (
        project.status === 'Completed' &&
        project.completedDate &&
        project.estimatedDueDate
      ) {
        if (
          new Date(project.completedDate) <=
          new Date(project.estimatedDueDate)
        ) {
          onTimeProjects++;
        } else {
          overdueProjects++;
        }
      } else if (
        project.status === 'Active' &&
        project.estimatedDueDate
      ) {
        if (now > new Date(project.estimatedDueDate)) {
          overdueProjects++;
        } else {
          onTimeProjects++;
        }
      }
    });

    return {
      totalProjects: projects.length,
      totalRevenue,
      totalCost,
      totalProfit,
      avgMargin,
      projectsByStatus,
      onTimeProjects,
      overdueProjects,
    };
  }

  async getProfitabilityData(
    filters: ReportFiltersDto,
    user: ReportUser,
  ): Promise<ProfitabilityData[]> {
    const projects = await this.prisma.project.findMany({
      where: this.buildWhereClause(filters, user),
      include: {
        client: true,
      },
      orderBy: {
        contractedValue: 'desc',
      },
    });

    return projects.map((project) => {
      const revenue = project.contractedValue || 0;
      const cost = project.totalCost || 0;
      const profit = revenue - cost;
      const margin =
        revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

      return {
        projectId: project.id,
        projectName: project.name,
        clientName: project.client.name,
        status: project.status,
        revenue,
        cost,
        profit,
        margin,
        startDate: project.startDate,
        completedDate: project.completedDate,
      };
    });
  }

  async getRiskDistribution(
    filters: ReportFiltersDto,
    user: ReportUser,
  ): Promise<RiskDistribution[]> {
    const projects = await this.getFilteredProjects(filters, user);

    const riskMap = new Map<
      string,
      { count: number; value: number }
    >();

    projects.forEach((project) => {
      const riskStatus = project.riskStatus || 'On Track';
      const existing = riskMap.get(riskStatus) || {
        count: 0,
        value: 0,
      };
      existing.count += 1;
      existing.value += project.contractedValue || 0;
      riskMap.set(riskStatus, existing);
    });

    return Array.from(riskMap.entries()).map(
      ([riskStatus, data]) => ({
        riskStatus,
        count: data.count,
        totalValue: data.value,
      }),
    );
  }

  async getCostBreakdown(
    filters: ReportFiltersDto,
    user: ReportUser,
  ): Promise<{ category: string; total: number; count: number }[]> {
    const projectWhere = this.buildWhereClause(filters, user);
    const logs = await this.prisma.costLog.groupBy({
      by: ['category'],
      where: { project: projectWhere },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    return logs.map((l) => ({
      category: l.category,
      total: l._sum.amount || 0,
      count: l._count.id,
    }));
  }

  private async getFilteredProjects(
    filters: ReportFiltersDto,
    user: ReportUser,
  ) {
    return this.prisma.project.findMany({
      where: this.buildWhereClause(filters, user),
      include: {
        client: true,
        projectManager: true,
      },
    });
  }

  private buildWhereClause(
    filters: ReportFiltersDto,
    user: ReportUser,
  ) {
    const where: Record<string, unknown> = {};

    // Date filter anchored to createdAt (always set; startDate is often null)
    const dateRange = this.getDateRange(filters);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    // Scope: canViewAll = see everything; has teamId = own team; else = self only
    if (!user.canViewAll) {
      if (user.teamId) {
        where.OR = [
          { assignments: { some: { user: { teamId: user.teamId } } } },
          { projectManager: { teamId: user.teamId } },
        ];
      } else {
        where.OR = [
          { assignments: { some: { userId: user.id } } },
          { projectManagerId: user.id },
        ];
      }
    }

    // Additional filters
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    return where;
  }

  private getDateRange(
    filters: ReportFiltersDto,
  ): { gte?: Date; lte?: Date } | null {
    if (filters.startDate || filters.endDate) {
      return {
        ...(filters.startDate
          ? { gte: new Date(filters.startDate) }
          : {}),
        ...(filters.endDate
          ? { lte: new Date(filters.endDate + 'T23:59:59.999Z') }
          : {}),
      };
    }
    if (filters.period) {
      return { gte: this.getPeriodStart(filters.period) };
    }
    return null;
  }

  private getPeriodStart(
    period: 'week' | 'month' | 'quarter' | 'year',
  ): Date {
    const now = new Date();
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
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }

    return date;
  }
}
