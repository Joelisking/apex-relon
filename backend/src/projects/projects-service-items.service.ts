import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AddProjectServiceItemDto } from './dto/add-project-service-item.dto';
import { UpdateProjectServiceItemDto } from './dto/update-project-service-item.dto';

@Injectable()
export class ProjectsServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectServiceItems(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    return this.prisma.projectServiceItem.findMany({
      where: { projectId },
      include: { serviceItem: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async addProjectServiceItem(projectId: string, dto: AddProjectServiceItemDto) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const serviceItem = await this.prisma.serviceItem.findUnique({
      where: { id: dto.serviceItemId },
    });
    if (!serviceItem) {
      throw new NotFoundException(`ServiceItem ${dto.serviceItemId} not found`);
    }

    return this.prisma.projectServiceItem.create({
      data: {
        projectId,
        serviceItemId: dto.serviceItemId,
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice ?? null,
        notes: dto.notes ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { serviceItem: true },
    });
  }

  async updateProjectServiceItem(
    projectId: string,
    linkId: string,
    dto: UpdateProjectServiceItemDto,
  ) {
    const link = await this.prisma.projectServiceItem.findFirst({
      where: { id: linkId, projectId },
    });
    if (!link) throw new NotFoundException(`Service item link not found`);

    return this.prisma.projectServiceItem.update({
      where: { id: linkId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: { serviceItem: true },
    });
  }

  async removeProjectServiceItem(projectId: string, linkId: string) {
    const link = await this.prisma.projectServiceItem.findFirst({
      where: { id: linkId, projectId },
    });
    if (!link) throw new NotFoundException(`Service item link not found`);

    await this.prisma.projectServiceItem.delete({ where: { id: linkId } });
  }
}
