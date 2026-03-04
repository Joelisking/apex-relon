import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateCostLogDto } from './dto/create-cost-log.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private workflowsService: WorkflowsService,
  ) {}

  private readonly projectInclude = {
    client: { select: { id: true, name: true } },
    lead: { select: { id: true, contactName: true, company: true } },
    projectManager: { select: { id: true, name: true, email: true } },
    designer: { select: { id: true, name: true, email: true } },
    qs: { select: { id: true, name: true, email: true } },
    statusHistory: {
      orderBy: { createdAt: 'asc' as const },
      include: { user: { select: { name: true } } },
    },
  };

  /**
   * List all projects (role-filtered)
   */
  async findAll(userId: string, userRole: string) {
    const where: Record<string, unknown> = {};

    // Role-based filtering
    if (userRole === 'SALES') {
      where.projectManagerId = userId;
    } else if (userRole === 'DESIGNER') {
      where.designerId = userId;
    } else if (userRole === 'QS') {
      where.qsId = userId;
    }

    return this.prisma.project.findMany({
      where,
      include: this.projectInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto, userId?: string) {
    const { clientId, leadId, status, ...projectData } =
      createProjectDto;

    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(
        `Client with ID ${clientId} not found`,
      );
    }

    // If leadId provided, verify it exists
    if (leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new NotFoundException(
          `Lead with ID ${leadId} not found`,
        );
      }
    }

    // Create project
    const project = await this.prisma.project.create({
      data: {
        ...projectData,
        clientId,
        leadId: leadId || null,
        status,
      },
      include: this.projectInclude,
    });

    // Update client project counts
    await this.updateClientProjectCounts(clientId);

    // Record initial status in history
    if (userId) {
      await this.prisma.projectStatusHistory.create({
        data: {
          projectId: project.id,
          fromStatus: null,
          toStatus: project.status,
          changedBy: userId,
        },
      });
    }

    // Audit log
    await this.auditService.log({
      userId: createProjectDto.projectManagerId || userId || 'system',
      action: 'CREATE_PROJECT',
      details: {
        projectId: project.id,
        projectName: project.name,
        clientId: project.clientId,
        clientName: client.name,
        contractedValue: project.contractedValue,
        status: project.status,
      },
    });

    this.workflowsService.triggerRules(
      'PROJECT_CREATED',
      'PROJECT',
      project.id,
      project as unknown as Record<string, unknown>,
    );

    return project;
  }

  /**
   * Get all projects for a client
   */
  async findByClient(clientId: string) {
    return this.prisma.project.findMany({
      where: { clientId },
      include: this.projectInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single project by ID
   */
  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        lead: true,
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        designer: {
          select: { id: true, name: true, email: true },
        },
        qs: {
          select: { id: true, name: true, email: true },
        },
        costLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { date: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  /**
   * Update a project
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId?: string,
  ) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: this.projectInclude,
    });

    // Update client project counts if status changed
    if (
      updateProjectDto.status &&
      updateProjectDto.status !== existingProject.status
    ) {
      await this.updateClientProjectCounts(existingProject.clientId);

      // Record status change in history
      if (userId) {
        await this.prisma.projectStatusHistory.create({
          data: {
            projectId: id,
            fromStatus: existingProject.status,
            toStatus: updateProjectDto.status,
            changedBy: userId,
          },
        });
      }
    }

    // Audit log
    await this.auditService.log({
      userId: userId || 'system',
      action: 'UPDATE_PROJECT',
      details: {
        projectId: id,
        projectName: project.name,
        updates: updateProjectDto as unknown as Prisma.InputJsonValue,
      },
    });

    if (
      updateProjectDto.status &&
      updateProjectDto.status !== existingProject.status
    ) {
      this.workflowsService.triggerRules(
        'PROJECT_STATUS_CHANGED',
        'PROJECT',
        project.id,
        project as unknown as Record<string, unknown>,
      );
    } else {
      this.workflowsService.triggerRules(
        'PROJECT_UPDATED',
        'PROJECT',
        project.id,
        project as unknown as Record<string, unknown>,
      );
    }

    return project;
  }

  /**
   * Delete a project
   */
  async remove(id: string, userId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    await this.prisma.project.delete({
      where: { id },
    });

    // Update client project counts
    await this.updateClientProjectCounts(project.clientId);

    // Audit log
    await this.auditService.log({
      userId: userId || 'system',
      action: 'DELETE_PROJECT',
      details: {
        projectId: id,
        projectName: project.name,
        clientId: project.clientId,
        clientName: project.client?.name,
        contractedValue: project.contractedValue,
      },
    });

    return { message: 'Project deleted successfully' };
  }

  /**
   * Convert a won lead to a project
   */
  async convertLead(
    leadId: string,
    clientId: string,
    projectManagerId?: string,
    userId?: string,
  ) {
    // Verify lead exists and is Won
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    if (lead.stage !== 'Won') {
      throw new BadRequestException(
        'Only Won leads can be converted to projects',
      );
    }

    // Verify client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(
        `Client with ID ${clientId} not found`,
      );
    }

    // Check if project already exists for this lead
    const existingProject = await this.prisma.project.findFirst({
      where: { leadId },
    });

    if (existingProject) {
      throw new BadRequestException(
        'A project already exists for this lead',
      );
    }

    // Create project from lead
    const project = await this.prisma.project.create({
      data: {
        name: `${lead.company} - ${lead.projectName || 'Project'}`,
        clientId,
        leadId,
        status: 'Planning',
        contractedValue: lead.contractedValue ?? lead.expectedValue,
        description: lead.notes || undefined,
        projectManagerId:
          projectManagerId || lead.assignedToId || undefined,
        designerId: lead.designerId || undefined,
        qsId: lead.qsId || undefined,
      },
      include: this.projectInclude,
    });

    // Update lead to mark it as converted
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { convertedToClientId: clientId },
    });

    // Update client project counts
    await this.updateClientProjectCounts(clientId);

    // Record initial status in history
    if (userId) {
      await this.prisma.projectStatusHistory.create({
        data: {
          projectId: project.id,
          fromStatus: null,
          toStatus: project.status,
          changedBy: userId,
        },
      });
    }

    return project;
  }

  // --- Cost Logs ---

  async getCostLogs(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found`,
      );
    }

    return this.prisma.costLog.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async addCostLog(
    projectId: string,
    dto: CreateCostLogDto,
    userId: string,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(
        `Project with ID ${projectId} not found`,
      );
    }

    const costLog = await this.prisma.costLog.create({
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

    // Recalculate totalCost
    await this.recalculateTotalCost(projectId);

    return costLog;
  }

  async removeCostLog(projectId: string, costId: string) {
    const costLog = await this.prisma.costLog.findFirst({
      where: { id: costId, projectId },
    });

    if (!costLog) {
      throw new NotFoundException(`Cost log not found`);
    }

    await this.prisma.costLog.delete({ where: { id: costId } });

    // Recalculate totalCost
    await this.recalculateTotalCost(projectId);

    return { message: 'Cost log deleted successfully' };
  }

  async bulkUpdate(
    ids: string[],
    data: Record<string, unknown>,
    userId?: string,
  ) {
    if (!ids || ids.length === 0) return { count: 0 };

    // When a status change is requested we need per-row side-effects:
    // recording ProjectStatusHistory entries and refreshing client project counts.
    // Fetch the current status + clientId before running updateMany so we have
    // the fromStatus for each record and the affected client set.
    let projectSnapshots: Array<{
      id: string;
      clientId: string;
      status: string;
    }> = [];

    if (data.status) {
      projectSnapshots = await this.prisma.project.findMany({
        where: { id: { in: ids } },
        select: { id: true, clientId: true, status: true },
      });
    }

    const result = await this.prisma.project.updateMany({
      where: { id: { in: ids } },
      data: data as Prisma.ProjectUpdateManyMutationInput,
    });

    if (data.status && projectSnapshots.length > 0) {
      const newStatus = data.status as string;
      const effectiveUserId = userId || 'system';

      // Create a ProjectStatusHistory record for every project whose status
      // actually changed, matching what the single update() path does.
      const historyRecords = projectSnapshots
        .filter((p) => p.status !== newStatus)
        .map((p) => ({
          projectId: p.id,
          fromStatus: p.status,
          toStatus: newStatus,
          changedBy: effectiveUserId,
        }));

      if (historyRecords.length > 0) {
        await this.prisma.projectStatusHistory.createMany({
          data: historyRecords,
        });
      }

      // Refresh client project counts for all affected clients.
      const affectedClientIds = [
        ...new Set(projectSnapshots.map((p) => p.clientId)),
      ];
      for (const clientId of affectedClientIds) {
        await this.updateClientProjectCounts(clientId);
      }
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_UPDATE_PROJECTS',
      details: {
        ids,
        updates: data as Prisma.InputJsonValue,
        count: result.count,
      },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string) {
    if (!ids || ids.length === 0) return { count: 0 };

    // Fetch the distinct clientIds before deletion so we can update counts afterward.
    const projectsToDelete = await this.prisma.project.findMany({
      where: { id: { in: ids } },
      select: { clientId: true },
    });

    const affectedClientIds = [
      ...new Set(projectsToDelete.map((p) => p.clientId)),
    ];

    const result = await this.prisma.project.deleteMany({
      where: { id: { in: ids } },
    });

    // Refresh project counts for every affected client, mirroring remove().
    for (const clientId of affectedClientIds) {
      await this.updateClientProjectCounts(clientId);
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_DELETE_PROJECTS',
      details: {
        ids,
        count: result.count,
      },
    });

    return result;
  }

  private async recalculateTotalCost(projectId: string) {
    const result = await this.prisma.costLog.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { totalCost: result._sum.amount || 0 },
    });
  }

  /**
   * Update client's project counts
   */
  private async updateClientProjectCounts(clientId: string) {
    const projects = await this.prisma.project.findMany({
      where: { clientId },
    });

    const totalProjectCount = projects.length;
    const activeProjectCount = projects.filter(
      (p) => p.status === 'Active' || p.status === 'Planning',
    ).length;

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        totalProjectCount,
        activeProjectCount,
      },
    });
  }
}
