import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { LeadMetricsService } from './lead-metrics.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { WorkflowsService } from '../workflows/workflows.service';
import { CreateLeadRepDto } from './dto/create-lead-rep.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private leadMetricsService: LeadMetricsService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private workflowsService: WorkflowsService,
  ) {}

  async findAll(userId?: string, userRole?: string, year?: string) {
    // Build query filters based on role
    const where: Record<string, unknown> = {};

    if (userRole === 'SALES') {
      // Sales executives see only their assigned leads
      where.assignedToId = userId;
    } else if (userRole === 'BDM') {
      // BDMs see their team's leads — fetch only IDs (lean query)
      const teamMembers = await this.prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map((m) => m.id);
      where.assignedToId = { in: [...teamMemberIds, userId] };
    } else if (userRole === 'DESIGNER') {
      where.designerId = userId;
    } else if (userRole === 'QS') {
      where.qsId = userId;
    }
    // CEO and ADMIN see all leads (no filter)

    // Optional year filter on likelyStartDate
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
        designer: {
          select: { id: true, name: true, email: true, role: true },
        },
        qs: {
          select: { id: true, name: true, email: true, role: true },
        },
        serviceType: {
          select: { id: true, name: true },
        },
        client: {
          select: { id: true, name: true },
        },
        reps: true,
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
        designer: {
          select: { id: true, name: true, email: true, role: true },
        },
        qs: {
          select: { id: true, name: true, email: true, role: true },
        },
        serviceType: {
          select: { id: true, name: true },
        },
        client: {
          select: { id: true, name: true },
        },
        reps: true,
        stageHistory: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!lead) {
      return null;
    }

    // Check access permissions
    if (userRole === 'SALES' && lead.assignedToId !== userId) {
      throw new Error('You do not have permission to view this lead');
    }

    if (userRole === 'DESIGNER' && lead.designerId !== userId) {
      throw new Error('You do not have permission to view this lead');
    }

    if (userRole === 'QS' && lead.qsId !== userId) {
      throw new Error('You do not have permission to view this lead');
    }

    if (userRole === 'BDM') {
      const teamMembers = await this.prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map((m) => m.id);
      const canAccess =
        lead.assignedToId === userId ||
        teamMemberIds.includes(lead.assignedToId || '');

      if (!canAccess) {
        throw new Error(
          'You do not have permission to view this lead',
        );
      }
    }

    // Enrich with metrics and risk flags
    return this.enrichLeadWithMetrics(lead);
  }

  private async validateStage(stage: string): Promise<void> {
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

    const lead = await this.prisma.lead.create({
      data: data as Prisma.LeadCreateInput,
    });

    // Record initial stage in stage history
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

    // Audit log
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

    // Capture previous stage for workflow trigger (hoist outside the inner block)
    let previousStage: string | null = null;

    // Check if stage is being changed
    if (data.stage && userId) {
      const currentLead = await this.prisma.lead.findUnique({
        where: { id },
        select: { stage: true, assignedToId: true },
      });
      previousStage = currentLead?.stage ?? null;

      if (currentLead && currentLead.stage !== data.stage) {
        // Record stage change in history
        await this.prisma.stageHistory.create({
          data: {
            leadId: id,
            fromStage: currentLead.stage,
            toStage: data.stage as string,
            changedBy: userId,
          },
        });

        // Auto-set dates based on stage transitions (use client-provided date if present)
        if (data.stage === 'Won' || data.stage === 'Lost') {
          data.dealClosedAt = data.dealClosedAt
            ? new Date(data.dealClosedAt as string)
            : new Date();
        }

        // Auto-accept open quotes when lead moves to Won
        if (data.stage === 'Won') {
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

        // Notify assignee of stage change
        if (currentLead.assignedToId && currentLead.assignedToId !== userId) {
          try {
            const pref = await this.notificationsService.getPreferences(
              currentLead.assignedToId,
            );
            if (pref.leadStageChanged) {
              await this.notificationsService.create({
                userId: currentLead.assignedToId,
                type: NotificationType.LEAD_STAGE_CHANGED,
                title: 'Lead stage changed',
                message: `Lead moved to ${data.stage as string}`,
                entityType: 'LEAD',
                entityId: id,
              });
            }
          } catch {
            // Non-critical, don't fail the update
          }
        }
      }
    }

    // Normalize date string to Date for Prisma
    if (data.dealClosedAt && typeof data.dealClosedAt === 'string') {
      data.dealClosedAt = new Date(data.dealClosedAt);
    }

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data,
    });

    // Audit log
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
    // Get lead details before deletion for audit log
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

    // Audit log
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

  async analyzeRisk(id: string, provider?: string) {
    const lead = await this.findOne(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const analysis = await this.aiService.analyzeLeadRisk(
      lead,
      provider,
    );

    // Update lead with AI insights
    await this.update(id, {
      aiRiskLevel: analysis.riskLevel,
      aiSummary: analysis.summary,
      aiRecommendations: JSON.stringify(analysis.recommendations),
    });

    return analysis;
  }

  /**
   * Enrich lead with calculated metrics and risk flags
   */
  private async enrichLeadWithMetrics(lead: { id: string; createdAt: Date; expectedValue: number; stage: string; [key: string]: unknown }) {
    // Calculate metrics
    const metrics = await this.leadMetricsService.calculateMetrics(
      lead.id,
      lead.createdAt,
    );

    // Detect risk flags
    const riskFlags = this.leadMetricsService.detectRiskFlags(
      metrics,
      lead.expectedValue,
      lead.stage,
    );

    // Generate suggested actions
    const suggestedActions =
      this.leadMetricsService.generateSuggestedActions(
        riskFlags,
        metrics,
        lead.stage,
      );

    return {
      ...lead,
      metrics,
      riskFlags,
      suggestedActions,
    };
  }

  /**
   * Generate AI summary of lead based on activities and data
   */
  async generateAISummary(id: string, provider?: string) {
    // Get lead with all related data
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { name: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        files: {
          select: {
            category: true,
            originalName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Get metrics
    const metrics = await this.leadMetricsService.calculateMetrics(
      lead.id,
      lead.createdAt,
    );

    // Build context for AI
    const context = {
      leadName: lead.contactName,
      company: lead.company,
      status: lead.stage,
      estimatedValue: lead.expectedValue,
      source: lead.source,
      assignedTo: lead.assignedTo?.name,
      daysInPipeline: metrics.daysInPipeline,
      daysSinceLastContact: metrics.daysSinceLastContact,
      activityCount: metrics.activityCount,
      recentActivities: lead.activities.map((a) => ({
        type: a.type,
        activityDate: a.activityDate,
        activityTime: a.activityTime,
        reason: a.reason,
        notes: a.notes,
        meetingType: a.meetingType,
        date: a.createdAt,
      })),
      fileCategories: lead.files.map((f) => f.category),
    };

    // Generate AI summary
    const prompt = `Analyze this sales lead and provide:
1. A concise summary of the current situation (2-3 sentences)
2. Key insights about the lead's progress
3. Top 3 recommended next actions

Lead Information:
${JSON.stringify(context, null, 2)}

Format your response as JSON with fields: summary, insights (array), nextActions (array).`;

    try {
      const response = await this.aiService.chat(
        prompt,
        {},
        provider,
      );

      const aiResponse = JSON.parse(response.message);

      // Update lead with AI summary
      await this.update(id, {
        aiSummary: aiResponse.summary,
        aiRecommendations: JSON.stringify(aiResponse.nextActions),
      });

      return {
        summary: aiResponse.summary,
        insights: aiResponse.insights || [],
        nextActions: aiResponse.nextActions || [],
        metrics,
      };
    } catch (error) {
      // Fallback to basic summary if AI fails
      return {
        summary: `${lead.contactName} from ${lead.company} - ${lead.stage} status. In pipeline for ${metrics.daysInPipeline} days.`,
        insights: [
          `Last contact: ${metrics.daysSinceLastContact} days ago`,
          `Total activities: ${metrics.activityCount}`,
          `Files uploaded: ${metrics.fileCount}`,
        ],
        nextActions: this.leadMetricsService.generateSuggestedActions(
          this.leadMetricsService.detectRiskFlags(
            metrics,
            lead.expectedValue,
            lead.stage,
          ),
          metrics,
          lead.stage,
        ),
        metrics,
      };
    }
  }

  // ============================================================
  // Rep management
  // ============================================================

  async createRep(leadId: string, data: CreateLeadRepDto) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    return this.prisma.leadRep.create({
      data: {
        leadId,
        ...data,
      },
    });
  }

  async updateRep(repId: string, data: Partial<CreateLeadRepDto>) {
    const rep = await this.prisma.leadRep.findUnique({
      where: { id: repId },
    });
    if (!rep) {
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    return this.prisma.leadRep.update({
      where: { id: repId },
      data,
    });
  }

  async deleteRep(repId: string) {
    const rep = await this.prisma.leadRep.findUnique({
      where: { id: repId },
    });
    if (!rep) {
      throw new NotFoundException(`Rep with ID ${repId} not found`);
    }

    return this.prisma.leadRep.delete({ where: { id: repId } });
  }

  async bulkUpdate(ids: string[], data: Record<string, unknown>, userId?: string) {
    if (!ids || ids.length === 0) return { count: 0 };

    // Validate stage if provided
    if (data.stage) {
      await this.validateStage(data.stage as string);
    }

    const result = await this.prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: data as Prisma.LeadUpdateManyMutationInput,
    });

    // Audit log
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

  async bulkDelete(ids: string[], userId?: string) {
    if (!ids || ids.length === 0) return { count: 0, skipped: 0 };

    // Find leads that cannot be deleted because they have an associated Project.
    // Project.leadId has no explicit onDelete, so the DB will reject deletions
    // with a FK constraint error (P2003) for those rows.
    const blockedLeads = await this.prisma.project.findMany({
      where: { leadId: { in: ids } },
      select: { leadId: true },
    });

    const blockedIds = new Set(
      blockedLeads
        .map((p) => p.leadId)
        .filter((id): id is string => id !== null),
    );

    const deletableIds = ids.filter((id) => !blockedIds.has(id));
    const skipped = blockedIds.size;

    if (deletableIds.length === 0) {
      return { count: 0, skipped };
    }

    const result = await this.prisma.lead.deleteMany({
      where: { id: { in: deletableIds } },
    });

    // Audit log
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

  async draftEmail(id: string, emailType: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { serviceType: true, assignedTo: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.aiService.draftEmail(lead, emailType);
  }
}
