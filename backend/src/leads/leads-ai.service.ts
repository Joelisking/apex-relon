import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { LeadMetricsService } from './lead-metrics.service';
import { LeadsQueryService } from './leads-query.service';
import { LeadsMutationService } from './leads-mutation.service';
import { buildLeadSummaryPrompt } from '../ai/prompts';

@Injectable()
export class LeadsAiService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private leadMetricsService: LeadMetricsService,
    private leadsQueryService: LeadsQueryService,
    private leadsMutationService: LeadsMutationService,
  ) {}

  async analyzeRisk(id: string, provider?: string) {
    const leadBase = await this.leadsQueryService.findOne(id);

    const activities = await this.prisma.activity.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        type: true,
        reason: true,
        notes: true,
        activityDate: true,
        createdAt: true,
      },
    });

    const lead = { ...leadBase, activities };

    const analysis = await this.aiService.analyzeLeadRisk(
      lead as unknown as Record<string, unknown>,
      provider,
    );

    await this.leadsMutationService.update(id, {
      aiRiskLevel: analysis.riskLevel,
      aiSummary: analysis.summary,
      aiRecommendations: JSON.stringify(analysis.recommendations),
    });

    return analysis;
  }

  async generateAISummary(id: string, provider?: string) {
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
      throw new NotFoundException('Lead not found');
    }

    const metrics = await this.leadMetricsService.calculateMetrics(
      lead.id,
      lead.createdAt,
    );

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

    const prompt = buildLeadSummaryPrompt(context);

    try {
      const raw = await this.aiService.generateFreeform(prompt, provider);

      let aiResponse: { summary?: string; insights?: string[]; nextActions?: string[] };
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        aiResponse = {};
      }

      await this.leadsMutationService.update(id, {
        aiSummary: aiResponse.summary,
        aiRecommendations: JSON.stringify(aiResponse.nextActions),
      });

      return {
        summary: aiResponse.summary,
        insights: aiResponse.insights || [],
        nextActions: aiResponse.nextActions || [],
        metrics,
      };
    } catch {
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

  async draftEmail(id: string, emailType: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { jobType: true, assignedTo: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.aiService.draftEmail(lead, emailType);
  }
}
