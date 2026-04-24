import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ProjectsAssignmentService {
  private readonly logger = new Logger(ProjectsAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAssignments(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    return this.prisma.projectAssignment.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addAssignment(projectId: string, dto: CreateProjectAssignmentDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    try {
      const assignment = await this.prisma.projectAssignment.upsert({
        where: { projectId_userId: { projectId, userId: dto.userId } },
        create: { projectId, userId: dto.userId, role: dto.role },
        update: { role: dto.role },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      this.logger.log(`Assignment upserted: user ${dto.userId} on project ${projectId}`);
      return assignment;
    } catch (error) {
      handlePrismaError(error, this.logger, 'addAssignment.upsert');
    }
  }

  async removeAssignment(projectId: string, assignmentId: string) {
    const assignment = await this.prisma.projectAssignment.findFirst({
      where: { id: assignmentId, projectId },
    });
    if (!assignment) {
      this.logger.warn(`removeAssignment: Assignment ${assignmentId} not found on project ${projectId}`);
      throw new NotFoundException(`Assignment not found`);
    }

    try {
      await this.prisma.projectAssignment.delete({ where: { id: assignmentId } });
    } catch (error) {
      handlePrismaError(error, this.logger, 'removeAssignment.delete');
    }
    this.logger.log(`Assignment ${assignmentId} removed from project ${projectId}`);
    return { message: 'Assignment removed' };
  }
}
