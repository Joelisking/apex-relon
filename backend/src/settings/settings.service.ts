import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { CreateTaskTypeDto } from './dto/create-task-type.dto';
import {
  CreateDropdownOptionDto,
  UpdateDropdownOptionDto,
} from './dto/dropdown-option.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedTeamTypes();
  }

  private async seedTeamTypes() {
    const TEAM_TYPES = [
      { value: 'SALES', label: 'Sales', sortOrder: 0 },
      { value: 'DESIGN', label: 'Design', sortOrder: 1 },
      { value: 'OPERATIONS', label: 'Operations', sortOrder: 2 },
      { value: 'SUPPORT', label: 'Support', sortOrder: 3 },
      { value: 'FINANCE', label: 'Finance', sortOrder: 4 },
      { value: 'MARKETING', label: 'Marketing', sortOrder: 5 },
      { value: 'OTHER', label: 'Other', sortOrder: 6 },
    ];

    // Fast-path: skip the upsert loop when all team type entries are already present.
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'team_type' },
    });
    if (existingCount >= TEAM_TYPES.length) {
      this.logger.log(
        `Team type dropdown options already seeded (${existingCount} entries). Skipping.`,
      );
      return;
    }

    let added = 0;
    for (const type of TEAM_TYPES) {
      await this.prisma.dropdownOption.upsert({
        where: {
          category_value: {
            category: 'team_type',
            value: type.value,
          },
        },
        update: {},
        create: {
          category: 'team_type',
          value: type.value,
          label: type.label,
          sortOrder: type.sortOrder,
          isSystem: true,
          isActive: true,
        },
      });
      added++;
    }
    this.logger.log(
      `Team type dropdown options ensured (${added} entries).`,
    );
  }

  // ── Service Types ──────────────────────────────────────────────────────────

  async findAllServiceTypes() {
    return this.prisma.serviceType.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { leads: true, projects: true } } },
    });
  }

  async createServiceType(dto: CreateServiceTypeDto) {
    return this.prisma.serviceType.create({ data: dto });
  }

  async updateServiceType(
    id: string,
    dto: Partial<CreateServiceTypeDto>,
  ) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Service type with ID ${id} not found`,
      );
    }
    return this.prisma.serviceType.update({
      where: { id },
      data: dto,
    });
  }

  async deleteServiceType(id: string) {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Service type with ID ${id} not found`,
      );
    }
    const [leadCount, projectCount] = await Promise.all([
      this.prisma.lead.count({ where: { serviceTypeId: id } }),
      this.prisma.project.count({ where: { serviceTypeId: id } }),
    ]);
    if (leadCount > 0 || projectCount > 0) {
      throw new BadRequestException(
        `Cannot delete service type "${existing.name}" because it is assigned to ${leadCount} lead(s) and ${projectCount} project(s).`,
      );
    }
    return this.prisma.serviceType.delete({ where: { id } });
  }

  // ── Task Types ─────────────────────────────────────────────────────────────

  async findAllTaskTypes(serviceTypeId?: string) {
    return this.prisma.taskType.findMany({
      where: serviceTypeId ? { serviceTypeId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        serviceType: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });
  }

  async createTaskType(dto: CreateTaskTypeDto) {
    return this.prisma.taskType.create({ data: dto });
  }

  async updateTaskType(id: string, dto: Partial<CreateTaskTypeDto>) {
    const existing = await this.prisma.taskType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task type with ID ${id} not found`);
    }
    return this.prisma.taskType.update({ where: { id }, data: dto });
  }

  async deleteTaskType(id: string) {
    const existing = await this.prisma.taskType.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task type with ID ${id} not found`);
    }
    const taskCount = await this.prisma.task.count({ where: { taskTypeId: id } });
    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete task type "${existing.name}" because it is assigned to ${taskCount} task(s).`,
      );
    }
    return this.prisma.taskType.delete({ where: { id } });
  }

  // ── Dropdown Options ───────────────────────────────────────────────────────

  async findDropdownOptions(category?: string) {
    return this.prisma.dropdownOption.findMany({
      where: {
        ...(category ? { category } : {}),
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async findAllDropdownOptions() {
    return this.prisma.dropdownOption.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async createDropdownOption(dto: CreateDropdownOptionDto) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: {
        category_value: { category: dto.category, value: dto.value },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `A dropdown option with value "${dto.value}" already exists in category "${dto.category}".`,
      );
    }
    return this.prisma.dropdownOption.create({
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async updateDropdownOption(
    id: string,
    dto: UpdateDropdownOptionDto,
  ) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Dropdown option with ID ${id} not found`,
      );
    }
    return this.prisma.dropdownOption.update({
      where: { id },
      data: {
        ...dto,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteDropdownOption(id: string) {
    const existing = await this.prisma.dropdownOption.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Dropdown option with ID ${id} not found`,
      );
    }
    if (existing.isSystem) {
      throw new BadRequestException(
        `Cannot delete system option "${existing.label}". You can disable it instead.`,
      );
    }
    return this.prisma.dropdownOption.delete({ where: { id } });
  }

  async reorderDropdownOptions(
    category: string,
    orderedIds: string[],
  ) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.dropdownOption.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }
}
