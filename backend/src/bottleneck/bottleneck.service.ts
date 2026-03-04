import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';

export interface StageDwellResult {
  stage: string;
  avgDays: number;
  medianDays: number;
  maxDays: number;
  count: number;
  isCritical: boolean;
}

export interface TaskVelocityResult {
  userId: string;
  userName: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export interface OverdueResult {
  userId: string;
  userName: string;
  overdueCount: number;
  avgDaysOverdue: number;
  oldestTaskDays: number;
}

@Injectable()
export class BottleneckService {
  private readonly logger = new Logger(BottleneckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  // ─── Stage Dwell Time ─────────────────────────────────────────────────────

  async getStageDwellTime(): Promise<StageDwellResult[]> {
    const history = await this.prisma.stageHistory.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Group by lead + compute dwell per stage transition
    const dwellByStage: Record<string, number[]> = {};

    // For each lead, compute dwell per stage
    const byLead: Record<string, typeof history> = {};
    for (const h of history) {
      if (!byLead[h.leadId]) byLead[h.leadId] = [];
      byLead[h.leadId].push(h);
    }

    for (const [, entries] of Object.entries(byLead)) {
      entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      for (let i = 0; i < entries.length - 1; i++) {
        const stage = entries[i].toStage;
        const dwell =
          (entries[i + 1].createdAt.getTime() - entries[i].createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (!dwellByStage[stage]) dwellByStage[stage] = [];
        dwellByStage[stage].push(dwell);
      }
      // Still-in-stage (last entry): compute from last change to now
      const last = entries[entries.length - 1];
      const currentDwell =
        (Date.now() - last.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (!dwellByStage[last.toStage]) dwellByStage[last.toStage] = [];
      dwellByStage[last.toStage].push(currentDwell);
    }

    const results: StageDwellResult[] = [];
    for (const [stage, dwells] of Object.entries(dwellByStage)) {
      const sorted = [...dwells].sort((a, b) => a - b);
      const avg = dwells.reduce((s, d) => s + d, 0) / dwells.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const max = Math.max(...dwells);
      results.push({
        stage,
        avgDays: Math.round(avg * 10) / 10,
        medianDays: Math.round(median * 10) / 10,
        maxDays: Math.round(max * 10) / 10,
        count: dwells.length,
        isCritical: avg > 14, // flag if avg > 2 weeks
      });
    }

    return results.sort((a, b) => b.avgDays - a.avgDays);
  }

  // ─── Task Velocity ────────────────────────────────────────────────────────

  async getTaskVelocity(days = 30): Promise<TaskVelocityResult[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: { createdAt: { gte: since } },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const byUser: Record<
      string,
      { user: { id: string; name: string }; assigned: number; completed: number; overdue: number }
    > = {};

    const now = new Date();
    for (const task of tasks) {
      if (!task.assignedToId || !task.assignedTo) continue;
      const uid = task.assignedToId;
      if (!byUser[uid]) {
        byUser[uid] = { user: task.assignedTo, assigned: 0, completed: 0, overdue: 0 };
      }
      byUser[uid].assigned++;
      if (task.status === 'COMPLETED') byUser[uid].completed++;
      if (
        task.status !== 'COMPLETED' &&
        task.dueDate &&
        new Date(task.dueDate) < now
      ) {
        byUser[uid].overdue++;
      }
    }

    return Object.values(byUser).map(({ user, assigned, completed, overdue }) => ({
      userId: user.id,
      userName: user.name,
      assigned,
      completed,
      overdue,
      completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    }));
  }

  // ─── Overdue Tasks ────────────────────────────────────────────────────────

  async getOverdueBreakdown(): Promise<OverdueResult[]> {
    const now = new Date();
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: { lt: now },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const byUser: Record<
      string,
      { user: { id: string; name: string }; days: number[]; count: number }
    > = {};

    for (const task of tasks) {
      if (!task.assignedToId || !task.assignedTo) continue;
      const uid = task.assignedToId;
      if (!byUser[uid]) byUser[uid] = { user: task.assignedTo, days: [], count: 0 };
      const daysOverdue =
        (now.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24);
      byUser[uid].days.push(daysOverdue);
      byUser[uid].count++;
    }

    return Object.values(byUser)
      .map(({ user, days, count }) => ({
        userId: user.id,
        userName: user.name,
        overdueCount: count,
        avgDaysOverdue: Math.round(days.reduce((s, d) => s + d, 0) / days.length),
        oldestTaskDays: Math.round(Math.max(...days)),
      }))
      .sort((a, b) => b.overdueCount - a.overdueCount);
  }

  // ─── Stuck Projects ───────────────────────────────────────────────────────

  async getStuckProjects(thresholdDays = 14) {
    const projects = await this.prisma.project.findMany({
      where: { status: { notIn: ['Completed', 'Cancelled'] } },
      include: { client: { select: { name: true } } },
    });

    return projects
      .filter((p) => {
        const daysSinceUpdate =
          (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > thresholdDays;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        clientName: p.client.name,
        status: p.status,
        daysSinceUpdate: Math.round(
          (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      }))
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  }

  // ─── AI Bottleneck Report ─────────────────────────────────────────────────

  async generateAiReport(): Promise<{ content: string; generatedAt: Date }> {
    const [stageDwell, taskVelocity, overdueBreakdown, stuckProjects] = await Promise.all([
      this.getStageDwellTime(),
      this.getTaskVelocity(),
      this.getOverdueBreakdown(),
      this.getStuckProjects(),
    ]);

    const context = {
      stageDwell,
      taskVelocity,
      overdueBreakdown,
      stuckProjects,
      generatedAt: new Date().toISOString(),
    };

    const prompt = `You are a business performance analyst for Apex Consulting & Surveying, Inc., a land surveying firm. Analyze the following operational data and produce a concise, actionable bottleneck report.

**Stage Dwell Times (avg days per pipeline stage):**
${stageDwell.map((s) => `- ${s.stage}: ${s.avgDays} days avg (${s.count} projects) ${s.isCritical ? '⚠️ CRITICAL' : ''}`).join('\n')}

**Task Velocity by Team Member (last 30 days):**
${taskVelocity.map((u) => `- ${u.userName}: ${u.completionRate}% completion, ${u.overdue} overdue`).join('\n')}

**Overdue Task Breakdown:**
${overdueBreakdown.slice(0, 5).map((u) => `- ${u.userName}: ${u.overdueCount} overdue (avg ${u.avgDaysOverdue} days late)`).join('\n')}

**Projects Stuck > 14 Days:**
${stuckProjects.slice(0, 5).map((p) => `- ${p.name} (${p.clientName}): ${p.daysSinceUpdate} days without update, status: ${p.status}`).join('\n')}

Please provide:
1. **Top 3 Bottlenecks** — identify the most critical operational bottlenecks with root cause analysis
2. **Recommended Actions** — specific, actionable recommendations for each bottleneck
3. **Revenue Impact** — estimated impact if bottlenecks are resolved
4. **Quick Wins** — 2-3 things that can be fixed this week

Format your response in clear markdown with headers.`;

    const response = await this.aiService.chat(prompt, context, 'anthropic');
    const content = typeof response === 'string' ? response : response?.message ?? JSON.stringify(response);

    // Store in DB
    await this.prisma.aIAnalyticsReport.create({
      data: {
        reportType: 'bottleneck',
        content,
        rawData: context as any,
      },
    });

    this.logger.log('Generated AI bottleneck report');
    return { content, generatedAt: new Date() };
  }

  async getLatestAiReport(): Promise<{ content: string; generatedAt: Date } | null> {
    const report = await this.prisma.aIAnalyticsReport.findFirst({
      where: { reportType: 'bottleneck' },
      orderBy: { generatedAt: 'desc' },
    });
    if (!report) return null;
    return { content: report.content, generatedAt: report.generatedAt };
  }
}
