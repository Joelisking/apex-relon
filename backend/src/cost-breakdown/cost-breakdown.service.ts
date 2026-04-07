import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCostBreakdownDto } from './dto/create-cost-breakdown.dto';
import { UpdateCostBreakdownDto } from './dto/update-cost-breakdown.dto';
import { UpsertRoleEstimateDto } from './dto/upsert-role-estimate.dto';

const LINE_INCLUDE = {
  serviceItem: {
    include: {
      subtasks: { orderBy: { sortOrder: 'asc' as const } },
    },
  },
  roleEstimates: { orderBy: { role: 'asc' as const } },
};

@Injectable()
export class CostBreakdownService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const breakdowns = await this.prisma.costBreakdown.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        serviceType: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        lead: { select: { id: true, company: true, contactName: true } },
        lines: {
          include: {
            roleEstimates: true,
          },
        },
      },
    });

    return breakdowns.map((b) => ({
      ...b,
      totalEstimatedHours: b.lines.flatMap((l) => l.roleEstimates).reduce((s, r) => s + r.estimatedHours, 0),
      totalEstimatedCost: b.lines
        .flatMap((l) => l.roleEstimates)
        .reduce((s, r) => (r.hourlyRate != null ? s + r.estimatedHours * r.hourlyRate : s), 0),
    }));
  }

  async findOne(id: string, tenantId: string) {
    const breakdown = await this.prisma.costBreakdown.findFirst({
      where: { id, tenantId },
      include: {
        serviceType: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        lead: { select: { id: true, company: true, contactName: true } },
        createdBy: { select: { id: true, name: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: LINE_INCLUDE,
        },
      },
    });

    if (!breakdown) throw new NotFoundException('Cost breakdown not found');
    return this.withTotals(breakdown);
  }

  async create(dto: CreateCostBreakdownDto, tenantId: string, userId: string) {
    const breakdown = await this.prisma.costBreakdown.create({
      data: {
        tenantId,
        createdById: userId,
        title: dto.title,
        serviceTypeId: dto.serviceTypeId,
        projectId: dto.projectId,
        leadId: dto.leadId,
        notes: dto.notes,
        status: 'DRAFT',
      },
    });

    // Auto-populate lines from ServiceItems linked to this ServiceType
    if (dto.serviceTypeId) {
      const serviceItems = await this.prisma.serviceItem.findMany({
        where: {
          serviceTypeIds: { has: dto.serviceTypeId },
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      for (let i = 0; i < serviceItems.length; i++) {
        await this.prisma.costBreakdownLine.create({
          data: {
            costBreakdownId: breakdown.id,
            serviceItemId: serviceItems[i].id,
            sortOrder: i,
          },
        });
      }
    }

    return this.findOne(breakdown.id, tenantId);
  }

  async update(id: string, dto: UpdateCostBreakdownDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.costBreakdown.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.costBreakdown.delete({ where: { id } });
  }

  async upsertRoleEstimate(lineId: string, dto: UpsertRoleEstimateDto, tenantId: string) {
    // Verify line belongs to a breakdown in this tenant
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) throw new NotFoundException('Cost breakdown line not found');

    return this.prisma.costBreakdownRoleEstimate.upsert({
      where: { lineId_role: { lineId, role: dto.role } },
      update: { estimatedHours: dto.estimatedHours, hourlyRate: dto.hourlyRate },
      create: { lineId, role: dto.role, estimatedHours: dto.estimatedHours, hourlyRate: dto.hourlyRate },
    });
  }

  async deleteRoleEstimate(lineId: string, role: string, tenantId: string) {
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) throw new NotFoundException('Cost breakdown line not found');

    return this.prisma.costBreakdownRoleEstimate.delete({
      where: { lineId_role: { lineId, role } },
    });
  }

  private withTotals(breakdown: any) {
    const allEstimates = breakdown.lines.flatMap((l: any) => l.roleEstimates);
    return {
      ...breakdown,
      totalEstimatedHours: allEstimates.reduce((s: number, r: any) => s + r.estimatedHours, 0),
      totalEstimatedCost: allEstimates.reduce(
        (s: number, r: any) => (r.hourlyRate != null ? s + r.estimatedHours * r.hourlyRate : s),
        0,
      ),
      hasUnratedLines: allEstimates.some((r: any) => r.hourlyRate == null),
    };
  }
}
