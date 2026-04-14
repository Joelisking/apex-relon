import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { CreatePtoPolicyDto, UpdatePtoPolicyDto, CreatePtoRequestDto, ReviewPtoRequestDto } from './dto/pto.dto';

@Injectable()
export class PtoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Policies ─────────────────────────────────────────────────────────────

  async getAllPolicies() {
    return this.prisma.ptoPolicy.findMany({ orderBy: { name: 'asc' } });
  }

  async createPolicy(dto: CreatePtoPolicyDto) {
    return this.prisma.ptoPolicy.create({ data: dto });
  }

  async updatePolicy(id: string, dto: UpdatePtoPolicyDto) {
    await this.findPolicyOrThrow(id);
    return this.prisma.ptoPolicy.update({ where: { id }, data: dto });
  }

  async deletePolicy(id: string) {
    await this.findPolicyOrThrow(id);
    return this.prisma.ptoPolicy.delete({ where: { id } });
  }

  private async findPolicyOrThrow(id: string) {
    const policy = await this.prisma.ptoPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException(`PTO policy ${id} not found`);
    return policy;
  }

  // ─── Requests ─────────────────────────────────────────────────────────────

  async getRequestsForUser(userId: string) {
    return this.prisma.ptoRequest.findMany({
      where: { userId },
      include: { policy: { select: { id: true, name: true } }, approvedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingRequests() {
    return this.prisma.ptoRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        policy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllRequests(status?: string) {
    return this.prisma.ptoRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { id: true, name: true, role: true } },
        policy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createRequest(userId: string, dto: CreatePtoRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be on or after start date');

    const request = await this.prisma.ptoRequest.create({
      data: {
        userId,
        type: dto.type,
        startDate: start,
        endDate: end,
        hours: dto.hours,
        notes: dto.notes,
        policyId: dto.policyId,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify managers (users who have approved PTO requests before, or all users with managerId === null)
    const managers = await this.prisma.user.findMany({
      where: { managerId: null, id: { not: userId } },
      select: { id: true, notificationPreferences: { select: { ptoUpdate: true } } },
    });

    const notifyDtos = managers
      .filter((m) => m.notificationPreferences?.ptoUpdate !== false)
      .map((manager) => ({
        userId: manager.id,
        type: NotificationType.PTO_REQUESTED,
        title: 'PTO request submitted',
        message: `${request.user.name} submitted a ${dto.type} PTO request (${dto.hours}h)`,
        entityType: 'PTO_REQUEST',
        entityId: request.id,
      }));

    await this.notifications.createMany(notifyDtos);

    return request;
  }

  async reviewRequest(requestId: string, reviewerId: string, dto: ReviewPtoRequestDto) {
    const request = await this.prisma.ptoRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true, notificationPreferences: { select: { ptoUpdate: true } } } } },
    });
    if (!request) throw new NotFoundException(`PTO request ${requestId} not found`);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING requests can be reviewed');
    }
    if (dto.action !== 'APPROVE' && dto.action !== 'DENY') {
      throw new BadRequestException('Action must be APPROVE or DENY');
    }
    if (request.userId === reviewerId) {
      throw new ForbiddenException('You cannot review your own PTO request');
    }

    const newStatus = dto.action === 'APPROVE' ? 'APPROVED' : 'DENIED';

    const updated = await this.prisma.ptoRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        approvedById: reviewerId,
        approvedAt: new Date(),
        deniedReason: dto.action === 'DENY' ? (dto.deniedReason ?? null) : null,
      },
    });

    // Notify the requester if they haven't opted out
    if (request.user.notificationPreferences?.ptoUpdate !== false) {
      const notifType = newStatus === 'APPROVED' ? NotificationType.PTO_APPROVED : NotificationType.PTO_DENIED;
      await this.notifications.create({
        userId: request.userId,
        type: notifType,
        title: `PTO request ${newStatus.toLowerCase()}`,
        message: newStatus === 'APPROVED'
          ? 'Your PTO request has been approved'
          : `Your PTO request was denied${dto.deniedReason ? `: ${dto.deniedReason}` : ''}`,
        entityType: 'PTO_REQUEST',
        entityId: requestId,
      });
    }

    return updated;
  }

  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.ptoRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException(`PTO request ${requestId} not found`);
    if (request.userId !== userId) throw new ForbiddenException('You can only cancel your own requests');
    if (request.status === 'CANCELLED') {
      throw new BadRequestException('Request is already cancelled');
    }
    if (request.status === 'DENIED') {
      throw new BadRequestException('Cannot cancel a denied request');
    }
    return this.prisma.ptoRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });
  }

  async getApprovedForDateRange(startDate: string, endDate: string) {
    return this.prisma.ptoRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: new Date(endDate) },
        endDate:   { gte: new Date(startDate) },
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
