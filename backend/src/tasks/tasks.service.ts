import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { WorkflowsService } from '../workflows/workflows.service';
import { PermissionsService } from '../permissions/permissions.service';
import { EmailService } from '../email/email.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

// Task status values — kept as plain strings to match the DB schema (no enum)
const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS'] as const;
const DONE_STATUS = 'DONE' as const;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private workflowsService: WorkflowsService,
    private permissionsService: PermissionsService,
    private emailService: EmailService,
  ) {}

  async findAll(filters: {
    userId?: string;
    canViewAll?: boolean;
    status?: string;
    priority?: string;
    entityType?: string;
    entityId?: string;
    assignedToId?: string;
    dueBefore?: string;
    dueAfter?: string;
  }) {
    const where: Record<string, unknown> = {};

    // Only show tasks visible to the requesting user unless they have view_all
    if (!filters.canViewAll) {
      where.OR = [
        { assignedToId: filters.userId },
        { createdById: filters.userId },
      ];
    }

    // If explicit assignedToId filter
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.dueBefore || filters.dueAfter) {
      const dueDateFilter: { lte?: Date; gte?: Date } = {};
      if (filters.dueBefore)
        dueDateFilter.lte = new Date(filters.dueBefore);
      if (filters.dueAfter)
        dueDateFilter.gte = new Date(filters.dueAfter);
      where.dueDate = dueDateFilter;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    return this.resolveEntityNames(tasks);
  }

  async findOne(id: string, viewerUserId?: string, canViewAll?: boolean) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Mirror findAll's ownership scoping: without tasks:view_all, the viewer
    // can only read tasks assigned to them or created by them. Return 404
    // (not 403) so existence isn't inferable by probing IDs.
    if (!canViewAll && viewerUserId) {
      const isOwner = task.assignedToId
        ? task.assignedToId === viewerUserId
        : task.createdById === viewerUserId;
      if (!isOwner) throw new NotFoundException('Task not found');
    }

    return (await this.resolveEntityNames([task]))[0];
  }

  async create(dto: CreateTaskDto, userId: string, userRole?: string) {
    if (dto.assignedToId && dto.assignedToId !== userId && userRole) {
      const canAssign = await this.permissionsService.hasPermission(userRole, 'tasks:assign');
      if (!canAssign) throw new ForbiddenException('Cannot assign tasks to other users');
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate + 'T12:00:00.000Z') : undefined,
        dueTime: dto.dueTime,
        priority: dto.priority || 'MEDIUM',
        entityType: dto.entityType,
        entityId: dto.entityId,
        assignedToId: dto.assignedToId || userId,
        createdById: userId,
        reminderAt: dto.reminderAt
          ? new Date(dto.reminderAt)
          : undefined,
        taskTypeId: dto.taskTypeId,
        estimatedHours: dto.estimatedHours,
        costBreakdownLineId: dto.costBreakdownLineId,
        serviceItemId: dto.serviceItemId,
        serviceItemSubtaskId: dto.serviceItemSubtaskId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
    });
    // Notify assignee if different from creator
    if (task.assignedToId && task.assignedToId !== userId) {
      try {
        // Resolve parent entity name for notification context
        let parentName: string | undefined;
        if (task.entityType === 'LEAD' && task.entityId) {
          const lead = await this.prisma.lead.findUnique({
            where: { id: task.entityId },
            select: { company: true, contactName: true },
          });
          if (lead) parentName = lead.company || lead.contactName;
        } else if (task.entityType === 'PROJECT' && task.entityId) {
          const project = await this.prisma.project.findUnique({
            where: { id: task.entityId },
            select: { name: true },
          });
          if (project) parentName = project.name;
        }
        const actorName = task.createdBy.name;
        const parentContext = parentName
          ? ` on ${task.entityType === 'LEAD' ? 'Lead' : 'Project'}: ${parentName}`
          : '';

        const pref = await this.notificationsService.getPreferences(task.assignedToId);
        if (pref.taskAssigned) {
          await this.notificationsService.create({
            userId: task.assignedToId,
            type: NotificationType.TASK_ASSIGNED,
            title: 'New task assigned',
            message: `${actorName} assigned you "${task.title}"${parentContext}`,
            entityType: task.entityType ?? undefined,
            entityId: task.entityId ?? undefined,
            metadata: { actorId: task.createdById, actorName, parentName },
          });
        }
        // Send assignment email if assignee has an email address
        if (task.assignedTo?.email) {
          await this.emailService.sendTaskAssignedEmail(
            task.assignedTo.email,
            task.assignedTo.name,
            {
              id: task.id,
              title: task.title,
              dueDate: task.dueDate ?? null,
              dueTime: task.dueTime ?? null,
              priority: task.priority,
              entityType: task.entityType ?? null,
              entityName: parentName ?? null,
            },
            actorName,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to send task-assigned notification/email: ${err}`);
      }
    }

    this.workflowsService.triggerRules('TASK_CREATED', 'TASK', task.id, task as unknown as Record<string, unknown>);

    return (await this.resolveEntityNames([task]))[0];
  }

  async update(id: string, dto: UpdateTaskDto, userId: string, userRole?: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    // Ownership check: users without tasks:edit_all can only edit their own tasks
    const canEditAll = userRole
      ? await this.permissionsService.hasPermission(userRole, 'tasks:edit_all')
      : false;
    if (!canEditAll) {
      const isOwner = existing.assignedToId
        ? userId === existing.assignedToId
        : userId === existing.createdById;
      if (!isOwner) {
        throw new ForbiddenException('You can only edit tasks assigned to you');
      }
    }

    if (dto.assignedToId && dto.assignedToId !== userId && userRole) {
      const canAssign = await this.permissionsService.hasPermission(userRole, 'tasks:assign');
      if (!canAssign) throw new ForbiddenException('Cannot assign tasks to other users');
    }

    // Validate completion rules when marking as DONE — only when task is not already DONE.
    // Skip this block entirely if the task is already DONE (e.g., editing title/description).
    if (dto.status === DONE_STATUS && existing.status !== DONE_STATUS) {
      const isUnauthorised = existing.assignedToId
        ? userId !== existing.assignedToId
        : userId !== existing.createdById;
      if (isUnauthorised) {
        throw new ForbiddenException(
          'Only the assigned user can mark this task as done',
        );
      }
      if (!dto.completionNote) {
        throw new BadRequestException(
          'A completion note is required when marking a task as done',
        );
      }
    }

    // Validate revert rules when un-completing a DONE task
    if (existing.status === DONE_STATUS && dto.status && dto.status !== DONE_STATUS) {
      if (!dto.uncompleteReason) {
        throw new BadRequestException(
          'A reason is required when reverting a completed task',
        );
      }
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate + 'T12:00:00.000Z');
    if (dto.reminderAt) data.reminderAt = new Date(dto.reminderAt);
    if (dto.taskTypeId !== undefined) data.taskTypeId = dto.taskTypeId;

    // Auto-set completedAt
    if (dto.status === DONE_STATUS) {
      data.completedAt = new Date();
    } else if (dto.status) {
      data.completedAt = null;
      // Clear completion note when reverting
      if (!data.completionNote) data.completionNote = null;
    }

    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
    });

    // Notify new assignee when task is reassigned to a different person
    const assigneeChanged =
      dto.assignedToId &&
      dto.assignedToId !== existing.assignedToId &&
      dto.assignedToId !== userId;
    if (assigneeChanged && task.assignedTo?.email) {
      try {
        // Resolve parent entity name for notification context
        let parentName: string | undefined;
        if (task.entityType === 'LEAD' && task.entityId) {
          const lead = await this.prisma.lead.findUnique({
            where: { id: task.entityId },
            select: { company: true, contactName: true },
          });
          if (lead) parentName = lead.company || lead.contactName;
        } else if (task.entityType === 'PROJECT' && task.entityId) {
          const project = await this.prisma.project.findUnique({
            where: { id: task.entityId },
            select: { name: true },
          });
          if (project) parentName = project.name;
        }
        const actorName = task.createdBy.name;
        const parentContext = parentName
          ? ` on ${task.entityType === 'LEAD' ? 'Lead' : 'Project'}: ${parentName}`
          : '';

        const pref = await this.notificationsService.getPreferences(task.assignedToId!);
        if (pref.taskAssigned) {
          await this.notificationsService.create({
            userId: task.assignedToId!,
            type: NotificationType.TASK_ASSIGNED,
            title: 'New task assigned',
            message: `${actorName} assigned you "${task.title}"${parentContext}`,
            entityType: task.entityType ?? undefined,
            entityId: task.entityId ?? undefined,
            metadata: { actorId: task.createdById, actorName, parentName },
          });
        }
        await this.emailService.sendTaskAssignedEmail(
          task.assignedTo.email,
          task.assignedTo.name,
          {
            id: task.id,
            title: task.title,
            dueDate: task.dueDate ?? null,
            dueTime: task.dueTime ?? null,
            priority: task.priority,
            entityType: task.entityType ?? null,
            entityName: parentName ?? null,
          },
          actorName,
        );
      } catch (err) {
        this.logger.warn(`Failed to send task-reassigned notification/email: ${err}`);
      }
    }

    if (dto.status === DONE_STATUS) {
      this.workflowsService.triggerRules('TASK_COMPLETED', 'TASK', task.id, task as unknown as Record<string, unknown>);
    } else {
      this.workflowsService.triggerRules('TASK_UPDATED', 'TASK', task.id, task as unknown as Record<string, unknown>);
    }

    return (await this.resolveEntityNames([task]))[0];
  }

  async complete(id: string, completionNote: string, userId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const isUnauthorised = existing.assignedToId
      ? userId !== existing.assignedToId
      : userId !== existing.createdById;
    if (isUnauthorised) {
      throw new ForbiddenException(
        'Only the assigned user can mark this task as done',
      );
    }

    if (!completionNote) {
      throw new BadRequestException(
        'A completion note is required when marking a task as done',
      );
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: DONE_STATUS,
        completedAt: new Date(),
        completionNote,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
    });

    this.workflowsService.triggerRules('TASK_COMPLETED', 'TASK', task.id, task as unknown as Record<string, unknown>);

    return (await this.resolveEntityNames([task]))[0];
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }

  async getMyTasksSummary(userId: string) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    return this.computeSummaryForUser(userId, startOfToday, endOfToday);
  }

  private async computeSummaryForUser(
    userId: string,
    startOfToday: Date,
    endOfToday: Date,
  ) {
    const base = {
      status: { in: [...ACTIVE_STATUSES] as string[] },
      OR: [{ assignedToId: userId }, { createdById: userId }],
    };
    const [overdue, dueToday, upcoming, total] = await Promise.all([
      this.prisma.task.count({ where: { ...base, dueDate: { lt: startOfToday } } }),
      this.prisma.task.count({ where: { ...base, dueDate: { gte: startOfToday, lt: endOfToday } } }),
      // Tasks with no due date or due after today count as upcoming
      // Use AND to avoid overwriting the user-scope OR from base
      this.prisma.task.count({
        where: {
          ...base,
          AND: [{ OR: [{ dueDate: { gte: endOfToday } }, { dueDate: null }] }],
        },
      }),
      this.prisma.task.count({ where: base }),
    ]);
    return { overdue, dueToday, upcoming, total };
  }

  async getTeamSummary(userId: string, viewAll: boolean) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    const members = viewAll
      ? await this.prisma.user.findMany({
          where: { status: 'Active', NOT: { id: userId } },
          select: { id: true, name: true, role: true, teamName: true },
          orderBy: [{ teamName: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
        })
      : await this.prisma.user.findMany({
          where: { managerId: userId, status: 'Active' },
          select: { id: true, name: true, role: true },
          orderBy: { name: 'asc' },
        });

    const emptyTotals = { overdue: 0, dueToday: 0, upcoming: 0, total: 0 };
    if (members.length === 0) return { team: emptyTotals, members: [] };

    const memberStats = await Promise.all(
      members.map(async (member) => {
        const stats = await this.computeSummaryForUser(member.id, startOfToday, endOfToday);
        return { ...member, ...stats };
      }),
    );

    const team = memberStats.reduce(
      (acc, m) => ({
        overdue: acc.overdue + m.overdue,
        dueToday: acc.dueToday + m.dueToday,
        upcoming: acc.upcoming + m.upcoming,
        total: acc.total + m.total,
      }),
      { overdue: 0, dueToday: 0, upcoming: 0, total: 0 },
    );

    return { team, members: memberStats };
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    viewerUserId?: string,
    canViewAll?: boolean,
  ) {
    const where: Record<string, unknown> = { entityType, entityId };
    // Scope to tasks the viewer owns unless they have tasks:view_all.
    if (!canViewAll && viewerUserId) {
      where.OR = [
        { assignedToId: viewerUserId },
        { createdById: viewerUserId },
      ];
    }
    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        taskType: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
    });
    return this.resolveEntityNames(tasks);
  }

  private async resolveEntityNames(tasks: any[]): Promise<any[]> {
    const leadIds = tasks
      .filter((t) => t.entityType === 'LEAD' && t.entityId)
      .map((t) => t.entityId as string);
    const clientIds = tasks
      .filter((t) => t.entityType === 'CLIENT' && t.entityId)
      .map((t) => t.entityId as string);
    const projectIds = tasks
      .filter((t) => t.entityType === 'PROJECT' && t.entityId)
      .map((t) => t.entityId as string);

    const [leads, clients, projects] = await Promise.all([
      leadIds.length
        ? this.prisma.lead.findMany({
            where: { id: { in: leadIds } },
            select: { id: true, company: true, contactName: true },
          })
        : [],
      clientIds.length
        ? this.prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true },
          })
        : [],
      projectIds.length
        ? this.prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const nameMap = new Map<string, string>();
    for (const l of leads as { id: string; company: string | null; contactName: string }[])
      nameMap.set(l.id, l.company || l.contactName);
    for (const c of clients as { id: string; name: string }[])
      nameMap.set(c.id, c.name);
    for (const p of projects as { id: string; name: string }[])
      nameMap.set(p.id, p.name);

    return tasks.map((t) => ({
      ...t,
      entityName: t.entityId ? (nameMap.get(t.entityId) ?? null) : null,
    }));
  }
}
