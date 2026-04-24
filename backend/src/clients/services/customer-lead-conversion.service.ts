import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { WorkflowsService } from '../../workflows/workflows.service';
import { generateJobNumber } from '../../projects/projects.util';
import { handlePrismaError } from '../../common/prisma-error.handler';

@Injectable()
export class CustomerLeadConversionService {
  private readonly logger = new Logger(CustomerLeadConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async convertLeadToClient(
    leadId: string,
    pmUserId?: string,
    projectData?: {
      name?: string;
      contractedValue?: number;
      endOfProjectValue?: number;
      estimatedDueDate?: string;
      startDate?: string;
      closedDate?: string;
      description?: string;
      status?: string;
      riskStatus?: string;
    },
    userId?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        client: true,
        jobType: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      this.logger.warn(`Lead not found for conversion: ${leadId}`);
      throw new NotFoundException('Lead not found');
    }
    if (lead.stage !== 'Closed Won' && lead.stage !== 'Won') throw new BadRequestException('Only Closed Won leads can be converted to a project');
    if (lead.convertedToClientId) throw new BadRequestException('Lead has already been converted');
    if (!lead.clientId || !lead.client) throw new BadRequestException('Lead must have an associated client before conversion');

    const customer = lead.client;

    // Duplicate project check
    const existingProject = await this.prisma.project.findFirst({ where: { leadId } });
    if (existingProject) throw new BadRequestException('A project already exists for this lead');

    // Determine first pipeline stage if no status provided.
    // Prefer stages scoped to the lead's service type; fall back to __all__.
    let resolvedStatus = projectData?.status;
    if (!resolvedStatus) {
      const jobTypeName = lead.jobType?.name;
      const firstStage =
        (jobTypeName
          ? await this.prisma.pipelineStage.findFirst({
              where: { pipelineType: 'project', jobType: jobTypeName },
              orderBy: { sortOrder: 'asc' },
            })
          : null) ??
        (await this.prisma.pipelineStage.findFirst({
          where: { pipelineType: 'project', jobType: '__all__' },
          orderBy: { sortOrder: 'asc' },
        }));
      resolvedStatus = firstStage?.name ?? 'Planning';
    }

    const jobNumber = await generateJobNumber(this.prisma);

    let project: Awaited<ReturnType<typeof this.prisma.project.create>>;
    try {
      project = await this.prisma.project.create({
        data: {
          name: projectData?.name || `${lead.company} - ${lead.jobType?.name || lead.projectName || 'Project'}`,
          jobNumber,
          clientId: customer.id,
          leadId: lead.id,
          status: resolvedStatus,
          riskStatus: projectData?.riskStatus || 'On Track',
          contractedValue: projectData?.contractedValue ?? lead.contractedValue ?? lead.expectedValue,
          endOfProjectValue: projectData?.endOfProjectValue ?? undefined,
          startDate: projectData?.startDate ? new Date(projectData.startDate) : undefined,
          estimatedDueDate: projectData?.estimatedDueDate ? new Date(projectData.estimatedDueDate) : undefined,
          closedDate: projectData?.closedDate ? new Date(projectData.closedDate) : undefined,
          description: projectData?.description ?? lead.notes ?? undefined,
          jobTypeId: lead.jobTypeId || undefined,
          categoryIds: lead.categoryIds ?? [],
          jobTypeIds: lead.jobTypeIds ?? [],
          county: lead.county ?? undefined,
        },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerLeadConversionService.convertLeadToClient.createProject');
    }
    this.logger.log(`Project created from lead ${leadId}: ${project.id}`);

    // Add PM as a ProjectAssignment if provided or fall back to lead's assigned user
    const resolvedPmId = pmUserId || lead.assignedToId;
    if (resolvedPmId) {
      await this.prisma.projectAssignment.create({
        data: {
          projectId: project.id,
          userId: resolvedPmId,
          role: 'Project Manager',
        },
      }).catch(() => {
        // Silently ignore if already assigned
      });
    }

    try {
      await this.prisma.costBreakdown.updateMany({
        where: { leadId },
        data: { projectId: project.id },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerLeadConversionService.convertLeadToClient.linkCostBreakdowns');
    }
    this.logger.log(`Cost breakdowns linked to project ${project.id}`);

    try {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { convertedToClientId: customer.id },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerLeadConversionService.convertLeadToClient.markLeadConverted');
    }
    this.logger.log(`Lead ${leadId} marked as converted`);

    // Recompute project counts accurately
    await this.recomputeClientProjectCounts(customer.id);

    const actorId = userId || resolvedPmId || 'system';
    try {
      await this.prisma.projectStatusHistory.create({
        data: {
          projectId: project.id,
          fromStatus: null,
          toStatus: project.status,
          changedBy: actorId,
        },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerLeadConversionService.convertLeadToClient.createStatusHistory');
    }
    this.logger.log(`Initial status history recorded for project ${project.id}`);

    await this.auditService.log({
      userId: actorId,
      action: 'CONVERT_LEAD_TO_PROJECT',
      details: {
        leadId,
        customerId: customer.id,
        customerName: customer.name,
        projectId: project.id,
        projectName: project.name,
      },
    });

    this.workflowsService.triggerRules(
      'PROJECT_CREATED',
      'PROJECT',
      project.id,
      project as unknown as Record<string, unknown>,
    );

    return {
      customer,
      project,
      message: `Successfully converted lead "${lead.contactName}" to project for customer "${customer.name}"`,
    };
  }

  private async recomputeClientProjectCounts(clientId: string) {
    const total = await this.prisma.project.count({ where: { clientId } });
    const active = await this.prisma.project.count({
      where: { clientId, status: { notIn: ['Completed', 'Cancelled'] } },
    });
    try {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { totalProjectCount: total, activeProjectCount: active },
      });
    } catch (error) {
      handlePrismaError(error, this.logger, 'CustomerLeadConversionService.recomputeClientProjectCounts');
    }
    this.logger.log(`Project counts recomputed for client ${clientId}: total=${total}, active=${active}`);
  }
}
