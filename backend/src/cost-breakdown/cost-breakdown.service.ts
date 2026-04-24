import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateCostBreakdownDto } from './dto/create-cost-breakdown.dto';
import { UpdateCostBreakdownDto } from './dto/update-cost-breakdown.dto';
import { UpsertRoleEstimateDto } from './dto/upsert-role-estimate.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

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
  private readonly logger = new Logger(CostBreakdownService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filters?: { leadId?: string; projectId?: string }) {
    const where: Record<string, unknown> = { tenantId };
    if (filters?.leadId) where.leadId = filters.leadId;
    if (filters?.projectId) where.projectId = filters.projectId;
    const breakdowns = await this.prisma.costBreakdown.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        jobType: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        lead: { select: { id: true, company: true, contactName: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: LINE_INCLUDE,
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
        jobType: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        lead: { select: { id: true, company: true, contactName: true } },
        createdBy: { select: { id: true, name: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: LINE_INCLUDE,
        },
      },
    });

    if (!breakdown) {
      this.logger.warn(`[findOne] Cost breakdown not found: id=${id}`);
      throw new NotFoundException('Cost breakdown not found');
    }
    return this.withTotals(breakdown);
  }

  async create(dto: CreateCostBreakdownDto, tenantId: string, userId: string) {
    let breakdown: Awaited<ReturnType<typeof this.prisma.costBreakdown.create>>;
    try {
      breakdown = await this.prisma.costBreakdown.create({
        data: {
          tenantId,
          createdById: userId,
          title: dto.title,
          jobTypeId: dto.jobTypeId,
          projectId: dto.projectId,
          leadId: dto.leadId,
          notes: dto.notes,
          status: 'DRAFT',
        },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'create.costBreakdown');
    }

    if (dto.templateId) {
      const tmpl = await this.prisma.costBreakdown.findFirst({
        where: { id: dto.templateId, tenantId },
        include: { lines: { include: LINE_INCLUDE, orderBy: { sortOrder: 'asc' } } },
      });
      if (tmpl) {
        for (const tl of tmpl.lines) {
          let newLine: Awaited<ReturnType<typeof this.prisma.costBreakdownLine.create>>;
          try {
            newLine = await this.prisma.costBreakdownLine.create({
              data: {
                costBreakdownId: breakdown.id,
                serviceItemId: tl.serviceItemId,
                sortOrder: tl.sortOrder,
                excludedSubtaskIds: tl.excludedSubtaskIds,
              },
            });
          } catch (error) {
            handlePrismaError(error, this.logger, 'create.templateLine');
          }
          for (const est of tl.roleEstimates) {
            try {
              await this.prisma.costBreakdownRoleEstimate.create({
                data: {
                  lineId: newLine.id,
                  subtaskId: est.subtaskId,
                  role: est.role,
                  estimatedHours: est.estimatedHours,
                  hourlyRate: est.hourlyRate,
                },
              });
            } catch (error) {
              handlePrismaError(error, this.logger, 'create.templateRoleEstimate');
            }
          }
        }
        try {
          await this.prisma.costBreakdown.update({
            where: { id: breakdown.id },
            data: {
              mileageRate: tmpl.mileageRate,
              lodgingRate: tmpl.lodgingRate,
              perDiemRate: tmpl.perDiemRate,
            },
          });
        } catch (error) {
          handlePrismaError(error, this.logger, 'create.copyRates');
        }
      }
    } else if (dto.jobTypeId) {
      const serviceItems = await this.prisma.serviceItem.findMany({
        where: {
          jobTypeIds: { has: dto.jobTypeId },
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
      });

      for (let i = 0; i < serviceItems.length; i++) {
        try {
          await this.prisma.costBreakdownLine.create({
            data: {
              costBreakdownId: breakdown.id,
              serviceItemId: serviceItems[i].id,
              sortOrder: i,
            },
          });
        } catch (error) {
          handlePrismaError(error, this.logger, 'create.autoLine');
        }
      }
    }

    const result = await this.findOne(breakdown.id, tenantId);
    this.logger.log(`[create] Cost breakdown created: id=${breakdown.id}`);

    if (dto.projectId) {
      await this.syncProjectServiceItems(breakdown.id, dto.projectId);
    }

    return result;
  }

  async update(id: string, dto: UpdateCostBreakdownDto, tenantId: string) {
    const breakdown = await this.findOne(id, tenantId);
    if (dto.isTemplate && breakdown.jobTypeId) {
      await this.prisma.costBreakdown.updateMany({
        where: { tenantId, jobTypeId: breakdown.jobTypeId as string, isTemplate: true, id: { not: id } },
        data: { isTemplate: false },
      });
    }
    const { roleDisplayNames, ...rest } = dto;
    const data: Prisma.CostBreakdownUpdateInput = { ...rest };
    const sanitized = this.sanitizeRoleDisplayNames(roleDisplayNames);
    if (sanitized !== undefined) {
      data.roleDisplayNames = sanitized;
    }
    let updated: Awaited<ReturnType<typeof this.prisma.costBreakdown.update>>;
    try {
      updated = await this.prisma.costBreakdown.update({
        where: { id },
        data,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'update.costBreakdown');
    }
    this.logger.log(`[update] Cost breakdown updated: id=${id}`);
    if (dto.projectId) {
      await this.syncProjectServiceItems(id, dto.projectId);
    }
    return updated;
  }

  private sanitizeRoleDisplayNames(
    input: Record<string, string> | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (input === undefined) return undefined;
    if (input === null) return Prisma.JsonNull;
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed) cleaned[key] = trimmed;
    }
    return Object.keys(cleaned).length === 0 ? Prisma.JsonNull : cleaned;
  }

  async addLine(costBreakdownId: string, serviceItemId: string, tenantId: string) {
    const breakdown = await this.findOne(costBreakdownId, tenantId);

    const existing = breakdown.lines.find((l: any) => l.serviceItemId === serviceItemId);
    if (existing) return existing;

    const sortOrder = breakdown.lines.length;
    let line: Awaited<ReturnType<typeof this.prisma.costBreakdownLine.create>>;
    try {
      line = await this.prisma.costBreakdownLine.create({
        data: { costBreakdownId, serviceItemId, sortOrder },
        include: LINE_INCLUDE,
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'addLine.create');
    }
    this.logger.log(`[addLine] Line added to breakdown id=${costBreakdownId}, serviceItemId=${serviceItemId}`);

    if (breakdown.projectId) {
      await this.addProjectServiceItem(breakdown.projectId as string, serviceItemId);
    }

    return line;
  }

  async syncProjectServiceItems(costBreakdownId: string, projectId: string) {
    const lines = await this.prisma.costBreakdownLine.findMany({
      where: { costBreakdownId },
      select: { serviceItemId: true },
    });

    for (const line of lines) {
      await this.addProjectServiceItem(projectId, line.serviceItemId);
    }
  }

  private async addProjectServiceItem(projectId: string, serviceItemId: string) {
    const existing = await this.prisma.projectServiceItem.findFirst({
      where: { projectId, serviceItemId },
    });
    if (!existing) {
      try {
        await this.prisma.projectServiceItem.create({
          data: { projectId, serviceItemId },
        });
      } catch (error) {
        handlePrismaError(error, this.logger, 'addProjectServiceItem.create');
      }
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    try {
      const result = await this.prisma.costBreakdown.delete({ where: { id } });
      this.logger.log(`[remove] Cost breakdown deleted: id=${id}`);
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'remove.delete');
    }
  }

  async upsertRoleEstimate(lineId: string, dto: UpsertRoleEstimateDto, tenantId: string) {
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) {
      this.logger.warn(`[upsertRoleEstimate] Cost breakdown line not found: id=${lineId}`);
      throw new NotFoundException('Cost breakdown line not found');
    }

    const { subtaskId, role, estimatedHours, hourlyRate } = dto;
    let result: Awaited<ReturnType<typeof this.prisma.costBreakdownRoleEstimate.upsert>>;
    try {
      result = await this.prisma.costBreakdownRoleEstimate.upsert({
        where: { lineId_subtaskId_role: { lineId, subtaskId, role } },
        update: { estimatedHours, hourlyRate },
        create: { lineId, subtaskId, role, estimatedHours, hourlyRate },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'upsertRoleEstimate.upsert');
    }
    this.logger.log(`[upsertRoleEstimate] Role estimate upserted: lineId=${lineId}, role=${role}`);

    await this.syncLeadExpectedValue(line.costBreakdownId);
    return result;
  }

  async updateLine(lineId: string, dto: { excludedSubtaskIds?: string[] }, tenantId: string) {
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) {
      this.logger.warn(`[updateLine] Cost breakdown line not found: id=${lineId}`);
      throw new NotFoundException('Cost breakdown line not found');
    }

    try {
      const result = await this.prisma.costBreakdownLine.update({
        where: { id: lineId },
        data: dto,
      });
      this.logger.log(`[updateLine] Line updated: id=${lineId}`);
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateLine.update');
    }
  }

  async deleteLine(lineId: string, tenantId: string) {
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) {
      this.logger.warn(`[deleteLine] Cost breakdown line not found: id=${lineId}`);
      throw new NotFoundException('Cost breakdown line not found');
    }
    let result: Awaited<ReturnType<typeof this.prisma.costBreakdownLine.delete>>;
    try {
      result = await this.prisma.costBreakdownLine.delete({ where: { id: lineId } });
      this.logger.log(`[deleteLine] Line deleted: id=${lineId}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteLine.delete');
    }
    await this.syncLeadExpectedValue(line.costBreakdownId);
    return result;
  }

  async deleteRoleEstimate(lineId: string, subtaskId: string, role: string, tenantId: string) {
    const line = await this.prisma.costBreakdownLine.findFirst({
      where: { id: lineId, costBreakdown: { tenantId } },
    });
    if (!line) {
      this.logger.warn(`[deleteRoleEstimate] Cost breakdown line not found: id=${lineId}`);
      throw new NotFoundException('Cost breakdown line not found');
    }

    let result: Awaited<ReturnType<typeof this.prisma.costBreakdownRoleEstimate.delete>>;
    try {
      result = await this.prisma.costBreakdownRoleEstimate.delete({
        where: { lineId_subtaskId_role: { lineId, subtaskId, role } },
      });
      this.logger.log(`[deleteRoleEstimate] Role estimate deleted: lineId=${lineId}, role=${role}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteRoleEstimate.delete');
    }
    await this.syncLeadExpectedValue(line.costBreakdownId);
    return result;
  }

  private async syncLeadExpectedValue(costBreakdownId: string): Promise<void> {
    const breakdown = await this.prisma.costBreakdown.findUnique({
      where: { id: costBreakdownId },
      select: {
        leadId: true,
        lines: { include: { roleEstimates: true } },
      },
    });

    if (!breakdown?.leadId) return;

    const total = breakdown.lines
      .flatMap((l) => l.roleEstimates)
      .reduce((s, r) => (r.hourlyRate != null ? s + r.estimatedHours * r.hourlyRate : s), 0);

    if (total > 0) {
      try {
        await this.prisma.lead.update({
          where: { id: breakdown.leadId },
          data: { expectedValue: total },
        });
      } catch (error) {
        handlePrismaError(error, this.logger, 'syncLeadExpectedValue.update');
      }
    }
  }

  async getTemplateForJobType(jobTypeId: string, tenantId: string) {
    const tmpl = await this.prisma.costBreakdown.findFirst({
      where: { tenantId, jobTypeId, isTemplate: true },
      include: {
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: LINE_INCLUDE,
        },
      },
    });
    return tmpl ?? null;
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
