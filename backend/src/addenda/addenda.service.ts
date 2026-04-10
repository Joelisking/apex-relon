import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAddendumDto } from './dto/create-addendum.dto';
import { UpdateAddendumDto, UpsertAddendumLineDto } from './dto/update-addendum.dto';

@Injectable()
export class AddendaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForProject(projectId: string) {
    return this.prisma.projectAddendum.findMany({
      where: { projectId },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const addendum = await this.prisma.projectAddendum.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!addendum) throw new NotFoundException(`Addendum ${id} not found`);
    return addendum;
  }

  async create(projectId: string, dto: CreateAddendumDto, createdById: string) {
    const lines = dto.lines ?? [];
    const lineTotal = lines.reduce((s, l) => s + l.estimatedHours * l.billableRate, 0);

    return this.prisma.projectAddendum.create({
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
            estimatedHours: l.estimatedHours,
            billableRate: l.billableRate,
            lineTotal: l.estimatedHours * l.billableRate,
            sortOrder: l.sortOrder ?? i,
          })),
        },
      },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });
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
    return this.prisma.projectAddendum.update({
      where: { id },
      data,
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async upsertLines(addendumId: string, lines: UpsertAddendumLineDto[]) {
    await this.findOne(addendumId);

    // Delete lines not in the new set
    const keepIds = lines.map((l) => l.id).filter(Boolean) as string[];
    await this.prisma.projectAddendumLine.deleteMany({
      where: { addendumId, id: { notIn: keepIds } },
    });

    // Upsert each line
    const upserted = await Promise.all(
      lines.map((l, i) =>
        this.prisma.projectAddendumLine.upsert({
          where: { id: l.id ?? '' },
          create: {
            addendumId,
            description: l.description,
            role: l.role,
            estimatedHours: l.estimatedHours,
            billableRate: l.billableRate,
            lineTotal: l.estimatedHours * l.billableRate,
            sortOrder: l.sortOrder ?? i,
          },
          update: {
            description: l.description,
            role: l.role,
            estimatedHours: l.estimatedHours,
            billableRate: l.billableRate,
            lineTotal: l.estimatedHours * l.billableRate,
            sortOrder: l.sortOrder ?? i,
          },
        }),
      ),
    );

    // Recompute total
    const total = upserted.reduce((s, l) => s + l.lineTotal, 0);
    return this.prisma.projectAddendum.update({
      where: { id: addendumId },
      data: { total },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.projectAddendum.delete({ where: { id } });
  }
}
