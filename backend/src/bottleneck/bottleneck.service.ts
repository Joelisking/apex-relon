import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { getClientDisplayName } from '../clients/client-display.helper';

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

  private async getThresholds(): Promise<{ stuckDays: number; criticalStageDays: number }> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { id: 'singleton' },
      select: { bottleneckStuckDays: true, bottleneckCriticalStageDays: true },
    });
    return {
      stuckDays: settings?.bottleneckStuckDays ?? 14,
      criticalStageDays: settings?.bottleneckCriticalStageDays ?? 14,
    };
  }

  // ─── Stage Dwell Time ─────────────────────────────────────────────────────

  async getStageDwellTime(criticalStageDays?: number): Promise<StageDwellResult[]> {
    const threshold = criticalStageDays ?? (await this.getThresholds()).criticalStageDays;
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
        isCritical: avg > threshold,
      });
    }

    return results.sort((a, b) => b.avgDays - a.avgDays);
  }

  // ─── Task Velocity ────────────────────────────────────────────────────────

  async getTaskVelocity(days = 30): Promise<TaskVelocityResult[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Use start of today (midnight UTC) so tasks due *today* are never counted as overdue
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Active tasks currently assigned (open workload)
    const activeTasks = await this.prisma.task.findMany({
      where: {
        assignedToId: { not: null },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    // Tasks completed in the last N days
    const completedTasks = await this.prisma.task.findMany({
      where: {
        assignedToId: { not: null },
        status: 'DONE',
        completedAt: { gte: since },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const byUser: Record<
      string,
      { user: { id: string; name: string }; assigned: number; completed: number; overdue: number }
    > = {};

    const ensure = (task: { assignedToId: string | null; assignedTo: { id: string; name: string } | null }) => {
      if (!task.assignedToId || !task.assignedTo) return null;
      const uid = task.assignedToId;
      if (!byUser[uid]) byUser[uid] = { user: task.assignedTo, assigned: 0, completed: 0, overdue: 0 };
      return uid;
    };

    for (const task of activeTasks) {
      const uid = ensure(task);
      if (!uid) continue;
      byUser[uid].assigned++;
      if (task.dueDate && new Date(task.dueDate) < startOfToday) byUser[uid].overdue++;
    }

    for (const task of completedTasks) {
      const uid = ensure(task);
      if (!uid) continue;
      byUser[uid].completed++;
    }

    return Object.values(byUser)
      .filter(({ assigned, completed }) => assigned > 0 || completed > 0)
      .map(({ user, assigned, completed, overdue }) => ({
        userId: user.id,
        userName: user.name,
        assigned,
        completed,
        overdue,
        completionRate:
          assigned + completed > 0
            ? Math.round((completed / (assigned + completed)) * 100)
            : 0,
      }))
      .sort((a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate);
  }

  // ─── Overdue Tasks ────────────────────────────────────────────────────────

  async getOverdueBreakdown(): Promise<OverdueResult[]> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const tasks = await this.prisma.task.findMany({
      where: {
        status: { notIn: ['DONE', 'CANCELLED'] },
        dueDate: { lt: startOfToday },
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
        (startOfToday.getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24);
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

  async getStuckProjects(thresholdDays?: number) {
    const threshold = thresholdDays ?? (await this.getThresholds()).stuckDays;
    const projects = await this.prisma.project.findMany({
      where: { status: { notIn: ['Completed', 'Cancelled'] } },
      include: { client: { select: { name: true, individualName: true } } },
    });

    return projects
      .filter((p) => {
        const daysSinceUpdate =
          (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > threshold;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        clientName: getClientDisplayName(p.client),
        status: p.status,
        daysSinceUpdate: Math.round(
          (Date.now() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      }))
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  }

  // ─── Widget Summary ───────────────────────────────────────────────────────

  async getWidgetSummary(): Promise<WidgetSummaryResult> {
    const { stuckDays, criticalStageDays } = await this.getThresholds();

    const [stageDwell, taskVelocity, overdueBreakdown, stuckProjects] = await Promise.all([
      this.getStageDwellTime(criticalStageDays),
      this.getTaskVelocity(30),
      this.getOverdueBreakdown(),
      this.getStuckProjects(stuckDays),
    ]);

    const stuckProjectIds = stuckProjects.map((p) => p.id);

    // Identify which users have open tasks on stuck projects
    const blockingByUser: Record<string, { userName: string; projectIds: Set<string> }> = {};
    if (stuckProjectIds.length > 0) {
      const blockingTasks = await this.prisma.task.findMany({
        where: {
          entityType: 'project',
          entityId: { in: stuckProjectIds },
          status: { notIn: ['DONE', 'CANCELLED'] },
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

  /**
   * Ensure the AI response is markdown, not JSON.
   * If the model returned JSON despite instructions, convert it to readable sections.
   */
  private ensureMarkdown(content: string): string {
    const trimmed = content.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed)
          .map(([key, val]) =>
            `## ${key}\n\n${typeof val === 'string' ? val : JSON.stringify(val, null, 2)}`,
          )
          .join('\n\n');
      }
    } catch {
      // Not JSON — use as-is
    }
    return content;
  }

  async generateAiReport(): Promise<{ content: string; generatedAt: Date }> {
    const { stuckDays, criticalStageDays } = await this.getThresholds();

    const [stageDwell, taskVelocity, overdueBreakdown, stuckProjects] = await Promise.all([
      this.getStageDwellTime(criticalStageDays),
      this.getTaskVelocity(),
      this.getOverdueBreakdown(),
      this.getStuckProjects(stuckDays),
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

    const prompt = `You are a business performance analyst for Apex Consulting & Surveying, Inc., a land surveying firm. The CEO needs a frank, actionable bottleneck report.

CRITICAL FORMATTING RULES:
- Write in flowing prose paragraphs under each heading. Do NOT return JSON, code blocks, or bullet-point-only lists.
- Use markdown headings (## for sections) and bold text for emphasis.
- Each section should read like a written analysis, not a data dump.

---

**Stage Dwell Times (avg days per pipeline stage):**
${stageDwell.map((s) => `- ${s.stage}: ${s.avgDays} days avg (${s.count} leads)${s.isCritical ? ' ⚠️ CRITICAL' : ''}`).join('\n')}

**Team Member Blocker Scores (composite: overdue tasks + stuck project ownership + completion rate):**
${widgetSummary.topBlockers.map((u) => `- ${u.userName}: score ${u.blockerScore} — ${u.overdueCount} overdue tasks, blocking ${u.stuckProjectsBlocking} stuck project(s), ${u.completionRate}% task completion rate`).join('\n') || '- No significant blockers identified'}

**Task Velocity by Team Member (last 30 days):**
${taskVelocity.map((u) => `- ${u.userName}: ${u.completionRate}% completion (${u.completed}/${u.assigned} tasks), ${u.overdue} overdue`).join('\n')}

**Projects Stuck > ${stuckDays} Days Without Update:**
${stuckProjects.slice(0, 8).map((p) => `- ${p.name} (${p.clientName}): ${p.daysSinceUpdate} days stalled, status: ${p.status}`).join('\n') || '- None currently stalled'}

---

Write your analysis with the following four sections. Each section must be written in prose (sentences and paragraphs), not JSON or bullet points only:

## Who Is Holding Things Up
Name the specific individuals responsible for delays. Explain what they are blocking and why it matters to the business. Be direct — this is for the CEO.

## Critical Pipeline Stages
Describe which pipeline stages are slowest, what is causing the delay, and what operational change would fix it.

## Immediate Actions
Write 3 specific actions the CEO should take this week. For each, name the person involved, the action required, and a deadline.

## Revenue Risk
In 2–3 sentences, estimate the revenue at risk if these bottlenecks continue unresolved.`;

    const rawContent = await this.aiService.generateFreeform(prompt, undefined, 2048);
    const content = this.ensureMarkdown(rawContent);

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
    return { content: this.ensureMarkdown(report.content), generatedAt: report.generatedAt };
  }
}
