import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from './email.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 8 * * 1-5') // 8:00 AM Monday–Friday
  async sendDailyDigests(): Promise<void> {
    this.logger.log('Running daily digest cron job...');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const users = await this.prisma.user.findMany({
      where: { status: 'Active' },
      select: { id: true, email: true, name: true },
    });

    if (users.length === 0) return;

    // Batch-load all relevant tasks in a single query, then group by assignedToId
    const userIds = users.map((u) => u.id);
    const allTasks = await this.prisma.task.findMany({
      where: {
        assignedToId: { in: userIds },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        OR: [
          { dueDate: { lt: startOfToday } },
          { dueDate: { gte: startOfToday, lt: endOfToday } },
        ],
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        entityType: true,
        entityId: true,
        status: true,
        assignedToId: true,
      },
    });

    const tasksByUser = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      if (!task.assignedToId) continue;
      const list = tasksByUser.get(task.assignedToId) ?? [];
      list.push(task);
      tasksByUser.set(task.assignedToId, list);
    }

    // Fan out sends concurrently
    await Promise.all(
      users.map(async (user) => {
        const tasks = tasksByUser.get(user.id);
        if (!tasks || tasks.length === 0) return;
        try {
          await this.emailService.sendDailyDigestEmail(user.email, user.name, tasks);
          this.logger.log(`Digest sent to ${user.email} (${tasks.length} tasks)`);
        } catch (error) {
          this.logger.error(
            `Failed to send digest to ${user.email}: ${(error as Error).message}`,
          );
        }
      }),
    );
  }
}
