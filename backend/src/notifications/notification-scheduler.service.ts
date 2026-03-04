import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification-types.constants';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron('0 9 * * *')
  async runDailyNotifications() {
    this.logger.log('Running daily notification checks...');
    await Promise.allSettled([
      this.checkTasksDue(),
      this.checkTasksOverdue(),
      this.checkStaleLeads(),
      this.checkDormantClients(),
    ]);
  }

  private async checkTasksDue() {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const tasks = await this.prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
        dueDate: { gte: startOfDay, lt: endOfDay },
        assignedToId: { not: null },
      },
    });

    for (const task of tasks) {
      if (!task.assignedToId) continue;
      const pref = await this.notificationsService.getPreferences(
        task.assignedToId,
      );
      if (!pref.taskDue) continue;
      const alreadySent =
        await this.notificationsService.hasRecentNotification(
          task.assignedToId,
          NotificationType.TASK_DUE,
          task.id,
        );
      if (alreadySent) continue;
      await this.notificationsService.create({
        userId: task.assignedToId,
        type: NotificationType.TASK_DUE,
        title: 'Task due today',
        message: `"${task.title}" is due today`,
        entityType: 'TASK',
        entityId: task.id,
      });
    }
  }

  private async checkTasksOverdue() {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const tasks = await this.prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
        dueDate: { lt: startOfDay },
        assignedToId: { not: null },
      },
    });

    for (const task of tasks) {
      if (!task.assignedToId) continue;
      const pref = await this.notificationsService.getPreferences(
        task.assignedToId,
      );
      if (!pref.taskOverdue) continue;
      const alreadySent =
        await this.notificationsService.hasRecentNotification(
          task.assignedToId,
          NotificationType.TASK_OVERDUE,
          task.id,
        );
      if (alreadySent) continue;
      const daysOverdue = Math.floor(
        (Date.now() - new Date(task.dueDate!).getTime()) / 86400000,
      );
      await this.notificationsService.create({
        userId: task.assignedToId,
        type: NotificationType.TASK_OVERDUE,
        title: 'Task overdue',
        message: `"${task.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        entityType: 'TASK',
        entityId: task.id,
      });
    }
  }

  private async checkStaleLeads() {
    const staleThreshold = new Date(Date.now() - 14 * 86400000);
    const closedStageNames = ['Won', 'Lost', 'Closed'];

    const leads = await this.prisma.lead.findMany({
      where: {
        updatedAt: { lt: staleThreshold },
        stage: { notIn: closedStageNames },
        assignedToId: { not: null },
      },
      select: {
        id: true,
        company: true,
        contactName: true,
        assignedToId: true,
        updatedAt: true,
      },
      take: 50,
    });

    for (const lead of leads) {
      if (!lead.assignedToId) continue;
      const pref = await this.notificationsService.getPreferences(
        lead.assignedToId,
      );
      if (!pref.leadStale) continue;
      const alreadySent =
        await this.notificationsService.hasRecentNotification(
          lead.assignedToId,
          NotificationType.LEAD_STALE,
          lead.id,
        );
      if (alreadySent) continue;
      const daysStale = Math.floor(
        (Date.now() - new Date(lead.updatedAt).getTime()) / 86400000,
      );
      const leadName = lead.company || lead.contactName;
      await this.notificationsService.create({
        userId: lead.assignedToId,
        type: NotificationType.LEAD_STALE,
        title: 'Lead going stale',
        message: `"${leadName}" hasn't been updated in ${daysStale} days`,
        entityType: 'LEAD',
        entityId: lead.id,
      });
    }
  }

  private async checkDormantClients() {
    const dormantThreshold = new Date(Date.now() - 30 * 86400000);

    const clients = await this.prisma.client.findMany({
      where: {
        activities: {
          none: { createdAt: { gte: dormantThreshold } },
        },
        accountManagerId: { not: null },
      },
      select: { id: true, name: true, accountManagerId: true },
      take: 30,
    });

    for (const client of clients) {
      if (!client.accountManagerId) continue;
      const pref = await this.notificationsService.getPreferences(
        client.accountManagerId,
      );
      if (!pref.clientDormant) continue;
      const alreadySent =
        await this.notificationsService.hasRecentNotification(
          client.accountManagerId,
          NotificationType.CLIENT_DORMANT,
          client.id,
        );
      if (alreadySent) continue;
      await this.notificationsService.create({
        userId: client.accountManagerId,
        type: NotificationType.CLIENT_DORMANT,
        title: 'Client dormant',
        message: `No activity with "${client.name}" in over 30 days`,
        entityType: 'CLIENT',
        entityId: client.id,
      });
    }
  }
}
