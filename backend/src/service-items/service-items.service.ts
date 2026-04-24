import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ServiceItemsService {
  private readonly logger = new Logger(ServiceItemsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly itemInclude = {
    subtasks: {
      orderBy: { sortOrder: 'asc' as const },
      include: {
        roleEstimates: { orderBy: { role: 'asc' as const } },
      },
    },
    _count: { select: { quoteLineItems: true, timeEntries: true } },
  };

  async findAll(jobTypeId?: string) {
    return this.prisma.serviceItem.findMany({
      where: jobTypeId ? { jobTypeIds: { has: jobTypeId } } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: this.itemInclude,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.serviceItem.findUnique({
      where: { id },
      include: this.itemInclude,
    });
    if (!item) {
      this.logger.warn(`Service item ${id} not found`);
      throw new NotFoundException(`Service item ${id} not found`);
    }
    return item;
  }

  async create(dto: CreateServiceItemDto) {
    try {
      const item = await this.prisma.serviceItem.create({
        data: dto,
        include: this.itemInclude,
      });
      this.logger.log(`Service item created: ${item.id} "${item.name}"`);
      return item;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.create');
    }
  }

  async update(id: string, dto: UpdateServiceItemDto) {
    await this.findOne(id);
    try {
      const item = await this.prisma.serviceItem.update({
        where: { id },
        data: dto,
        include: this.itemInclude,
      });
      this.logger.log(`Service item updated: ${id}`);
      return item;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.update');
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      const deleted = await this.prisma.serviceItem.delete({ where: { id } });
      this.logger.log(`Service item deleted: ${id}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.remove');
    }
  }

  // ── Subtasks ──────────────────────────────────────────────────────────────

  async getSubtasks(serviceItemId: string) {
    await this.findOne(serviceItemId);
    return this.prisma.serviceItemSubtask.findMany({
      where: { serviceItemId },
      orderBy: { sortOrder: 'asc' },
      include: { roleEstimates: { orderBy: { role: 'asc' } } },
    });
  }

  async createSubtask(serviceItemId: string, dto: CreateSubtaskDto) {
    await this.findOne(serviceItemId);
    try {
      const subtask = await this.prisma.serviceItemSubtask.create({
        data: { ...dto, serviceItemId },
        include: { roleEstimates: true },
      });
      this.logger.log(`Subtask created: ${subtask.id} on service item ${serviceItemId}`);
      return subtask;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.createSubtask');
    }
  }

  async updateSubtask(serviceItemId: string, subtaskId: string, dto: Partial<CreateSubtaskDto>) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) {
      this.logger.warn(`Subtask ${subtaskId} not found on service item ${serviceItemId}`);
      throw new NotFoundException(`Subtask ${subtaskId} not found`);
    }
    try {
      const updated = await this.prisma.serviceItemSubtask.update({
        where: { id: subtaskId },
        data: dto,
        include: { roleEstimates: true },
      });
      this.logger.log(`Subtask updated: ${subtaskId}`);
      return updated;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.updateSubtask');
    }
  }

  async deleteSubtask(serviceItemId: string, subtaskId: string) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) {
      this.logger.warn(`Subtask ${subtaskId} not found on service item ${serviceItemId}`);
      throw new NotFoundException(`Subtask ${subtaskId} not found`);
    }
    try {
      const deleted = await this.prisma.serviceItemSubtask.delete({ where: { id: subtaskId } });
      this.logger.log(`Subtask deleted: ${subtaskId}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.deleteSubtask');
    }
  }

  async reorderSubtasks(serviceItemId: string, orderedIds: string[]) {
    await this.findOne(serviceItemId);
    const updates = orderedIds.map((id, index) =>
      this.prisma.serviceItemSubtask.update({ where: { id }, data: { sortOrder: index } }),
    );
    try {
      await this.prisma.$transaction(updates);
      this.logger.log(`Subtasks reordered for service item ${serviceItemId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.reorderSubtasks');
    }
  }

  // ── Role Estimates ────────────────────────────────────────────────────────

  async upsertRoleEstimate(serviceItemId: string, subtaskId: string, role: string, estimatedHours: number) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) {
      this.logger.warn(`Subtask ${subtaskId} not found on service item ${serviceItemId}`);
      throw new NotFoundException(`Subtask ${subtaskId} not found`);
    }
    try {
      const estimate = await this.prisma.serviceItemRoleEstimate.upsert({
        where: { subtaskId_role: { subtaskId, role } },
        create: { subtaskId, role, estimatedHours },
        update: { estimatedHours },
      });
      this.logger.log(`Role estimate upserted: subtask=${subtaskId} role=${role}`);
      return estimate;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.upsertRoleEstimate');
    }
  }

  async deleteRoleEstimate(serviceItemId: string, subtaskId: string, role: string) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) {
      this.logger.warn(`Subtask ${subtaskId} not found on service item ${serviceItemId}`);
      throw new NotFoundException(`Subtask ${subtaskId} not found`);
    }
    const estimate = await this.prisma.serviceItemRoleEstimate.findUnique({
      where: { subtaskId_role: { subtaskId, role } },
    });
    if (!estimate) {
      this.logger.warn(`Role estimate for role "${role}" not found on subtask ${subtaskId}`);
      throw new NotFoundException(`Role estimate for role "${role}" not found`);
    }
    try {
      const deleted = await this.prisma.serviceItemRoleEstimate.delete({
        where: { subtaskId_role: { subtaskId, role } },
      });
      this.logger.log(`Role estimate deleted: subtask=${subtaskId} role=${role}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'ServiceItemsService.deleteRoleEstimate');
    }
  }
}
