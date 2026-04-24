import { Injectable, BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getClientDisplayName } from '../client-display.helper';
import { AuditService } from '../../audit/audit.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { PermissionsService } from '../../permissions/permissions.service';
import { CustomerMetricsService } from './customer-metrics.service';
import { CustomerHealthFlagsService } from './customer-health-flags.service';
import { handlePrismaError } from '../../common/prisma-error.handler';

@Injectable()
export class CustomerCrudService {
  private readonly logger = new Logger(CustomerCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowsService: WorkflowsService,
    private readonly permissionsService: PermissionsService,
    private readonly metricsService: CustomerMetricsService,
    private readonly healthFlagsService: CustomerHealthFlagsService,
  ) {}

  private readonly primaryContactInclude = {
    contacts: {
      where: { isPrimary: true },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      take: 1,
    },
  } as const;

  private buildAccessFilter(userId: string) {
    return {
      OR: [
        { projects: { some: { assignments: { some: { userId } } } } },
        { leads: { some: { OR: [
          { assignedToId: userId },
          { teamMembers: { some: { userId } } },
        ] } } },
      ],
    };
  }

  async findAll(userId?: string, userRole?: string) {
    const where: Record<string, unknown> = { isDeleted: false };

    const canViewAll = userRole
      ? await this.permissionsService.hasPermission(userRole, 'clients:view_all')
      : false;

    if (!canViewAll && userId) {
      Object.assign(where, this.buildAccessFilter(userId));
    }

    const customers = await this.prisma.client.findMany({
      where,
      include: {
        ...this.primaryContactInclude,
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
        ...this.primaryContactInclude,
        _count: { select: { activities: true } },
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

    if (!customer || customer.isDeleted) {
      this.logger.warn(`Client not found: ${id}`);
      throw new NotFoundException('Client not found');
    }

    if (userRole && userId) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'clients:view_all');
      if (!canViewAll) {
        const hasAccess = await this.prisma.client.findFirst({
          where: { id, isDeleted: false, ...this.buildAccessFilter(userId) },
          select: { id: true },
        });
        if (!hasAccess) throw new ForbiddenException('Access denied');
      }
    }

    return this.enrichWithMetrics(customer);
  }

  async create(data: Record<string, unknown>, userId?: string) {
    let customer: Awaited<ReturnType<typeof this.prisma.client.create>>;
    try {
      customer = await this.prisma.client.create({
        data: data as Prisma.ClientCreateInput,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerCrudService.create');
    }
    this.logger.log(`Client created: ${customer.id}`);

    const individualName = data.individualName as string | undefined;
    if (individualName?.trim()) {
      const nameParts = individualName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      try {
        await this.prisma.contact.create({
          data: {
            clientId: customer.id,
            firstName,
            lastName,
            email: (data.email as string | undefined) || undefined,
            phone: (data.phone as string | undefined) || undefined,
            jobTitle: (data.individualType as string | undefined) || undefined,
            isPrimary: true,
            isDecisionMaker: true,
          },
        });
      } catch (error) {
        handlePrismaError(error, this.logger, 'CustomerCrudService.create.primaryContact');
      }
      this.logger.log(`Primary contact created for client: ${customer.id}`);
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'CREATE_CUSTOMER',
      details: { customerId: customer.id, name: getClientDisplayName(customer), segment: customer.segment, industry: customer.industry },
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

    let customer: Awaited<ReturnType<typeof this.prisma.client.update>>;
    try {
      customer = await this.prisma.client.update({
        where: { id },
        data: prismaData as Prisma.ClientUpdateInput,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerCrudService.update');
    }
    this.logger.log(`Client updated: ${id}`);

    const contactUpdates: Record<string, unknown> = {};
    if ('email' in data) contactUpdates.email = data.email;
    if ('phone' in data) contactUpdates.phone = data.phone;
    if ('individualType' in data) contactUpdates.jobTitle = data.individualType;

    if ('individualName' in data && typeof data.individualName === 'string') {
      const nameParts = data.individualName.trim().split(/\s+/);
      contactUpdates.firstName = nameParts[0];
      contactUpdates.lastName = nameParts.slice(1).join(' ') || '';
    }

    if (Object.keys(contactUpdates).length > 0) {
      const primaryContact = await this.prisma.contact.findFirst({
        where: { clientId: id, isPrimary: true },
        select: { id: true },
      });
      if (primaryContact) {
        try {
          await this.prisma.contact.update({
            where: { id: primaryContact.id },
            data: contactUpdates as Prisma.ContactUpdateInput,
          });
        } catch (error) {
          handlePrismaError(error, this.logger, 'CustomerCrudService.update.primaryContact');
        }
        this.logger.log(`Primary contact synced for client: ${id}`);
      }
    }

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

    if (!customer) {
      this.logger.warn(`Client not found for removal: ${id}`);
      throw new NotFoundException('Client not found');
    }

    let archived: Awaited<ReturnType<typeof this.prisma.client.update>>;
    try {
      archived = await this.prisma.client.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerCrudService.remove');
    }
    this.logger.log(`Client archived: ${id}`);

    await this.auditService.log({
      userId: userId || 'system',
      action: 'ARCHIVE_CUSTOMER',
      details: { customerId: id, name: getClientDisplayName(customer), segment: customer.segment, industry: customer.industry },
    });

    return archived;
  }

  private async scopeToAccessible(ids: string[], userId: string, userRole: string): Promise<string[]> {
    const canViewAll = await this.permissionsService.hasPermission(userRole, 'clients:view_all');
    if (canViewAll) return ids;
    const accessible = await this.prisma.client.findMany({
      where: {
        id: { in: ids },
        isDeleted: false,
        ...this.buildAccessFilter(userId),
      },
      select: { id: true },
    });
    return accessible.map((r) => r.id);
  }

  async bulkUpdate(ids: string[], data: Record<string, unknown>, userId?: string, userRole?: string) {
    if (!ids?.length) return { count: 0 };

    const accessibleIds = userId && userRole
      ? await this.scopeToAccessible(ids, userId, userRole)
      : ids;

    const { accountManager: _rel, accountManagerId: _mgr, ...rest } = data;
    let result: Awaited<ReturnType<typeof this.prisma.client.updateMany>>;
    try {
      result = await this.prisma.client.updateMany({
        where: { id: { in: accessibleIds } },
        data: rest,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerCrudService.bulkUpdate');
    }
    this.logger.log(`Bulk updated ${result.count} clients`);

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_UPDATE_CUSTOMERS',
      details: { ids: accessibleIds, updates: data as Prisma.InputJsonValue, count: result.count },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string, userRole?: string) {
    if (!ids?.length) return { count: 0 };

    const accessibleIds = userId && userRole
      ? await this.scopeToAccessible(ids, userId, userRole)
      : ids;

    let result: Awaited<ReturnType<typeof this.prisma.client.updateMany>>;
    try {
      result = await this.prisma.client.updateMany({
        where: { id: { in: accessibleIds } },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerCrudService.bulkDelete');
    }
    this.logger.log(`Bulk archived ${result.count} clients`);

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_ARCHIVE_CUSTOMERS',
      details: { ids: accessibleIds, count: result.count },
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
