import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { CreatePtoPolicyDto, UpdatePtoPolicyDto, CreatePtoRequestDto, ReviewPtoRequestDto } from './dto/pto.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class PtoService {
  private readonly logger = new Logger(PtoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Policies ─────────────────────────────────────────────────────────────

  async getAllPolicies() {
    return this.prisma.ptoPolicy.findMany({ orderBy: { name: 'asc' } });
  }

  async createPolicy(dto: CreatePtoPolicyDto) {
    try {
      const policy = await this.prisma.ptoPolicy.create({ data: dto });
      this.logger.log(`[createPolicy] PTO policy created: id=${policy.id}`);
      return policy;
    } catch (error) {
      handlePrismaError(error, this.logger, 'createPolicy.create');
    }
  }

  async updatePolicy(id: string, dto: UpdatePtoPolicyDto) {
    await this.findPolicyOrThrow(id);
    try {
      const policy = await this.prisma.ptoPolicy.update({ where: { id }, data: dto });
      this.logger.log(`[updatePolicy] PTO policy updated: id=${id}`);
      return policy;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updatePolicy.update');
    }
  }

  async deletePolicy(id: string) {
    await this.findPolicyOrThrow(id);
    try {
      const result = await this.prisma.ptoPolicy.delete({ where: { id } });
      this.logger.log(`[deletePolicy] PTO policy deleted: id=${id}`);
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'deletePolicy.delete');
    }
  }

  private async findPolicyOrThrow(id: string) {
    const policy = await this.prisma.ptoPolicy.findUnique({ where: { id } });
    if (!policy) {
      this.logger.warn(`[findPolicyOrThrow] PTO policy not found: id=${id}`);
      throw new NotFoundException(`PTO policy ${id} not found`);
    }
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
    if (end < start) {
      this.logger.warn(`[createRequest] Invalid date range: start=${dto.startDate}, end=${dto.endDate}`);
      throw new BadRequestException('End date must be on or after start date');
    }

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
    }).catch((error: unknown) => {
      handlePrismaError(error, this.logger, 'createRequest.create');
    });

    this.logger.log(`[createRequest] PTO request created: id=${request.id}, userId=${userId}`);

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
    if (!request) {
      this.logger.warn(`[reviewRequest] PTO request not found: id=${requestId}`);
      throw new NotFoundException(`PTO request ${requestId} not found`);
    }
    if (request.status !== 'PENDING') {
      this.logger.warn(`[reviewRequest] Request is not pending: id=${requestId}, status=${request.status}`);
      throw new BadRequestException('Only PENDING requests can be reviewed');
    }
    if (dto.action !== 'APPROVE' && dto.action !== 'DENY') {
      this.logger.warn(`[reviewRequest] Invalid action: ${dto.action}`);
      throw new BadRequestException('Action must be APPROVE or DENY');
    }
    if (request.userId === reviewerId) {
      throw new ForbiddenException('You cannot review your own PTO request');
    }

    const newStatus = dto.action === 'APPROVE' ? 'APPROVED' : 'DENIED';

    let updated: Awaited<ReturnType<typeof this.prisma.ptoRequest.update>>;
    try {
      updated = await this.prisma.ptoRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          approvedById: reviewerId,
          approvedAt: new Date(),
          deniedReason: dto.action === 'DENY' ? (dto.deniedReason ?? null) : null,
        },
      });
      this.logger.log(`[reviewRequest] PTO request reviewed: id=${requestId}, status=${newStatus}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'reviewRequest.update');
    }

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
    if (!request) {
      this.logger.warn(`[cancelRequest] PTO request not found: id=${requestId}`);
      throw new NotFoundException(`PTO request ${requestId} not found`);
    }
    if (request.userId !== userId) throw new ForbiddenException('You can only cancel your own requests');
    if (request.status === 'CANCELLED') {
      this.logger.warn(`[cancelRequest] Request already cancelled: id=${requestId}`);
      throw new BadRequestException('Request is already cancelled');
    }
    if (request.status === 'DENIED') {
      this.logger.warn(`[cancelRequest] Cannot cancel denied request: id=${requestId}`);
      throw new BadRequestException('Cannot cancel a denied request');
    }
    try {
      const result = await this.prisma.ptoRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });
      this.logger.log(`[cancelRequest] PTO request cancelled: id=${requestId}`);
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'cancelRequest.update');
    }
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
