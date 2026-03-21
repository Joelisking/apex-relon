import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateCostLogDto } from './dto/create-cost-log.dto';
import { CreateProjectAssignmentDto } from './dto/create-project-assignment.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private workflowsService: WorkflowsService,
    private permissionsService: PermissionsService,
  ) {}

  private readonly projectInclude = {
    client: { select: { id: true, name: true } },
    lead: { select: { id: true, contactName: true, company: true } },
    projectManager: { select: { id: true, name: true, email: true } },
    designer: { select: { id: true, name: true, email: true } },
    qs: { select: { id: true, name: true, email: true } },
    assignments: {
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' as const },
    },
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

    const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
    if (!canViewAll) {
      where.OR = [
        { projectManagerId: userId },
        { designerId: userId },
        { qsId: userId },
        { assignments: { some: { userId } } },
      ];
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
    const { clientId, leadId, status, teamMemberIds, ...projectData } =
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

    // Create team member assignments if provided
    if (teamMemberIds?.length) {
      await this.prisma.projectAssignment.createMany({
        data: teamMemberIds.map((userId) => ({
          projectId: project.id,
          userId,
          role: 'Team Member',
        })),
        skipDuplicates: true,
      });
    }

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
  async findOne(id: string, userId?: string, userRole?: string) {
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
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
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

    // Apply same scope filter as findAll — users without projects:view_all
    // can only see projects they are assigned to.
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
      if (!canViewAll) {
        const isAssigned =
          project.projectManagerId === userId ||
          project.designerId === userId ||
          project.qsId === userId ||
          project.assignments.some((a) => a.userId === userId);
        if (!isAssigned) {
          throw new NotFoundException(`Project with ID ${id} not found`);
        }
      }
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

    // Extract client-level fields before passing to Prisma (Project model doesn't have these)
    const { segment, industry, ...projectUpdateData } = updateProjectDto;

    // Auto-set completedDate when transitioning to Completed
    if (
      updateProjectDto.status === 'Completed' &&
      existingProject.status !== 'Completed' &&
      !projectUpdateData.completedDate
    ) {
      (projectUpdateData as Record<string, unknown>).completedDate = new Date();
    }

    const project = await this.prisma.project.update({
      where: { id },
      data: projectUpdateData,
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

    // Bidirectional sync: push segment/industry back to client
    if (segment || industry) {
      await this.prisma.client.update({
        where: { id: existingProject.clientId },
        data: {
          ...(segment && { segment }),
          ...(industry && { industry }),
        },
      });
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
    userRole?: string,
  ) {
    if (!ids || ids.length === 0) return { count: 0 };

    // Restrict to accessible records when user lacks projects:view_all
    let accessibleIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.project.findMany({
          where: {
            id: { in: ids },
            OR: [
              { projectManagerId: userId },
              { designerId: userId },
              { qsId: userId },
              { assignments: { some: { userId } } },
            ],
          },
          select: { id: true },
        });
        accessibleIds = accessible.map((r) => r.id);
      }
    }

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
        where: { id: { in: accessibleIds } },
        select: { id: true, clientId: true, status: true },
      });
    }

    const result = await this.prisma.project.updateMany({
      where: { id: { in: accessibleIds } },
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
        ids: accessibleIds,
        updates: data as Prisma.InputJsonValue,
        count: result.count,
      },
    });

    return result;
  }

  async bulkDelete(ids: string[], userId?: string, userRole?: string) {
    if (!ids || ids.length === 0) return { count: 0 };

    // Restrict to accessible records when user lacks projects:view_all
    let accessibleIds = ids;
    if (userId && userRole) {
      const canViewAll = await this.permissionsService.hasPermission(userRole, 'projects:view_all');
      if (!canViewAll) {
        const accessible = await this.prisma.project.findMany({
          where: {
            id: { in: ids },
            OR: [
              { projectManagerId: userId },
              { designerId: userId },
              { qsId: userId },
              { assignments: { some: { userId } } },
            ],
          },
          select: { id: true },
        });
        accessibleIds = accessible.map((r) => r.id);
      }
    }

    // Fetch the distinct clientIds before deletion so we can update counts afterward.
    const projectsToDelete = await this.prisma.project.findMany({
      where: { id: { in: accessibleIds } },
      select: { clientId: true },
    });

    const affectedClientIds = [
      ...new Set(projectsToDelete.map((p) => p.clientId)),
    ];

    const result = await this.prisma.project.deleteMany({
      where: { id: { in: accessibleIds } },
    });

    // Refresh project counts for every affected client, mirroring remove().
    for (const clientId of affectedClientIds) {
      await this.updateClientProjectCounts(clientId);
    }

    await this.auditService.log({
      userId: userId || 'system',
      action: 'BULK_DELETE_PROJECTS',
      details: {
        ids: accessibleIds,
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

  // ── Project Assignments ────────────────────────────────────────────────────

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

    return this.prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId, userId: dto.userId } },
      create: { projectId, userId: dto.userId, role: dto.role },
      update: { role: dto.role },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  async removeAssignment(projectId: string, assignmentId: string) {
    const assignment = await this.prisma.projectAssignment.findFirst({
      where: { id: assignmentId, projectId },
    });
    if (!assignment) throw new NotFoundException(`Assignment not found`);

    await this.prisma.projectAssignment.delete({ where: { id: assignmentId } });
    return { message: 'Assignment removed' };
  }
}
