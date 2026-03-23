import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LeadMetricsService } from './lead-metrics.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class LeadsQueryService {
  constructor(
    private prisma: PrismaService,
    private leadMetricsService: LeadMetricsService,
    private permissionsService: PermissionsService,
  ) {}

  async findAll(userId?: string, userRole?: string, year?: string) {
    const where: Record<string, unknown> = {};

    const canViewAll = userRole
      ? await this.permissionsService.hasPermission(userRole, 'leads:view_all')
      : false;

    if (!canViewAll && userId) {
      where.OR = [
        { assignedToId: userId },
        { teamMembers: { some: { userId } } },
      ];
    }

    if (year) {
      const y = parseInt(year, 10);
      where.likelyStartDate = {
        gte: new Date(`${y}-01-01`),
        lt: new Date(`${y + 1}-01-01`),
      };
    }

    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        serviceType: {
          select: { id: true, name: true, category: { select: { id: true, name: true } } },
        },
        client: {
          select: { id: true, name: true },
        },
        reps: true,
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Batch-load all metrics in 3 queries instead of 4×N queries (N+1 fix)
    const batchMetrics =
      await this.leadMetricsService.calculateBatchMetrics(
        leads.map((l) => ({ id: l.id, createdAt: l.createdAt })),
      );

    return leads.map((lead) => {
      const metrics = batchMetrics.get(lead.id) ?? {
        daysInPipeline: 0,
        daysSinceLastContact: 0,
        activityCount: 0,
        fileCount: 0,
      };
      const riskFlags = this.leadMetricsService.detectRiskFlags(
        metrics,
        lead.expectedValue,
        lead.stage,
      );
      return {
        ...lead,
        metrics,
        riskFlags,
        suggestedActions:
          this.leadMetricsService.generateSuggestedActions(
            riskFlags,
            metrics,
            lead.stage,
          ),
      };
    });
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        serviceType: {
          select: { id: true, name: true, category: { select: { id: true, name: true } } },
        },
        client: {
          select: { id: true, name: true },
        },
        reps: true,
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        stageHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (userRole && userId) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'leads:view_all');
      if (!canViewAll) {
        const isAssigned = lead.assignedToId === userId;
        const isTeamMember = lead.teamMembers?.some((m) => m.userId === userId);
        if (!isAssigned && !isTeamMember) {
          throw new ForbiddenException('You do not have permission to view this lead');
        }
      }
    }

    return this.enrichLeadWithMetrics(lead);
  }

  async enrichLeadWithMetrics(lead: { id: string; createdAt: Date; expectedValue: number; stage: string; [key: string]: unknown }) {
    const metrics = await this.leadMetricsService.calculateMetrics(
      lead.id,
      lead.createdAt,
    );
    const riskFlags = this.leadMetricsService.detectRiskFlags(
      metrics,
      lead.expectedValue,
      lead.stage,
    );
    const suggestedActions =
      this.leadMetricsService.generateSuggestedActions(
        riskFlags,
        metrics,
        lead.stage,
      );

    return { ...lead, metrics, riskFlags, suggestedActions };
  }
}
