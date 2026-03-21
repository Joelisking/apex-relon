import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { CustomerMetricsService } from './customer-metrics.service';
import { CustomerHealthFlagsService } from './customer-health-flags.service';

@Injectable()
export class CustomerCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowsService: WorkflowsService,
    private readonly metricsService: CustomerMetricsService,
    private readonly healthFlagsService: CustomerHealthFlagsService,
  ) {}

  async findAll(userId?: string, userRole?: string) {
    const where: Record<string, unknown> = {};

    if (userRole === 'SALES') {
      where.accountManagerId = userId;
    } else if (userRole === 'BDM') {
      const teamMembers = await this.prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      where.accountManagerId = { in: [...teamMembers.map((m) => m.id), userId] };
    }

    const customers = await this.prisma.client.findMany({
      where,
      include: {
        accountManager: { select: { id: true, name: true, email: true, role: true } },
        projects: {
          select: {
            id: true, name: true, status: true, contractedValue: true,
            startDate: true, completedDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        convertedFromLeads: {
          select: { id: true, contactName: true, company: true, expectedValue: true, stage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const batchMetrics = await this.metricsService.calculateBatchMetrics(
      customers.map((c) => ({ id: c.id, createdAt: c.createdAt, projects: c.projects })),
    );

    return customers.map((customer) => {
      const metrics = batchMetrics.get(customer.id)!;
      const healthFlags = this.healthFlagsService.detectHealthFlags(metrics, customer.lifetimeRevenue);
      return {
        ...customer,
        metrics,
        healthFlags,
        suggestedActions: this.healthFlagsService.generateSuggestedActions(healthFlags, metrics),
      };
    });
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const customer = await this.prisma.client.findUnique({
      where: { id },
      include: {
        accountManager: { select: { id: true, name: true, email: true, role: true } },
        projects: {
          select: {
            id: true, name: true, status: true, contractedValue: true,
            startDate: true, completedDate: true, description: true,
            projectManager: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          select: {
            id: true, type: true, activityDate: true, activityTime: true,
            reason: true, notes: true, meetingType: true, createdAt: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        convertedFromLeads: {
          select: { id: true, contactName: true, company: true, expectedValue: true, stage: true },
        },
      },
    });

    if (!customer) return null;

    if (userRole === 'SALES' && customer.accountManagerId !== userId) {
      throw new Error('You do not have permission to view this customer');
    }

    if (userRole === 'BDM') {
      const teamMembers = await this.prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      const canAccess =
        customer.accountManagerId === userId ||
        teamMembers.map((m) => m.id).includes(customer.accountManagerId || '');
      if (!canAccess) throw new Error('You do not have permission to view this customer');
    }

    return this.enrichWithMetrics(customer);
  }

  async create(data: Record<string, unknown>, userId?: string) {
    const customer = await this.prisma.client.create({
      data: data as Prisma.ClientCreateInput,
    });

    await this.auditService.log({
      userId: (data.accountManagerId as string | undefined) || userId || 'system',
      action: 'CREATE_CUSTOMER',
      details: { customerId: customer.id, name: customer.name, segment: customer.segment, industry: customer.industry },
    });

    this.workflowsService.triggerRules('CLIENT_CREATED', 'CLIENT', customer.id, customer as unknown as Record<string, unknown>);

    return customer;
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    const { accountManager, ...rest } = data;
    const prismaData: Record<string, unknown> = { ...rest };

    if (accountManager !== undefined) {
      prismaData.accountManager = accountManager
        ? { connect: { id: accountManager } }
        : { disconnect: true };
    }

    const customer = await this.prisma.client.update({
      where: { id },
      data: prismaData as Prisma.ClientUpdateInput,
    });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'UPDATE_CUSTOMER',
      details: { customerId: id, updates: data as Prisma.InputJsonValue },
    });

    this.workflowsService.triggerRules('CLIENT_UPDATED', 'CLIENT', customer.id, customer as unknown as Record<string, unknown>);

    return customer;
  }

  async remove(id: string, userId?: string) {
    const customer = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true, segment: true, industry: true },
    });

    const deleted = await this.prisma.client.delete({ where: { id } });

    if (customer) {
      await this.auditService.log({
        userId: userId || 'system',
        action: 'DELETE_CUSTOMER',
        details: { customerId: id, name: customer.name, segment: customer.segment, industry: customer.industry },
      });
    }

    return deleted;
  }

  async bulkUpdate(ids: string[], data: Record<string, unknown>, userId?: string) {
    if (!ids?.length) return { count: 0 };

    if (data.accountManagerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: data.accountManagerId as string },
        select: { id: true },
      });
      if (!manager) throw new BadRequestException('Invalid account manager ID');
    }

    const { accountManager: _rel, ...rest } = data;
    const result = await this.prisma.client.updateMany({
      where: { id: { in: ids } },
      data: rest,
    });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_UPDATE_CUSTOMERS',
      details: { ids, updates: data as Prisma.InputJsonValue, count: result.count },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string) {
    if (!ids?.length) return { count: 0 };

    const result = await this.prisma.client.deleteMany({ where: { id: { in: ids } } });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_DELETE_CUSTOMERS',
      details: { ids, count: result.count },
    });

    return result;
  }

  async enrichWithMetrics(customer: {
    id: string;
    createdAt: Date;
    lifetimeRevenue: number;
    statusOverride?: boolean | null;
    status?: string | null;
    statusOverrideReason?: string | null;
    [key: string]: unknown;
  }) {
    const metrics = await this.metricsService.calculateMetrics(customer.id, customer.createdAt);
    const healthFlags = this.healthFlagsService.detectHealthFlags(metrics, customer.lifetimeRevenue);
    return {
      ...customer,
      metrics,
      healthFlags,
      suggestedActions: this.healthFlagsService.generateSuggestedActions(healthFlags, metrics),
    };
  }
}
