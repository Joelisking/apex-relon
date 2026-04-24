import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(type?: string, jobType?: string) {
    if (type === 'project' && jobType) {
      return this.prisma.pipelineStage.findMany({
        where: {
          pipelineType: 'project',
          jobType: { in: ['__all__', jobType] },
        },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return this.prisma.pipelineStage.findMany({
      where: type ? { pipelineType: type, jobType: '__all__' } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByJobType(jobType: string) {
    return this.prisma.pipelineStage.findMany({
      where: { pipelineType: 'project', jobType },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: CreateStageDto) {
    const pipelineType = dto.pipelineType || 'prospective_project';
    const jobType = dto.jobType || '__all__';

    if (dto.sortOrder === undefined) {
      const maxOrder = await this.prisma.pipelineStage.aggregate({
        where: { pipelineType, jobType },
        _max: { sortOrder: true },
      });
      dto.sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    }

    try {
      const stage = await this.prisma.pipelineStage.create({
        data: {
          name: dto.name,
          pipelineType,
          jobType,
          color: dto.color,
          lightColor: dto.lightColor,
          border: dto.border,
          probability: dto.probability,
          sortOrder: dto.sortOrder,
        },
      });
      this.logger.log(`Pipeline stage created: ${stage.id} "${stage.name}" (${pipelineType})`);
      return stage;
    } catch (error) {
      handlePrismaError(error, this.logger, 'PipelineService.create');
    }
  }

  async update(id: string, dto: UpdateStageDto) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) {
      this.logger.warn(`Pipeline stage ${id} not found for update`);
      throw new BadRequestException('Stage not found');
    }

    try {
      const updated = await this.prisma.pipelineStage.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Pipeline stage updated: ${id}`);
      return updated;
    } catch (error) {
      handlePrismaError(error, this.logger, 'PipelineService.update');
    }
  }

  async remove(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({ where: { id } });
    if (!stage) {
      this.logger.warn(`Pipeline stage ${id} not found for deletion`);
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

    try {
      const deleted = await this.prisma.pipelineStage.delete({ where: { id } });
      this.logger.log(`Pipeline stage deleted: ${id} "${stage.name}"`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'PipelineService.remove');
    }
  }

  async reorder(dto: ReorderStagesDto) {
    const updates = dto.stages.map((s) =>
      this.prisma.pipelineStage.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder },
      }),
    );

    try {
      await this.prisma.$transaction(updates);
      this.logger.log(`Pipeline stages reordered: ${dto.stages.length} stage(s)`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'PipelineService.reorder');
    }

    return this.findAll();
  }
}
