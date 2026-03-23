import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { WorkflowsService } from '../workflows/workflows.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsMutationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private workflowsService: WorkflowsService,
    private permissionsService: PermissionsService,
  ) {}

  async validateStage(stage: string): Promise<void> {
    const exists = await this.prisma.pipelineStage.findFirst({
      where: { name: stage, pipelineType: 'prospective_project' },
    });
    if (!exists) {
      throw new BadRequestException(
        `Stage "${stage}" does not exist in the prospective project pipeline.`,
      );
    }
  }

  async create(data: Record<string, unknown>, userId?: string) {
    if (data.stage) {
      await this.validateStage(data.stage as string);
    }

    const { teamMemberIds, ...leadData } = data as Record<string, unknown> & { teamMemberIds?: string[] };

    const lead = await this.prisma.lead.create({
      data: leadData as Prisma.LeadCreateInput,
    });

    if (teamMemberIds && teamMemberIds.length > 0) {
      await this.prisma.leadTeamMember.createMany({
        data: teamMemberIds.map((uid) => ({ leadId: lead.id, userId: uid })),
        skipDuplicates: true,
      });
    }

    if (userId) {
      await this.prisma.stageHistory.create({
        data: {
          leadId: lead.id,
          fromStage: null,
          toStage: lead.stage || 'New',
          changedBy: userId,
        },
      });
    }

    await this.auditService.log({
      userId: (data.assignedToId as string | undefined) || userId || 'system',
      action: 'CREATE_LEAD',
      details: {
        leadId: lead.id,
        company: lead.company,
        contactName: lead.contactName,
        expectedValue: lead.expectedValue,
        stage: lead.stage,
      },
    });

    this.workflowsService.triggerRules('LEAD_CREATED', 'LEAD', lead.id, lead as unknown as Record<string, unknown>);

    return lead;
  }

  async update(id: string, data: Record<string, unknown>, userId?: string) {
    if (data.stage) {
      await this.validateStage(data.stage as string);
    }

    let previousStage: string | null = null;

    if (data.stage && userId) {
      const currentLead = await this.prisma.lead.findUnique({
        where: { id },
        select: { stage: true, assignedToId: true, company: true, contactName: true },
      });
      previousStage = currentLead?.stage ?? null;

      if (currentLead && currentLead.stage !== data.stage) {
        await this.prisma.stageHistory.create({
          data: {
            leadId: id,
            fromStage: currentLead.stage,
            toStage: data.stage as string,
            changedBy: userId,
          },
        });

        if (data.stage === 'Closed Won' || data.stage === 'Won' || data.stage === 'Closed Lost' || data.stage === 'Lost') {
          data.dealClosedAt = data.dealClosedAt
            ? new Date(data.dealClosedAt as string)
            : new Date();
        }

        if (data.stage === 'Closed Won' || data.stage === 'Won') {
          const qs = await this.prisma.quoteSettings.findFirst();
          if (qs?.enableLeadIntegration !== false) {
            await this.prisma.quote.updateMany({
              where: { leadId: id, status: { in: ['DRAFT', 'SENT'] } },
              data: { status: 'ACCEPTED' },
            });
          }
        }

        if (data.stage === 'Quoted') {
          data.quoteSentAt = new Date();
        }

        if (currentLead.assignedToId && currentLead.assignedToId !== userId) {
          try {
            const pref = await this.notificationsService.getPreferences(
              currentLead.assignedToId,
            );
            if (pref.leadStageChanged) {
              const actor = userId
                ? await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
                : null;
              const actorName = actor?.name ?? 'Someone';
              const leadName = currentLead.company || currentLead.contactName;
              await this.notificationsService.create({
                userId: currentLead.assignedToId,
                type: NotificationType.LEAD_STAGE_CHANGED,
                title: 'Lead stage changed',
                message: `${actorName} moved "${leadName}" to ${data.stage as string}`,
                entityType: 'LEAD',
                entityId: id,
                metadata: { actorId: userId ?? undefined, actorName },
              });
            }
          } catch {
            // Non-critical, don't fail the update
          }
        }
      }
    }

    if (data.dealClosedAt && typeof data.dealClosedAt === 'string') {
      data.dealClosedAt = new Date(data.dealClosedAt);
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'UPDATE_LEAD',
      details: {
        leadId: id,
        updates: data as Prisma.InputJsonValue,
      },
    });

    if (data.stage && data.stage !== previousStage) {
      this.workflowsService.triggerRules('LEAD_STAGE_CHANGED', 'LEAD', updatedLead.id, updatedLead as unknown as Record<string, unknown>);
    } else {
      this.workflowsService.triggerRules('LEAD_UPDATED', 'LEAD', updatedLead.id, updatedLead as unknown as Record<string, unknown>);
    }

    return updatedLead;
  }

  async remove(id: string, userId?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        company: true,
        contactName: true,
        expectedValue: true,
      },
    });

    const deletedLead = await this.prisma.lead.delete({
      where: { id },
    });

    if (lead) {
      await this.auditService.log({
        userId: userId || 'system',
        action: 'DELETE_LEAD',
        details: {
          leadId: id,
          company: lead.company,
          contactName: lead.contactName,
          expectedValue: lead.expectedValue,
        },
      });
    }

    return deletedLead;
  }

  async bulkUpdate(ids: string[], data: Record<string, unknown>, userId?: string, userRole?: string) {
    if (!ids || ids.length === 0) return { count: 0 };

    if (data.stage) {
      await this.validateStage(data.stage as string);
    }

    let accessibleIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'leads:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.lead.findMany({
          where: {
            id: { in: ids },
            OR: [{ assignedToId: userId }, { teamMembers: { some: { userId } } }],
          },
          select: { id: true },
        });
        accessibleIds = accessible.map((r) => r.id);
      }
    }

    const result = await this.prisma.lead.updateMany({
      where: { id: { in: accessibleIds } },
      data: data as Prisma.LeadUpdateManyMutationInput,
    });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_UPDATE_LEADS',
      details: {
        ids,
        updates: data as Prisma.InputJsonValue,
        count: result.count,
      },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string, userRole?: string) {
    if (!ids || ids.length === 0) return { count: 0, skipped: 0 };

    let scopedIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'leads:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.lead.findMany({
          where: {
            id: { in: ids },
            OR: [{ assignedToId: userId }, { teamMembers: { some: { userId } } }],
          },
          select: { id: true },
        });
        scopedIds = accessible.map((r) => r.id);
      }
    }

    const blockedLeads = await this.prisma.project.findMany({
      where: { leadId: { in: scopedIds } },
      select: { leadId: true },
    });

    const blockedIds = new Set(
      blockedLeads
        .map((p) => p.leadId)
        .filter((id): id is string => id !== null),
    );

    const deletableIds = scopedIds.filter((id) => !blockedIds.has(id));
    const skipped = (ids.length - scopedIds.length) + blockedIds.size;

    if (deletableIds.length === 0) {
      return { count: 0, skipped };
    }

    const result = await this.prisma.lead.deleteMany({
      where: { id: { in: deletableIds } },
    });

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_DELETE_LEADS',
      details: {
        ids: deletableIds,
        skippedIds: [...blockedIds],
        count: result.count,
        skipped,
      },
    });

    return { count: result.count, skipped };
  }
}
