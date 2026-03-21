import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { WorkflowsService } from '../../workflows/workflows.service';

@Injectable()
export class CustomerLeadConversionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async convertLeadToClient(
    leadId: string,
    projectManagerId?: string,
    projectData?: {
      name?: string;
      contractedValue?: number;
      endOfProjectValue?: number;
      estimatedDueDate?: string;
      startDate?: string;
      closedDate?: string;
      description?: string;
      status?: string;
    },
    userId?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        client: true,
        serviceType: { select: { id: true, name: true } },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.stage !== 'Won') throw new BadRequestException('Only Won leads can be converted to a project');
    if (lead.convertedToClientId) throw new BadRequestException('Lead has already been converted');
    if (!lead.clientId || !lead.client) throw new BadRequestException('Lead must have an associated client before conversion');

    const customer = lead.client;

    // Duplicate project check (from Endpoint B)
    const existingProject = await this.prisma.project.findFirst({ where: { leadId } });
    if (existingProject) throw new BadRequestException('A project already exists for this lead');

    // Determine first pipeline stage if no status provided
    let resolvedStatus = projectData?.status;
    if (!resolvedStatus) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { pipelineType: 'project' },
        orderBy: { sortOrder: 'asc' },
      });
      resolvedStatus = firstStage?.name ?? 'Planning';
    }

    const project = await this.prisma.project.create({
      data: {
        name: projectData?.name || `${lead.company} - ${lead.serviceType?.name || lead.projectName || 'Project'}`,
        clientId: customer.id,
        leadId: lead.id,
        status: resolvedStatus,
        riskStatus: 'On Track',
        contractedValue: projectData?.contractedValue ?? lead.contractedValue ?? lead.expectedValue,
        endOfProjectValue: projectData?.endOfProjectValue ?? undefined,
        startDate: projectData?.startDate ? new Date(projectData.startDate) : undefined,
        estimatedDueDate: projectData?.estimatedDueDate ? new Date(projectData.estimatedDueDate) : undefined,
        closedDate: projectData?.closedDate ? new Date(projectData.closedDate) : undefined,
        description: projectData?.description ?? lead.notes ?? undefined,
        projectManagerId: projectManagerId || lead.assignedToId || undefined,
        serviceTypeId: lead.serviceTypeId || undefined,
      },
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
      },
    });

    // Mark lead as converted
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { convertedToClientId: customer.id },
    });

    // Recompute project counts accurately
    await this.recomputeClientProjectCounts(customer.id);

    // Record initial status history
    const actorId = userId || projectManagerId || lead.assignedToId || 'system';
    await this.prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
        fromStatus: null,
        toStatus: project.status,
        changedBy: actorId,
      },
    });

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
    await this.prisma.client.update({
      where: { id: clientId },
      data: { totalProjectCount: total, activeProjectCount: active },
    });
  }
}
