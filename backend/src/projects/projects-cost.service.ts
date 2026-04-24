import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCostLogDto } from './dto/create-cost-log.dto';
import { ProjectsProfitabilityService } from './projects-profitability.service';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ProjectsCostService {
  private readonly logger = new Logger(ProjectsCostService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profitabilityService: ProjectsProfitabilityService,
  ) {}

  async getCostLogs(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return this.prisma.costLog.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async addCostLog(projectId: string, dto: CreateCostLogDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    let costLog: Awaited<ReturnType<typeof this.prisma.costLog.create>>;
    try {
      costLog = await this.prisma.costLog.create({
        data: {
          projectId,
          date: new Date(dto.date),
          category: dto.category,
          description: dto.description,
          amount: dto.amount,
          createdBy: userId,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'addCostLog.create');
    }
    this.logger.log(`Cost log created for project ${projectId}`);

    await this.profitabilityService.recalculateProjectCost(projectId);

    return costLog;
  }

  async removeCostLog(projectId: string, costId: string) {
    const costLog = await this.prisma.costLog.findFirst({
      where: { id: costId, projectId },
    });

    if (!costLog) {
      this.logger.warn(`removeCostLog: Cost log ${costId} not found on project ${projectId}`);
      throw new NotFoundException(`Cost log not found`);
    }

    try {
      await this.prisma.costLog.delete({ where: { id: costId } });
    } catch (error) {
      handlePrismaError(error, this.logger, 'removeCostLog.delete');
    }
    this.logger.log(`Cost log ${costId} deleted from project ${projectId}`);

    await this.profitabilityService.recalculateProjectCost(projectId);

    return { message: 'Cost log deleted successfully' };
  }
}
