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

export interface BlockerEntry {
  userId: string;
  userName: string;
  blockerScore: number;
  overdueCount: number;
  stuckProjectsBlocking: number;
  completionRate: number;
}

export interface WidgetSummaryResult {
  topBlockers: BlockerEntry[];
  criticalStages: Array<{ stage: string; avgDays: number; count: number }>;
  stuckProjectCount: number;
  overdueTaskCount: number;
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

  // ─── Widget Summary ───────────────────────────────────────────────────────

  async getWidgetSummary(): Promise<WidgetSummaryResult> {
    const [stageDwell, taskVelocity, overdueBreakdown, stuckProjects] = await Promise.all([
      this.getStageDwellTime(),
      this.getTaskVelocity(30),
      this.getOverdueBreakdown(),
      this.getStuckProjects(14),
    ]);

    const stuckProjectIds = stuckProjects.map((p) => p.id);

    // Identify which users have open tasks on stuck projects
    const blockingByUser: Record<string, { userName: string; projectIds: Set<string> }> = {};
    if (stuckProjectIds.length > 0) {
      const blockingTasks = await this.prisma.task.findMany({
        where: {
          entityType: 'project',
          entityId: { in: stuckProjectIds },
          status: { not: 'COMPLETED' },
          assignedToId: { not: null },
        },
        select: {
          assignedToId: true,
          entityId: true,
          assignedTo: { select: { id: true, name: true } },
        },
      });

      for (const t of blockingTasks) {
        if (!t.assignedToId || !t.assignedTo || !t.entityId) continue;
        if (!blockingByUser[t.assignedToId]) {
          blockingByUser[t.assignedToId] = { userName: t.assignedTo.name, projectIds: new Set() };
        }
        blockingByUser[t.assignedToId].projectIds.add(t.entityId);
      }
    }

    // Build composite user profiles from all data sources
    const userMap: Record<string, {
      userName: string;
      overdueCount: number;
      stuckProjectsBlocking: number;
      completionRate: number;
    }> = {};

    const ensure = (id: string, name: string) => {
      if (!userMap[id]) {
        userMap[id] = { userName: name, overdueCount: 0, stuckProjectsBlocking: 0, completionRate: 100 };
      }
      userMap[id].userName = name;
    };

    for (const o of overdueBreakdown) {
      ensure(o.userId, o.userName);
      userMap[o.userId].overdueCount = o.overdueCount;
    }
    for (const v of taskVelocity) {
      ensure(v.userId, v.userName);
      userMap[v.userId].completionRate = v.completionRate;
    }
    for (const [uid, { userName, projectIds }] of Object.entries(blockingByUser)) {
      ensure(uid, userName);
      userMap[uid].stuckProjectsBlocking = projectIds.size;
    }

    // Composite blocker score: overdue tasks (×3) + stuck projects blocking (×5) + low completion penalty
    const topBlockers: BlockerEntry[] = Object.entries(userMap)
      .map(([userId, data]) => {
        const blockerScore =
          data.overdueCount * 3 +
          data.stuckProjectsBlocking * 5 +
          Math.max(0, 60 - data.completionRate) * 0.5;
        return {
          userId,
          userName: data.userName,
          blockerScore: Math.round(blockerScore * 10) / 10,
          overdueCount: data.overdueCount,
          stuckProjectsBlocking: data.stuckProjectsBlocking,
          completionRate: data.completionRate,
        };
      })
      .filter((u) => u.blockerScore > 0)
      .sort((a, b) => b.blockerScore - a.blockerScore)
      .slice(0, 5);

    const criticalStages = stageDwell
      .filter((s) => s.isCritical)
      .map(({ stage, avgDays, count }) => ({ stage, avgDays, count }));

    const overdueTaskCount = overdueBreakdown.reduce((sum, u) => sum + u.overdueCount, 0);

    return {
      topBlockers,
      criticalStages,
      stuckProjectCount: stuckProjects.length,
      overdueTaskCount,
    };
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

    // Compute blockers for the AI prompt
    const widgetSummary = await this.getWidgetSummary();

    const prompt = `You are a business performance analyst for Apex Consulting & Surveying, Inc., a land surveying firm. The CEO needs a frank, actionable bottleneck report. Be specific — name individuals where they are responsible for delays.

**Stage Dwell Times (avg days per pipeline stage):**
${stageDwell.map((s) => `- ${s.stage}: ${s.avgDays} days avg (${s.count} leads) ${s.isCritical ? '⚠️ CRITICAL' : ''}`).join('\n')}

**Team Member Blocker Scores (composite: overdue tasks + stuck project ownership + completion rate):**
${widgetSummary.topBlockers.map((u) => `- ${u.userName}: score ${u.blockerScore} | ${u.overdueCount} overdue tasks | blocking ${u.stuckProjectsBlocking} stuck project(s) | ${u.completionRate}% task completion`).join('\n') || '- No significant blockers identified'}

**Task Velocity by Team Member (last 30 days):**
${taskVelocity.map((u) => `- ${u.userName}: ${u.completionRate}% completion (${u.completed}/${u.assigned} tasks), ${u.overdue} overdue`).join('\n')}

**Projects Stuck > 14 Days Without Update:**
${stuckProjects.slice(0, 8).map((p) => `- ${p.name} (${p.clientName}): ${p.daysSinceUpdate} days stalled, status: ${p.status}`).join('\n') || '- None'}

Please provide:
1. **Who Is Holding Things Up** — call out specific team members by name, what they are blocking, and why this matters to the business
2. **Critical Pipeline Stages** — which stages are causing the most delay and what to do about them
3. **Immediate Actions** — 3 specific actions the CEO should take this week, with names and deadlines
4. **Revenue Risk** — estimate the revenue at risk from current bottlenecks

Be direct and specific. The CEO wants names, numbers, and clear actions — not generalities.

Format your response in clear markdown with headers.`;

    const content = await this.aiService.generateFreeform(prompt, undefined, 2048);

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
