import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== LEAD ACTIVITIES ====================

  async createActivity(
    leadId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ) {
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

    try {
      const activity = await this.prisma.activity.create({
        data: {
          leadId,
          userId,
          type: createActivityDto.type,
          activityDate: new Date(createActivityDto.activityDate),
          activityTime: createActivityDto.activityTime,
          reason: createActivityDto.reason,
          notes: createActivityDto.notes,
          meetingType: createActivityDto.meetingType,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      this.logger.log(`Activity created for lead ${leadId} by user ${userId}`);
      return activity;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createActivity.create');
    }
  }

  async getActivitiesByLead(leadId: string) {
    return this.prisma.activity.findMany({
      where: { leadId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { activityDate: 'desc' },
        { activityTime: 'desc' },
      ],
    });
  }

  async deleteActivity(activityId: string, userId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      this.logger.warn(`deleteActivity: activity ${activityId} not found`);
      throw new BadRequestException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new BadRequestException('You can only delete your own activities');
    }

    try {
      const deleted = await this.prisma.activity.delete({
        where: { id: activityId },
      });
      this.logger.log(`Activity ${activityId} deleted by user ${userId}`);
      return deleted;
    } catch (error) {
      handlePrismaError(error, this.logger, 'deleteActivity.delete');
    }
  }

  // ==================== CLIENT ACTIVITIES ====================

  async createActivityForClient(
    clientId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ) {
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

    try {
      const activity = await this.prisma.activity.create({
        data: {
          clientId,
          userId,
          type: createActivityDto.type,
          activityDate: new Date(createActivityDto.activityDate),
          activityTime: createActivityDto.activityTime,
          reason: createActivityDto.reason,
          notes: createActivityDto.notes,
          meetingType: createActivityDto.meetingType,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      this.logger.log(`Activity created for client ${clientId} by user ${userId}`);

      await this.prisma.client.update({
        where: { id: clientId },
        data: { lastContactDate: new Date() },
      });

      return activity;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createActivityForClient.create');
    }
  }

  async getActivitiesByClient(clientId: string) {
    return this.prisma.activity.findMany({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { activityDate: 'desc' },
        { activityTime: 'desc' },
      ],
    });
  }

  // ==================== PROJECT ACTIVITIES ====================

  async createActivityForProject(
    projectId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ) {
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

    try {
      const activity = await this.prisma.activity.create({
        data: {
          projectId,
          userId,
          type: createActivityDto.type,
          activityDate: new Date(createActivityDto.activityDate),
          activityTime: createActivityDto.activityTime,
          reason: createActivityDto.reason,
          notes: createActivityDto.notes,
          meetingType: createActivityDto.meetingType,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      this.logger.log(`Activity created for project ${projectId} by user ${userId}`);
      return activity;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createActivityForProject.create');
    }
  }

  async getActivitiesByProject(projectId: string) {
    return this.prisma.activity.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { activityDate: 'desc' },
        { activityTime: 'desc' },
      ],
    });
  }
}
