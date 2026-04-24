import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { CreateUserRateDto } from './dto/create-user-rate.dto';
import { UpdateUserRateDto } from './dto/update-user-rate.dto';
import { CreateProjectBudgetDto } from './dto/create-project-budget.dto';
import { ProjectsProfitabilityService } from '../projects/projects-profitability.service';
import { AuditService } from '../audit/audit.service';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profitabilityService: ProjectsProfitabilityService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Time Entries ─────────────────────────────────────────────────────────

  async createEntry(dto: CreateTimeEntryDto & { userId: string; submittedById?: string }) {
    if (dto.submittedById) {
      const targetExists = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });
      if (!targetExists) {
        throw new BadRequestException(`User ${dto.userId} not found`);
      }
    }

    if (dto.projectId && dto.serviceItemId && dto.serviceItemSubtaskId) {
      await this.validateRoleForServiceItem(
        dto.userId,
        dto.projectId,
        dto.serviceItemId,
        dto.serviceItemSubtaskId,
      );
    }

    const rate = await this.resolveRate(dto.userId, dto.projectId);
    const hourlyRate = dto.hourlyRate ?? rate?.rate ?? 0;
    const totalCost = dto.hours * hourlyRate;

    let entry: Awaited<ReturnType<typeof this.prisma.timeEntry.create>>;
    try {
      entry = await this.prisma.timeEntry.create({
        data: {
          userId: dto.userId,
          submittedById: dto.submittedById ?? null,
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
          submittedBy: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          workCode: { select: { id: true, code: true, name: true, parentCode: true, isMainTask: true } },
        },
      });
      this.logger.log(`createEntry: time entry created id=${entry.id} userId=${dto.userId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'createEntry');
    }

    if (dto.projectId) {
      await this.profitabilityService.recalculateProjectCost(dto.projectId);
    }

    await this.auditService.log({
      userId: dto.submittedById ?? dto.userId,
      action: 'time_entry.created',
      targetUserId: dto.submittedById ? dto.userId : undefined,
      details: {
        entryId: entry!.id,
        hours: entry!.hours,
        date: dto.date,
        projectId: dto.projectId ?? null,
        serviceItemId: dto.serviceItemId ?? null,
        billable: entry!.billable,
      },
    });

    return entry!;
  }

  async getEntryById(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) {
      this.logger.warn(`getEntryById: time entry not found id=${id}`);
      throw new NotFoundException(`Time entry ${id} not found`);
    }
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
        submittedBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        workCode: { select: { id: true, code: true, name: true, parentCode: true, isMainTask: true } },
        serviceItem: { select: { id: true, name: true } },
        serviceItemSubtask: { select: { id: true, name: true } },
      },
    });
  }

  async updateEntry(id: string, data: Partial<CreateTimeEntryDto>, actorId?: string) {
    const entry = await this.getEntryById(id);

    const hours = data.hours ?? entry.hours;
    const hourlyRate = data.hourlyRate ?? entry.hourlyRate ?? 0;

    let updated: Awaited<ReturnType<typeof this.prisma.timeEntry.update>>;
    try {
      updated = await this.prisma.timeEntry.update({
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
      this.logger.log(`updateEntry: time entry updated id=${id}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateEntry');
    }

    const affectedProjectId = data.projectId ?? entry.projectId;
    if (affectedProjectId) {
      await this.profitabilityService.recalculateProjectCost(affectedProjectId);
    }
    if (data.projectId && data.projectId !== entry.projectId && entry.projectId) {
      await this.profitabilityService.recalculateProjectCost(entry.projectId);
    }

    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: 'time_entry.updated',
        targetUserId: entry.userId !== actorId ? entry.userId : undefined,
        details: { entryId: id, changes: data },
      });
    }

    return updated!;
  }

  async deleteEntry(id: string, actorId?: string) {
    const entry = await this.prisma.timeEntry.findUnique({
      where: { id },
      select: { projectId: true, userId: true, hours: true },
    });

    try {
      await this.prisma.timeEntry.delete({ where: { id } });
      this.logger.log(`deleteEntry: time entry deleted id=${id}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteEntry');
    }

    if (entry?.projectId) {
      await this.profitabilityService.recalculateProjectCost(entry.projectId);
    }
    if (actorId) {
      await this.auditService.log({
        userId: actorId,
        action: 'time_entry.deleted',
        targetUserId: entry?.userId !== actorId ? entry?.userId : undefined,
        details: { entryId: id, hours: entry?.hours, projectId: entry?.projectId ?? null },
      });
    }
  }

  // ─── User Rates ───────────────────────────────────────────────────────────

  async createRate(dto: CreateUserRateDto) {
    try {
      const rate = await this.prisma.userRate.create({
        data: {
          userId: dto.userId,
          rate: dto.rate,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          payGradeId: dto.payGradeId,
        },
        include: { payGrade: { select: { id: true, name: true, code: true } } },
      });
      this.logger.log(`createRate: user rate created id=${rate.id} userId=${dto.userId}`);
      return rate;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createRate');
    }
  }

  async getAllRates() {
    return this.prisma.userRate.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: { payGrade: { select: { id: true, name: true, code: true } } },
    });
  }

  async getRatesForUser(userId: string) {
    return this.prisma.userRate.findMany({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
      include: { payGrade: { select: { id: true, name: true, code: true } } },
    });
  }

  async updateRate(id: string, dto: UpdateUserRateDto) {
    const data: {
      rate?: number;
      effectiveFrom?: Date;
      effectiveTo?: Date | null;
    } = {};
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.effectiveFrom !== undefined) data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) {
      data.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    }

    try {
      const rate = await this.prisma.userRate.update({
        where: { id },
        data,
        include: { payGrade: { select: { id: true, name: true, code: true } } },
      });
      this.logger.log(`updateRate: user rate updated id=${id}`);
      return rate;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateRate');
    }
  }

  async deleteRate(id: string) {
    try {
      await this.prisma.userRate.delete({ where: { id } });
      this.logger.log(`deleteRate: user rate deleted id=${id}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteRate');
    }
  }

  private async validateRoleForServiceItem(
    userId: string,
    projectId: string,
    serviceItemId: string,
    serviceItemSubtaskId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return;

    const userRole = user.role;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { primaryCostBreakdownId: true },
    });

    if (project?.primaryCostBreakdownId) {
      const cbLine = await this.prisma.costBreakdownLine.findFirst({
        where: {
          costBreakdownId: project.primaryCostBreakdownId,
          serviceItemId,
        },
        select: { id: true },
      });

      if (cbLine) {
        const estimate = await this.prisma.costBreakdownRoleEstimate.findFirst({
          where: {
            lineId: cbLine.id,
            subtaskId: serviceItemSubtaskId,
            role: userRole,
            estimatedHours: { gt: 0 },
          },
        });

        if (estimate) return;

        const addendumLine = await this.prisma.projectAddendumLine.findFirst({
          where: {
            addendum: {
              projectId,
              status: { in: ['APPROVED', 'INVOICED'] },
            },
            serviceItemId,
            serviceItemSubtaskId,
            role: userRole,
            estimatedHours: { gt: 0 },
          },
        });

        if (addendumLine) return;

        throw new BadRequestException(
          `Role '${userRole}' is not assigned to this service item subtask in the project's cost breakdown.`,
        );
      }
    }
  }

  private async resolveRate(userId: string, projectId?: string | null) {
    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { county: true, isIndot: true },
      });

      if (project?.isIndot && project.county?.length) {
        const zone = await this.prisma.indotPayZone.findFirst({
          where: { counties: { hasSome: project.county } },
          select: { payGradeId: true },
        });

        if (zone) {
          const indotRate = await this.prisma.userRate.findFirst({
            where: {
              userId,
              payGradeId: zone.payGradeId,
              effectiveFrom: { lte: new Date() },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
            },
            orderBy: { effectiveFrom: 'desc' },
          });
          if (indotRate) return indotRate;
        }
      }
    }

    return this.prisma.userRate.findFirst({
      where: {
        userId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
        payGrade: { isDefault: true },
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async checkUserRate(userId: string, projectId?: string): Promise<{ hasRate: boolean }> {
    const rate = await this.resolveRate(userId, projectId ?? null);
    return { hasRate: rate !== null && rate.rate > 0 };
  }

  async getSubtaskBudget(
    userId: string,
    projectId: string,
    serviceItemSubtaskId: string,
  ): Promise<{ budgetHours: number; loggedHours: number; remainingHours: number; role: string | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const userRole = user?.role ?? null;

    const roleMatchers: string[] = [];
    if (userRole) {
      roleMatchers.push(userRole);
      const roleRecord = await this.prisma.role.findUnique({
        where: { key: userRole },
        select: { label: true },
      });
      if (roleRecord && roleRecord.label !== userRole) {
        roleMatchers.push(roleRecord.label);
      }
    }

    const cb = await this.prisma.costBreakdown.findFirst({
      where: { projectId },
      include: {
        lines: {
          include: {
            roleEstimates: {
              where: {
                subtaskId: serviceItemSubtaskId,
                ...(roleMatchers.length > 0 ? { role: { in: roleMatchers } } : {}),
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const cbBudgetHours =
      cb?.lines.reduce(
        (sum, line) => sum + line.roleEstimates.reduce((s, re) => s + re.estimatedHours, 0),
        0,
      ) ?? 0;

    const addendumLines = await this.prisma.projectAddendumLine.findMany({
      where: {
        addendum: { projectId, status: { in: ['APPROVED', 'INVOICED'] } },
        serviceItemSubtaskId,
        ...(roleMatchers.length > 0 ? { role: { in: roleMatchers } } : {}),
      },
    });
    const addendumHours = addendumLines.reduce((s, l) => s + l.estimatedHours, 0);

    const budgetHours = cbBudgetHours + addendumHours;

    const agg = await this.prisma.timeEntry.aggregate({
      where: { projectId, serviceItemSubtaskId, userId },
      _sum: { hours: true },
    });
    const loggedHours = agg._sum.hours ?? 0;

    return { budgetHours, loggedHours, remainingHours: budgetHours - loggedHours, role: userRole };
  }

  // ─── Project Budget ───────────────────────────────────────────────────────

  async upsertBudget(dto: CreateProjectBudgetDto) {
    try {
      const budget = await this.prisma.projectBudget.upsert({
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
      this.logger.log(`upsertBudget: budget upserted projectId=${dto.projectId}`);
      return budget;
    } catch (error) {
      handlePrismaError(error, this.logger, 'upsertBudget');
    }
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

  async getWeeklyTimesheetByProject(startDate: string, userId?: string) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${startDate}T23:59:59.999Z`);
    end.setDate(end.getDate() + 6);

    const where: Record<string, unknown> = { date: { gte: start, lte: end } };
    if (userId) where.userId = userId;

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, status: true, jobNumber: true } },
      },
      orderBy: [{ projectId: 'asc' }, { date: 'asc' }],
    });

    const byProject: Record<string, {
      project: { id: string; name: string; status: string; jobNumber: string | null } | null;
      days: Record<string, {
        hours: number;
        entries: {
          id: string; hours: number; description: string | null; billable: boolean;
          workCodeId: string | null; serviceItemId: string | null;
          serviceItemSubtaskId: string | null; hourlyRate: number | null;
        }[];
      }>;
      totalHours: number;
    }> = {};

    for (const entry of entries) {
      const pid = entry.projectId ?? '__none__';
      const day = entry.date.toISOString().split('T')[0];

      if (!byProject[pid]) {
        byProject[pid] = {
          project: entry.project
            ? { id: entry.project.id, name: entry.project.name, status: entry.project.status, jobNumber: entry.project.jobNumber }
            : null,
          days: {},
          totalHours: 0,
        };
      }

      if (!byProject[pid].days[day]) {
        byProject[pid].days[day] = { hours: 0, entries: [] };
      }

      byProject[pid].days[day].hours += entry.hours;
      byProject[pid].days[day].entries.push({
        id: entry.id,
        hours: entry.hours,
        description: entry.description,
        billable: entry.billable,
        workCodeId: entry.workCodeId,
        serviceItemId: entry.serviceItemId,
        serviceItemSubtaskId: entry.serviceItemSubtaskId,
        hourlyRate: entry.hourlyRate,
      });
      byProject[pid].totalHours += entry.hours;
    }

    const dailyTotals: Record<string, number> = {};
    for (const row of Object.values(byProject)) {
      for (const [day, data] of Object.entries(row.days)) {
        dailyTotals[day] = (dailyTotals[day] ?? 0) + data.hours;
      }
    }

    const grandTotal = Object.values(byProject).reduce((s, r) => s + r.totalHours, 0);

    return {
      startDate,
      endDate: end.toISOString().split('T')[0],
      rows: Object.values(byProject),
      dailyTotals,
      grandTotal,
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
