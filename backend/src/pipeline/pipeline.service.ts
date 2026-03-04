import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: string) {
    return this.prisma.pipelineStage.findMany({
      where: type ? { pipelineType: type } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: CreateStageDto) {
    const pipelineType = dto.pipelineType || 'prospective_project';

    // Auto-assign sortOrder within the same type
    if (dto.sortOrder === undefined) {
      const maxOrder = await this.prisma.pipelineStage.aggregate({
        where: { pipelineType },
        _max: { sortOrder: true },
      });
      dto.sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    return this.prisma.pipelineStage.create({
      data: {
        name: dto.name,
        pipelineType,
        color: dto.color,
        lightColor: dto.lightColor,
        border: dto.border,
        probability: dto.probability,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async update(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) {
      throw new BadRequestException('Stage not found');
    }

    if (stage.isSystem) {
      throw new BadRequestException('System stages cannot be modified');
    }

    return this.prisma.pipelineStage.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) {
      throw new BadRequestException('Stage not found');
    }

    if (stage.isSystem) {
      throw new BadRequestException('System stages cannot be deleted');
    }

    if (stage.pipelineType === 'project') {
      const count = await this.prisma.project.count({
        where: { status: stage.name },
      });
      if (count > 0) {
        throw new BadRequestException(
          `Cannot delete stage "${stage.name}" — ${count} project(s) are currently in this stage`,
        );
      }
    } else {
      const count = await this.prisma.lead.count({
        where: { stage: stage.name },
      });
      if (count > 0) {
        throw new BadRequestException(
          `Cannot delete stage "${stage.name}" — ${count} lead(s) are currently in this stage`,
        );
      }
    }

    return this.prisma.pipelineStage.delete({ where: { id } });
  }

  async reorder(dto: ReorderStagesDto) {
    const updates = dto.stages.map((s) =>
      this.prisma.pipelineStage.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.findAll();
  }
}
