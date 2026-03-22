import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '@/email/email.service';
import {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
} from './dto/workflows.dto';
import { Prisma } from '@prisma/client';

// Allowlist of fields that workflow UPDATE_FIELD / ASSIGN_USER actions may write.
// Only explicitly listed columns per entity type are permitted.
const ALLOWED_UPDATE_FIELDS: Record<string, string[]> = {
  LEAD: ['stage', 'urgency', 'source', 'channel', 'notes', 'assignedToId', 'expectedValue'],
  CLIENT: ['status', 'notes', 'assignedToId'],
  PROJECT: ['status', 'notes', 'riskStatus', 'assignedToId'],
};

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
  ) {}

  // ─── CRUD ──────────────────────────────────────

  async findAll() {
    return this.prisma.workflowRule.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rule = await this.prisma.workflowRule.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!rule) throw new NotFoundException('Workflow rule not found');
    return rule;
  }

  async create(dto: CreateWorkflowRuleDto, userId: string) {
    return this.prisma.workflowRule.create({
      data: {
        name: dto.name,
        trigger: dto.trigger,
        conditions: dto.conditions as Prisma.InputJsonValue,
        actions: dto.actions as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateWorkflowRuleDto) {
    await this.findOne(id);
    return this.prisma.workflowRule.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.conditions !== undefined && { conditions: dto.conditions as Prisma.InputJsonValue }),
        ...(dto.actions !== undefined && { actions: dto.actions as unknown as Prisma.InputJsonValue }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.workflowRule.delete({ where: { id } });
  }

  async getExecutions(ruleId: string, limit = 50) {
    return this.prisma.workflowExecution.findMany({
      where: { ruleId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  // ─── Trigger Engine ────────────────────────────

  /**
   * Fire-and-forget wrapper — catches and logs errors so callers don't need to await.
   */
  private fireAndForget(fn: () => Promise<void>): void {
    fn().catch(err =>
      this.logger.error(`Workflow execution error: ${err?.message}`, err?.stack),
    );
  }

  /**
   * Public entry point — call without await from any service.
   * Signature: triggerRules(trigger, entityType, entityId, entityData)
   */
  triggerRules(
    trigger: string,
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>,
  ): void {
    this.fireAndForget(() =>
      this.evaluateAndExecute(trigger, { type: entityType, id: entityId, data: entityData }),
    );
  }

  /**
   * Internal: fetches matching active rules, evaluates conditions, and executes actions.
   */
  private async evaluateAndExecute(
    trigger: string,
    entity: { type: string; id: string; data: Record<string, unknown> },
  ): Promise<void> {
    const rules = await this.prisma.workflowRule.findMany({
      where: { trigger, isActive: true },
    });

    for (const rule of rules) {
      try {
        const conditionsMet = this.evaluateConditions(
          rule.conditions as Record<string, unknown>,
          entity.data,
        );
        if (!conditionsMet) {
          await this.logExecution(
            rule.id,
            entity.type,
            entity.id,
            'SKIPPED',
            { reason: 'Conditions not met' },
          );
          continue;
        }

        await this.executeActions(rule.actions as Record<string, unknown>[], entity, rule.createdById);
        await this.logExecution(rule.id, entity.type, entity.id, 'SUCCESS', null);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Workflow rule ${rule.id} failed: ${message}`);
        await this.logExecution(rule.id, entity.type, entity.id, 'FAILED', { error: message });
      }
    }
  }

  // ─── Cron: Time-based triggers ─────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runTimedTriggers(): Promise<void> {
    // DAYS_SINCE_CONTACT: find leads where updatedAt < N days ago
    const daysTriggerRules = await this.prisma.workflowRule.findMany({
      where: { trigger: 'DAYS_SINCE_CONTACT', isActive: true },
    });
    for (const rule of daysTriggerRules) {
      const days = (rule.conditions as Record<string, unknown>)?.days ?? 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days as number));
      const leads = await this.prisma.lead.findMany({
        where: { updatedAt: { lt: cutoff }, stage: { notIn: ['Closed Won', 'Won', 'Closed Lost', 'Lost'] } },
      });
      for (const lead of leads) {
        this.triggerRules('DAYS_SINCE_CONTACT', 'LEAD', lead.id, lead as unknown as Record<string, unknown>);
      }
    }

    // TASK_DUE: find tasks due today that are not done
    const taskDueRules = await this.prisma.workflowRule.findMany({
      where: { trigger: 'TASK_DUE', isActive: true },
    });
    if (taskDueRules.length > 0) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      const tasks = await this.prisma.task.findMany({
        where: { dueDate: { gte: todayStart, lte: todayEnd }, status: { not: 'DONE' } },
      });
      for (const task of tasks) {
        this.triggerRules('TASK_DUE', 'TASK', task.id, task as unknown as Record<string, unknown>);
      }
    }
  }

  // ─── Dry-run test support ───────────────────────

  /**
   * Evaluate a rule against an optional entity and return what would happen — does NOT execute or log.
   */
  async testRule(
    ruleId: string,
    entityType: string,
    entityId?: string,
  ): Promise<{
    conditionsMet: boolean;
    actionCount: number;
    actions: string[];
    message: string;
  }> {
    const rule = await this.findOne(ruleId);

    let entityData: Record<string, unknown> = {};

    if (entityId) {
      let record: Record<string, unknown> | null = null;
      switch (entityType) {
        case 'LEAD':
          record = await this.prisma.lead.findUnique({ where: { id: entityId } }) as Record<string, unknown> | null;
          break;
        case 'PROJECT':
          record = await this.prisma.project.findUnique({ where: { id: entityId } }) as Record<string, unknown> | null;
          break;
        case 'CLIENT':
          record = await this.prisma.client.findUnique({ where: { id: entityId } }) as Record<string, unknown> | null;
          break;
        case 'TASK':
          record = await this.prisma.task.findUnique({ where: { id: entityId } }) as Record<string, unknown> | null;
          break;
      }
      if (record) {
        entityData = record;
      }
    }

    const conditionsMet = this.evaluateConditions(
      rule.conditions as Record<string, unknown>,
      entityData,
    );

    const actions = rule.actions as Record<string, unknown>[];
    const actionTypes = actions.map((a) => String(a.type ?? 'UNKNOWN'));

    return {
      conditionsMet,
      actionCount: actions.length,
      actions: actionTypes,
      message: conditionsMet
        ? `Rule "${rule.name}" conditions met — ${actions.length} action(s) would execute: ${actionTypes.join(', ')}`
        : `Rule "${rule.name}" conditions NOT met — no actions would execute`,
    };
  }

  // ─── Condition Evaluation ──────────────────────

  private evaluateConditions(conditions: Record<string, unknown>, data: Record<string, unknown>): boolean {
    const rules = conditions.rules as Record<string, unknown>[] | undefined;
    if (
      !conditions ||
      !rules ||
      rules.length === 0
    )
      return true;

    const logic = conditions.logic || 'AND';
    const results = rules.map((rule: Record<string, unknown>) => {
      const fieldValue = data[rule.field as string];
      switch (rule.operator) {
        case 'equals':
          return fieldValue === rule.value;
        case 'not_equals':
          return fieldValue !== rule.value;
        case 'contains':
          return String(fieldValue || '').includes(String(rule.value ?? ''));
        case 'greater_than':
          return Number(fieldValue) > Number(rule.value);
        case 'less_than':
          return Number(fieldValue) < Number(rule.value);
        case 'is_empty':
          return !fieldValue;
        case 'is_not_empty':
          return !!fieldValue;
        case 'in':
          return (
            Array.isArray(rule.value) &&
            rule.value.includes(fieldValue)
          );
        default:
          return false;
      }
    });

    return logic === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  // ─── Action Execution ──────────────────────────

  private async executeActions(
    actions: Record<string, unknown>[],
    entity: { type: string; id: string; data: Record<string, unknown> },
    ruleCreatedById: string,
  ) {
    for (const action of actions) {
      const config = (action.config as Record<string, unknown>) || {};
      switch (action.type) {
        case 'SEND_NOTIFICATION': {
          const notifUserId = (config.userId as string) || (entity.data.assignedToId as string);
          if (!notifUserId) {
            this.logger.warn(`SEND_NOTIFICATION skipped: no userId resolved for entity ${entity.id}`);
            break;
          }
          await this.notificationsService.create({
            userId: notifUserId,
            type: 'SYSTEM',
            title: (config.title as string) || 'Workflow Notification',
            message: this.interpolateTemplate(
              (config.message as string) || '',
              entity.data,
            ),
            entityType: entity.type,
            entityId: entity.id,
          });
          break;
        }

        case 'SEND_EMAIL': {
          const to = this.interpolateTemplate(config.to as string || '', entity.data);
          const subject = this.interpolateTemplate(
            config.subject as string || 'Automated notification',
            entity.data,
          );
          const body = this.interpolateTemplate(config.body as string || '', entity.data);
          if (to) {
            await this.emailService.sendWorkflowEmail(to, subject, body);
          } else {
            this.logger.warn(`SEND_EMAIL skipped: no recipient resolved for entity ${entity.id}`);
          }
          break;
        }

        case 'UPDATE_FIELD':
          await this.updateEntityField(
            entity.type,
            entity.id,
            config.field as string,
            config.value,
          );
          break;

        case 'ASSIGN_USER':
          await this.updateEntityField(
            entity.type,
            entity.id,
            'assignedToId',
            config.userId,
          );
          break;

        case 'CREATE_TASK': {
          const taskCreatedById = ruleCreatedById;
          if (!taskCreatedById) {
            this.logger.warn(`CREATE_TASK skipped: rule has no createdById for entity ${entity.id}`);
            break;
          }
          await this.prisma.task.create({
            data: {
              title: this.interpolateTemplate(
                (config.title as string) || 'Auto-generated task',
                entity.data,
              ),
              description: config.description as string | undefined,
              priority: (config.priority as string) || 'MEDIUM',
              entityType: entity.type,
              entityId: entity.id,
              assignedToId:
                (config.assignedToId as string) ||
                (entity.data.assignedToId as string) ||
                undefined,
              createdById: taskCreatedById,
              dueDate: config.dueDays
                ? new Date(
                    Date.now() + (config.dueDays as number) * 86400000,
                  )
                : undefined,
            },
          });
          break;
        }

        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
      }
    }
  }

  // ─── Helpers ───────────────────────────────────

  private async updateEntityField(
    entityType: string,
    entityId: string,
    field: string,
    value: unknown,
  ) {
    const allowed = ALLOWED_UPDATE_FIELDS[entityType];
    if (!allowed || !allowed.includes(field)) {
      this.logger.warn(
        `UPDATE_FIELD blocked: '${field}' is not in the allowlist for entity type '${entityType}'`,
      );
      return;
    }
    const model =
      entityType === 'LEAD'
        ? 'lead'
        : entityType === 'CLIENT'
          ? 'client'
          : 'project';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma[model] as unknown as { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }).update({
      where: { id: entityId },
      data: { [field]: value },
    });
  }

  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => String(data[key] ?? ''),
    );
  }

  private async logExecution(
    ruleId: string,
    entityType: string,
    entityId: string,
    result: string,
    details: Prisma.InputJsonValue | null,
  ) {
    return this.prisma.workflowExecution.create({
      data: { ruleId, entityType, entityId, result, details },
    });
  }
}
