import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateUserRateDto } from './dto/create-user-rate.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  async createEntry(dto: CreateTimeEntryDto & { userId: string }) {
    const rate = await this.getActiveRate(dto.userId);
    const hourlyRate = dto.hourlyRate ?? rate?.rate ?? 0;
    const totalCost = dto.hours * hourlyRate;

    return this.prisma.timeEntry.create({
      data: {
        userId: dto.userId,
        projectId: dto.projectId,
        taskId: dto.taskId,
        workCodeId: dto.workCodeId,
        date: new Date(`${dto.date.split('T')[0]}T12:00:00.000Z`),
        hours: dto.hours,
        description: dto.description,
        billable: dto.billable ?? true,
        hourlyRate,
        totalCost,
        source: dto.source ?? 'manual',
        serviceItemId: dto.serviceItemId,
        serviceItemSubtaskId: dto.serviceItemSubtaskId,
      },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        workCode: { select: { id: true, code: true, name: true, parentCode: true, isMainTask: true } },
      },
    });
  }

  async getEntryById(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Time entry ${id} not found`);
    return entry;
  }

  async getEntries(filters: {
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(`${filters.startDate}T00:00:00.000Z`);
      if (filters.endDate) where.date.lte = new Date(`${filters.endDate}T23:59:59.999Z`);
    }

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: filters.limit ?? 100,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        workCode: { select: { id: true, code: true, name: true, parentCode: true, isMainTask: true } },
        serviceItem: { select: { id: true, name: true } },
        serviceItemSubtask: { select: { id: true, name: true } },
      },
    });
  }

  async updateEntry(id: string, data: Partial<CreateTimeEntryDto>) {
    const entry = await this.getEntryById(id);

    const hours = data.hours ?? entry.hours;
    const hourlyRate = data.hourlyRate ?? entry.hourlyRate ?? 0;

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(`${data.date.split('T')[0]}T12:00:00.000Z`) }),
        ...(data.hours !== undefined && { hours: data.hours }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.billable !== undefined && { billable: data.billable }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
        ...(data.workCodeId !== undefined && { workCodeId: data.workCodeId }),
        ...(data.serviceItemId !== undefined && { serviceItemId: data.serviceItemId }),
        ...(data.serviceItemSubtaskId !== undefined && { serviceItemSubtaskId: data.serviceItemSubtaskId }),
        totalCost: hours * hourlyRate,
      },
    });
  }

  async deleteEntry(id: string) {
    await this.prisma.timeEntry.delete({ where: { id } });
  }

  // ─── User Rates ───────────────────────────────────────────────────────────

  async createRate(dto: CreateUserRateDto) {
    return this.prisma.userRate.create({
      data: {
        userId: dto.userId,
        rate: dto.rate,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        type: dto.type ?? 'internal',
      },
    });
  }

  async getRatesForUser(userId: string) {
    return this.prisma.userRate.findMany({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private async getActiveRate(userId: string) {
    return this.prisma.userRate.findFirst({
      where: {
        userId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        type: 'internal',
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ─── Project Budget ───────────────────────────────────────────────────────

  async upsertBudget(dto: CreateProjectBudgetDto) {
    return this.prisma.projectBudget.upsert({
      where: { projectId: dto.projectId },
      update: {
        budgetedHours: dto.budgetedHours,
        budgetedCost: dto.budgetedCost,
      },
      create: {
        projectId: dto.projectId,
        budgetedHours: dto.budgetedHours ?? 0,
        budgetedCost: dto.budgetedCost ?? 0,
      },
    });
  }

  // ─── Summary Endpoints ────────────────────────────────────────────────────

  async getProjectSummary(projectId: string) {
    const budget = await this.prisma.projectBudget.findUnique({ where: { projectId } });
    const entries = await this.prisma.timeEntry.findMany({ where: { projectId } });

    const actualHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const actualCost = entries.reduce((sum, e) => sum + (e.totalCost ?? 0), 0);
    const billableHours = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);

    return {
      projectId,
      budgetedHours: budget?.budgetedHours ?? 0,
      budgetedCost: budget?.budgetedCost ?? 0,
      actualHours,
      actualCost,
      billableHours,
      hoursVariance: (budget?.budgetedHours ?? 0) - actualHours,
      costVariance: (budget?.budgetedCost ?? 0) - actualCost,
      hoursUtilization:
        budget?.budgetedHours
          ? Math.round((actualHours / budget.budgetedHours) * 100)
          : null,
    };
  }

  async getUserSummary(userId: string, startDate?: string, endDate?: string) {
    const where: any = { userId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.date.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const entries = await this.prisma.timeEntry.findMany({ where });
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const billableHours = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.hours, 0);
    const totalCost = entries.reduce((sum, e) => sum + (e.totalCost ?? 0), 0);

    return {
      userId,
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      billabilityRate: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
      totalCost,
      entryCount: entries.length,
    };
  }

  async getWeeklyTimesheet(startDate: string, userId?: string) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${startDate}T23:59:59.999Z`);
    end.setDate(end.getDate() + 6);

    const where: any = { date: { gte: start, lte: end } };
    if (userId) where.userId = userId;

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ userId: 'asc' }, { date: 'asc' }],
    });

    // Group by userId → day
    const byUser: Record<string, any> = {};
    for (const entry of entries) {
      const uid = entry.userId;
      const day = entry.date.toISOString().split('T')[0];
      if (!byUser[uid]) {
        byUser[uid] = { user: entry.user, days: {}, totalHours: 0 };
      }
      if (!byUser[uid].days[day]) byUser[uid].days[day] = 0;
      byUser[uid].days[day] += entry.hours;
      byUser[uid].totalHours += entry.hours;
    }

    return { startDate, endDate: end.toISOString().split('T')[0], rows: Object.values(byUser) };
  }
}
