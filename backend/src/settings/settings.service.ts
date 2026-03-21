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
    await this.seedClientSegments();
    await this.seedIndividualTypes();
    await this.seedClientIndustries();
    await this.seedLeadSources();
    await this.seedUrgencyLevels();
    await this.seedProjectRiskStatus();
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

  private async seedClientSegments() {
    const OPTIONS = [
      { value: 'corporate', label: 'Corporate', sortOrder: 0 },
      { value: 'sme', label: 'SME', sortOrder: 1 },
      { value: 'government', label: 'Government', sortOrder: 2 },
      { value: 'nonprofit', label: 'Non-Profit', sortOrder: 3 },
      { value: 'individual', label: 'Individual', sortOrder: 4 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'client_segment' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'client_segment', value: opt.value } },
        update: {},
        create: { category: 'client_segment', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Client segment dropdown options ensured.');
  }

  private async seedIndividualTypes() {
    const OPTIONS = [
      { value: 'owner', label: 'Owner', sortOrder: 0 },
      { value: 'director', label: 'Director', sortOrder: 1 },
      { value: 'project_manager', label: 'Project Manager', sortOrder: 2 },
      { value: 'engineer', label: 'Engineer', sortOrder: 3 },
      { value: 'architect', label: 'Architect', sortOrder: 4 },
      { value: 'contractor', label: 'Contractor', sortOrder: 5 },
      { value: 'other', label: 'Other', sortOrder: 6 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'individual_type' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'individual_type', value: opt.value } },
        update: {},
        create: { category: 'individual_type', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Individual type dropdown options ensured.');
  }

  private async seedClientIndustries() {
    const OPTIONS = [
      { value: 'government', label: 'Government', sortOrder: 0 },
      { value: 'construction', label: 'Construction', sortOrder: 1 },
      { value: 'real_estate', label: 'Real Estate', sortOrder: 2 },
      { value: 'utilities', label: 'Utilities', sortOrder: 3 },
      { value: 'transportation', label: 'Transportation / INDOT', sortOrder: 4 },
      { value: 'telecommunications', label: 'Telecommunications', sortOrder: 5 },
      { value: 'engineering', label: 'Engineering', sortOrder: 6 },
      { value: 'environmental', label: 'Environmental', sortOrder: 7 },
      { value: 'legal', label: 'Legal', sortOrder: 8 },
      { value: 'agriculture', label: 'Agriculture', sortOrder: 9 },
      { value: 'other', label: 'Other', sortOrder: 10 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'client_industry' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'client_industry', value: opt.value } },
        update: {},
        create: { category: 'client_industry', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Client industry dropdown options ensured.');
  }

  private async seedLeadSources() {
    const OPTIONS = [
      { value: 'referral', label: 'Referral', sortOrder: 0 },
      { value: 'repeat_client', label: 'Repeat Client', sortOrder: 1 },
      { value: 'indot', label: 'INDOT / Government', sortOrder: 2 },
      { value: 'website', label: 'Website / Online', sortOrder: 3 },
      { value: 'cold_call', label: 'Cold Call', sortOrder: 4 },
      { value: 'bid_board', label: 'Bid Board', sortOrder: 5 },
      { value: 'networking', label: 'Networking / Event', sortOrder: 6 },
      { value: 'other', label: 'Other', sortOrder: 7 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'lead_source' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'lead_source', value: opt.value } },
        update: {},
        create: { category: 'lead_source', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Lead source dropdown options ensured.');
  }

  private async seedUrgencyLevels() {
    const OPTIONS = [
      { value: 'low', label: 'Low', sortOrder: 0 },
      { value: 'medium', label: 'Medium', sortOrder: 1 },
      { value: 'high', label: 'High', sortOrder: 2 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'urgency' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'urgency', value: opt.value } },
        update: {},
        create: { category: 'urgency', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Urgency level dropdown options ensured.');
  }

  private async seedProjectRiskStatus() {
    const OPTIONS = [
      { value: 'On Track', label: 'On Track', sortOrder: 1 },
      { value: 'At Risk', label: 'At Risk', sortOrder: 2 },
      { value: 'Blocked', label: 'Blocked', sortOrder: 3 },
    ];
    const existingCount = await this.prisma.dropdownOption.count({
      where: { category: 'project_risk_status' },
    });
    if (existingCount >= OPTIONS.length) return;
    for (const opt of OPTIONS) {
      await this.prisma.dropdownOption.upsert({
        where: { category_value: { category: 'project_risk_status', value: opt.value } },
        update: {},
        create: { category: 'project_risk_status', ...opt, isSystem: true, isActive: true },
      });
    }
    this.logger.log('Project risk status dropdown options ensured.');
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
