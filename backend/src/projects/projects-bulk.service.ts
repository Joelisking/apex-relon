import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ProjectsBulkService {
  private readonly logger = new Logger(ProjectsBulkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async bulkUpdate(
    ids: string[],
    data: Record<string, unknown>,
    userId?: string,
    userRole?: string,
  ) {
    if (!ids || ids.length === 0) return { count: 0 };

    let accessibleIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.project.findMany({
          where: {
            id: { in: ids },
            assignments: { some: { userId } },
          },
          select: { id: true },
        });
        accessibleIds = accessible.map((r) => r.id);
        if (accessibleIds.length === 0) {
          this.logger.warn(`bulkUpdate: user ${userId} has no access to any of the requested project IDs`);
          throw new NotFoundException('None of the requested projects were found or accessible');
        }
      }
    }

    let projectSnapshots: Array<{
      id: string;
      clientId: string;
      status: string;
    }> = [];

    if (data.status) {
      projectSnapshots = await this.prisma.project.findMany({
        where: { id: { in: accessibleIds } },
        select: { id: true, clientId: true, status: true },
      });
    }

    let result: Prisma.BatchPayload;
    try {
      result = await this.prisma.project.updateMany({
        where: { id: { in: accessibleIds } },
        data: data as Prisma.ProjectUpdateManyMutationInput,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'bulkUpdate.updateMany');
    }
    this.logger.log(`Bulk updated ${result.count} projects`);

    if (data.status && projectSnapshots.length > 0) {
      const newStatus = data.status as string;
      const effectiveUserId = userId || 'system';

      const historyRecords = projectSnapshots
        .filter((p) => p.status !== newStatus)
        .map((p) => ({
          projectId: p.id,
          fromStatus: p.status,
          toStatus: newStatus,
          changedBy: effectiveUserId,
        }));

      if (historyRecords.length > 0) {
        await this.prisma.projectStatusHistory.createMany({
          data: historyRecords,
        });
      }

      const affectedClientIds = [
        ...new Set(projectSnapshots.map((p) => p.clientId)),
      ];
      for (const clientId of affectedClientIds) {
        await this.projectsService.updateClientProjectCounts(clientId);
      }
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_UPDATE_PROJECTS',
      details: {
        ids: accessibleIds,
        updates: data as Prisma.InputJsonValue,
        count: result.count,
      },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string, userRole?: string) {
    if (!ids || ids.length === 0) return { count: 0 };

    let accessibleIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.project.findMany({
          where: {
            id: { in: ids },
            assignments: { some: { userId } },
          },
          select: { id: true },
        });
        accessibleIds = accessible.map((r) => r.id);
        if (accessibleIds.length === 0) {
          this.logger.warn(`bulkDelete: user ${userId} has no access to any of the requested project IDs`);
          throw new NotFoundException('None of the requested projects were found or accessible');
        }
      }
    }

    const projectsToDelete = await this.prisma.project.findMany({
      where: { id: { in: accessibleIds } },
      select: { clientId: true },
    });

    const affectedClientIds = [
      ...new Set(projectsToDelete.map((p) => p.clientId)),
    ];

    let result: Prisma.BatchPayload;
    try {
      result = await this.prisma.project.deleteMany({
        where: { id: { in: accessibleIds } },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'bulkDelete.deleteMany');
    }
    this.logger.log(`Bulk deleted ${result.count} projects`);

    for (const clientId of affectedClientIds) {
      await this.projectsService.updateClientProjectCounts(clientId);
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_DELETE_PROJECTS',
      details: {
        ids: accessibleIds,
        count: result.count,
      },
    });

    return result;
  }
}
