import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';

interface LogAuditParams {
  userId: string;
  action: string;
  targetUserId?: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(params: LogAuditParams) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        targetUserId: params.targetUserId,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * Get audit logs for a specific user (as actor or target)
   */
  async getLogsForUser(userId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [{ userId }, { targetUserId: userId }],
      },
      include: {
        user: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all audit logs (admin only)
   */
  async getAllLogs(limit = 100) {
    return this.prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true, role: true } },
        targetUser: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { action },
      include: {
        user: { select: { name: true, email: true, role: true } },
        targetUser: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
