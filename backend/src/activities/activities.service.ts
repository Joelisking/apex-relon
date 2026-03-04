import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  // ==================== LEAD ACTIVITIES ====================

  async createActivity(
    leadId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ) {
    // Validate meeting type is provided for meetings
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

    return this.prisma.activity.create({
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
    // Verify the activity belongs to the user
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      throw new BadRequestException('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new BadRequestException('You can only delete your own activities');
    }

    return this.prisma.activity.delete({
      where: { id: activityId },
    });
  }

  // ==================== CLIENT ACTIVITIES ====================

  async createActivityForClient(
    clientId: string,
    userId: string,
    createActivityDto: CreateActivityDto,
  ) {
    // Validate meeting type is provided for meetings
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

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

    // Update client's lastContactDate
    await this.prisma.client.update({
      where: { id: clientId },
      data: { lastContactDate: new Date() },
    });

    return activity;
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
    // Validate meeting type is provided for meetings
    if (createActivityDto.type === 'meeting' && !createActivityDto.meetingType) {
      throw new BadRequestException('meetingType is required for meeting activities');
    }

    return this.prisma.activity.create({
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
