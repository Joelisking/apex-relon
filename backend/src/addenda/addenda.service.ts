import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateAddendumDto } from './dto/create-addendum.dto';
import { UpdateAddendumDto, UpsertAddendumLineDto } from './dto/update-addendum.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

const LINE_INCLUDE = {
  orderBy: { sortOrder: 'asc' as const },
  include: {
    serviceItem: { select: { id: true, name: true } },
    subtask: { select: { id: true, name: true, serviceItemId: true } },
  },
};

const ADDENDUM_INCLUDE = {
  lines: LINE_INCLUDE,
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class AddendaService {
  private readonly logger = new Logger(AddendaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAllForProject(projectId: string) {
    return this.prisma.projectAddendum.findMany({
      where: { projectId },
      include: ADDENDUM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const addendum = await this.prisma.projectAddendum.findUnique({
      where: { id },
      include: ADDENDUM_INCLUDE,
    });
    if (!addendum) {
      this.logger.warn(`findOne: addendum ${id} not found`);
      throw new NotFoundException(`Addendum ${id} not found`);
    }
    return addendum;
  }

  async create(projectId: string, dto: CreateAddendumDto, createdById: string) {
    const lines = dto.lines ?? [];
    const lineTotal = lines.reduce((s, l) => s + l.estimatedHours * l.billableRate, 0);

    try {
      const addendum = await this.prisma.projectAddendum.create({
        data: {
          projectId,
          createdById,
          title: dto.title,
          description: dto.description,
          total: lineTotal,
          lines: {
            create: lines.map((l, i) => ({
              description: l.description,
              role: l.role,
              serviceItemId: l.serviceItemId || null,
              serviceItemSubtaskId: l.serviceItemSubtaskId || null,
              estimatedHours: l.estimatedHours,
              billableRate: l.billableRate,
              lineTotal: l.estimatedHours * l.billableRate,
              sortOrder: l.sortOrder ?? i,
            })),
          },
        },
        include: ADDENDUM_INCLUDE,
      });
      this.logger.log(`Addendum created for project ${projectId} by user ${createdById}`);
      return addendum;
    } catch (error) {
      handlePrismaError(error, this.logger, 'create.create');
    }
  }

  async update(id: string, dto: UpdateAddendumDto) {
    const existing = await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'APPROVED' && !existing.approvedAt) {
        data.approvedAt = new Date();
      }
    }
    if (dto.roleDisplayNames !== undefined) {
      data.roleDisplayNames = sanitizeRoleDisplayNames(dto.roleDisplayNames);
    }

    try {
      const addendum = await this.prisma.projectAddendum.update({
        where: { id },
        data,
        include: ADDENDUM_INCLUDE,
      });
      this.logger.log(`Addendum ${id} updated`);
      return addendum;
    } catch (error) {
      handlePrismaError(error, this.logger, 'update.update');
    }
  }

  async upsertLines(addendumId: string, lines: UpsertAddendumLineDto[]) {
    await this.findOne(addendumId);

    const keepIds = lines.map((l) => l.id).filter(Boolean) as string[];

    try {
      await this.prisma.projectAddendumLine.deleteMany({
        where: { addendumId, id: { notIn: keepIds } },
      });
      this.logger.log(`Stale lines removed for addendum ${addendumId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'upsertLines.deleteMany');
    }

    let upserted: Awaited<ReturnType<typeof this.prisma.projectAddendumLine.upsert>>[];
    try {
      upserted = await Promise.all(
        lines.map((l, i) =>
          this.prisma.projectAddendumLine.upsert({
            where: { id: l.id ?? '' },
            create: {
              addendumId,
              description: l.description,
              role: l.role,
              serviceItemId: l.serviceItemId || null,
              serviceItemSubtaskId: l.serviceItemSubtaskId || null,
              estimatedHours: l.estimatedHours,
              billableRate: l.billableRate,
              lineTotal: l.estimatedHours * l.billableRate,
              sortOrder: l.sortOrder ?? i,
            },
            update: {
              description: l.description,
              role: l.role,
              serviceItemId: l.serviceItemId || null,
              serviceItemSubtaskId: l.serviceItemSubtaskId || null,
              estimatedHours: l.estimatedHours,
              billableRate: l.billableRate,
              lineTotal: l.estimatedHours * l.billableRate,
              sortOrder: l.sortOrder ?? i,
            },
          }),
        ),
      );
      this.logger.log(`${upserted.length} lines upserted for addendum ${addendumId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'upsertLines.upsert');
    }

    const total = upserted!.reduce((s, l) => s + l.lineTotal, 0);

    try {
      const addendum = await this.prisma.projectAddendum.update({
        where: { id: addendumId },
        data: { total },
        include: ADDENDUM_INCLUDE,
      });
      this.logger.log(`Addendum ${addendumId} total updated to ${total}`);
      return addendum;
    } catch (error) {
      handlePrismaError(error, this.logger, 'upsertLines.updateTotal');
    }
  }

  async delete(id: string) {
    await this.findOne(id);

    try {
      const addendum = await this.prisma.projectAddendum.delete({ where: { id } });
      this.logger.log(`Addendum ${id} deleted`);
      return addendum;
    } catch (error) {
      handlePrismaError(error, this.logger, 'delete.delete');
    }
  }

  async getApprovedLinesForProject(
    projectId: string,
    filters?: { serviceItemSubtaskId?: string; roles?: string[] },
  ) {
    const where: Prisma.ProjectAddendumLineWhereInput = {
      addendum: { projectId, status: { in: ['APPROVED', 'INVOICED'] } },
    };
    if (filters?.serviceItemSubtaskId) {
      where.serviceItemSubtaskId = filters.serviceItemSubtaskId;
    }
    if (filters?.roles && filters.roles.length > 0) {
      where.role = { in: filters.roles };
    }
    return this.prisma.projectAddendumLine.findMany({ where });
  }
}

function sanitizeRoleDisplayNames(
  input: Record<string, string> | null | undefined,
): Prisma.JsonNullValueInput | Record<string, string> {
  if (!input || typeof input !== 'object') return Prisma.JsonNull;
  const cleaned: Record<string, string> = {};
  for (const [key, val] of Object.entries(input)) {
    const trimmed = typeof val === 'string' ? val.trim() : '';
    if (trimmed) cleaned[key] = trimmed;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : Prisma.JsonNull;
}
