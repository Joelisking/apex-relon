import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { PermissionsService } from '../permissions/permissions.service';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { generateJobNumber } from './projects.util';
import { getClientDisplayName } from '../clients/client-display.helper';

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
    jobType: {
      select: {
        id: true,
        name: true,
        division: { select: { id: true, name: true } },
      },
    },
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
    costSegments: {
      orderBy: { sortOrder: 'asc' as const },
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
    const { clientId, leadId, status, teamMemberIds, costSegments, jobNumber: dtoJobNumber, ...projectData } =
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

    // If manual job number provided, check it isn't already taken before hitting the DB
    if (dtoJobNumber) {
      const existing = await this.prisma.project.findUnique({ where: { jobNumber: dtoJobNumber } });
      if (existing) {
        throw new ConflictException(`Job number "${dtoJobNumber}" is already in use`);
      }
    }

    const jobNumber = dtoJobNumber || await generateJobNumber(this.prisma);

    // Create project (with optional cost segments via nested write)
    let project: Awaited<ReturnType<typeof this.prisma.project.create>>;
    try {
      project = await this.prisma.project.create({
        data: {
          ...projectData,
          clientId,
          leadId: leadId || null,
          status,
          jobNumber,
          ...(costSegments?.length && {
            costSegments: {
              createMany: {
                data: costSegments.map((s, i) => ({
                  name: s.name,
                  amount: s.amount,
                  sortOrder: s.sortOrder ?? i,
                })),
              },
            },
          }),
        },
        include: this.projectInclude,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('jobNumber')
      ) {
        throw new ConflictException(
          dtoJobNumber
            ? `Job number "${dtoJobNumber}" is already in use`
            : 'Could not generate a unique job number — please try again',
        );
      }
      throw error;
    }

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
      userId: userId || 'system',
      action: 'CREATE_PROJECT',
      details: {
        projectId: project.id,
        projectName: project.name,
        clientId: project.clientId,
        clientName: getClientDisplayName(client),
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

    // Extract non-Prisma fields before passing to Prisma
    const { segment, industry, teamMemberIds, costSegments, ...projectUpdateData } = updateProjectDto;

    // Clear statusNote when status changes and no new note is provided
    if (
      updateProjectDto.status &&
      updateProjectDto.status !== existingProject.status &&
      updateProjectDto.statusNote === undefined
    ) {
      (projectUpdateData as Record<string, unknown>).statusNote = null;
    }

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

    // Replace cost segments if provided (undefined = leave untouched, [] = clear all)
    if (costSegments !== undefined) {
      await this.prisma.projectCostSegment.deleteMany({ where: { projectId: id } });
      if (costSegments.length > 0) {
        await this.prisma.projectCostSegment.createMany({
          data: costSegments.map((s, i) => ({
            projectId: id,
            name: s.name,
            amount: s.amount,
            sortOrder: s.sortOrder ?? i,
          })),
        });
      }
    }

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
            note: updateProjectDto.statusNote || null,
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

    // Refetch so cost segment changes are reflected in the response
    if (costSegments !== undefined) {
      return this.prisma.project.findUniqueOrThrow({
        where: { id },
        include: this.projectInclude,
      });
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
   * Update client's project counts
   */
  async updateClientProjectCounts(clientId: string) {
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
