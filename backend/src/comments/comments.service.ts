import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types.constants';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

const MENTION_RE = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;

function extractMentions(content: string): string[] {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(content)) !== null) {
    ids.push(match[2]);
  }
  return [...new Set(ids)];
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAllForProject(projectId: string) {
    return this.prisma.projectComment.findMany({
      where: { projectId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(projectId: string, authorId: string, dto: CreateCommentDto) {
    const mentionedIds = dto.mentionedIds ?? extractMentions(dto.content);

    const comment = await this.prisma.projectComment.create({
      data: {
        projectId,
        authorId,
        content: dto.content,
        mentionedIds,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    // Get the project name for the notification message
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    // Notify mentioned users (filter out author)
    const toNotify = mentionedIds.filter((id) => id !== authorId);
    if (toNotify.length > 0 && project) {
      const prefs = await this.prisma.notificationPreference.findMany({
        where: { userId: { in: toNotify } },
        select: { userId: true, commentMention: true },
      });
      const prefMap = new Map(prefs.map((p) => [p.userId, p.commentMention]));

      const dtos = toNotify
        .filter((id) => prefMap.get(id) !== false)
        .map((userId) => ({
          userId,
          type: NotificationType.COMMENT_MENTION,
          title: `You were mentioned in a comment`,
          message: `${comment.author.name} mentioned you on project "${project.name}"`,
          entityType: 'PROJECT',
          entityId: projectId,
        }));

      await this.notifications.createMany(dtos);
    }

    return comment;
  }

  async update(commentId: string, requesterId: string, dto: UpdateCommentDto) {
    const existing = await this.prisma.projectComment.findUnique({ where: { id: commentId } });
    if (!existing) throw new NotFoundException(`Comment ${commentId} not found`);
    if (existing.authorId !== requesterId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    return this.prisma.projectComment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async delete(commentId: string, requesterId: string) {
    const existing = await this.prisma.projectComment.findUnique({ where: { id: commentId } });
    if (!existing) throw new NotFoundException(`Comment ${commentId} not found`);
    if (existing.authorId !== requesterId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    return this.prisma.projectComment.delete({ where: { id: commentId } });
  }
}
