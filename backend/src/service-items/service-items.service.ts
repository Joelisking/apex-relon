import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';

@Injectable()
export class ServiceItemsService {
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

  async findAll(serviceTypeId?: string) {
    return this.prisma.serviceItem.findMany({
      where: serviceTypeId ? { serviceTypeIds: { has: serviceTypeId } } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: this.itemInclude,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.serviceItem.findUnique({
      where: { id },
      include: this.itemInclude,
    });
    if (!item) throw new NotFoundException(`Service item ${id} not found`);
    return item;
  }

  async create(dto: CreateServiceItemDto) {
    return this.prisma.serviceItem.create({
      data: dto,
      include: this.itemInclude,
    });
  }

  async update(id: string, dto: UpdateServiceItemDto) {
    await this.findOne(id);
    return this.prisma.serviceItem.update({
      where: { id },
      data: dto,
      include: this.itemInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.serviceItem.delete({ where: { id } });
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
    return this.prisma.serviceItemSubtask.create({
      data: { ...dto, serviceItemId },
      include: { roleEstimates: true },
    });
  }

  async updateSubtask(serviceItemId: string, subtaskId: string, dto: Partial<CreateSubtaskDto>) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) throw new NotFoundException(`Subtask ${subtaskId} not found`);
    return this.prisma.serviceItemSubtask.update({
      where: { id: subtaskId },
      data: dto,
      include: { roleEstimates: true },
    });
  }

  async deleteSubtask(serviceItemId: string, subtaskId: string) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) throw new NotFoundException(`Subtask ${subtaskId} not found`);
    return this.prisma.serviceItemSubtask.delete({ where: { id: subtaskId } });
  }

  async reorderSubtasks(serviceItemId: string, orderedIds: string[]) {
    await this.findOne(serviceItemId);
    const updates = orderedIds.map((id, index) =>
      this.prisma.serviceItemSubtask.update({ where: { id }, data: { sortOrder: index } }),
    );
    return this.prisma.$transaction(updates);
  }

  // ── Role Estimates ────────────────────────────────────────────────────────

  async upsertRoleEstimate(serviceItemId: string, subtaskId: string, role: string, estimatedHours: number) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) throw new NotFoundException(`Subtask ${subtaskId} not found`);
    return this.prisma.serviceItemRoleEstimate.upsert({
      where: { subtaskId_role: { subtaskId, role } },
      create: { subtaskId, role, estimatedHours },
      update: { estimatedHours },
    });
  }

  async deleteRoleEstimate(serviceItemId: string, subtaskId: string, role: string) {
    const subtask = await this.prisma.serviceItemSubtask.findFirst({
      where: { id: subtaskId, serviceItemId },
    });
    if (!subtask) throw new NotFoundException(`Subtask ${subtaskId} not found`);
    const estimate = await this.prisma.serviceItemRoleEstimate.findUnique({
      where: { subtaskId_role: { subtaskId, role } },
    });
    if (!estimate) throw new NotFoundException(`Role estimate for role "${role}" not found`);
    return this.prisma.serviceItemRoleEstimate.delete({
      where: { subtaskId_role: { subtaskId, role } },
    });
  }
}
