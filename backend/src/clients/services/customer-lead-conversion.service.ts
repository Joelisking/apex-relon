import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class CustomerLeadConversionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async convertLeadToClient(
    leadId: string,
    accountManagerId?: string,
    projectManagerId?: string,
    projectData?: {
      name?: string;
      contractedValue?: number;
      endOfProjectValue?: number;
      estimatedDueDate?: string;
      closedDate?: string;
      designerId?: string;
      qsId?: string;
      description?: string;
      status?: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        client: true,
        serviceType: { select: { id: true, name: true } },
      },
    });

    if (!lead) throw new Error('Lead not found');
    if (lead.stage !== 'Won') throw new Error('Only Won leads can be converted to customers');
    if (lead.convertedToClientId) throw new Error('Lead has already been converted');

    const managerInclude = {
      accountManager: { select: { id: true, name: true, email: true, role: true } },
    };

    let customer: any = null;
    let isNewCustomer = false;
    let existingCustomerDetected = false;

    if (lead.clientId && lead.client) {
      customer = await this.prisma.client.findUnique({
        where: { id: lead.clientId },
        include: managerInclude,
      });
    } else if (lead.email) {
      const existing = await this.prisma.client.findFirst({
        where: { email: lead.email },
        include: managerInclude,
      });
      if (existing) {
        customer = existing;
        existingCustomerDetected = true;
      }
    }

    if (!customer) {
      customer = await this.prisma.client.create({
        data: {
          name: lead.company,
          email: lead.email,
          phone: lead.phone,
          segment: 'SME',
          industry: lead.serviceType?.name || 'General',
          accountManagerId: accountManagerId || lead.assignedToId,
        },
        include: managerInclude,
      });
      isNewCustomer = true;
    }

    const project = await this.prisma.project.create({
      data: {
        name:
          projectData?.name ||
          `${lead.company} - ${lead.serviceType?.name || lead.projectName || 'Project'}`,
        clientId: customer.id,
        leadId: lead.id,
        status: projectData?.status || 'Planning',
        contractedValue: projectData?.contractedValue ?? lead.contractedValue ?? lead.expectedValue,
        endOfProjectValue: projectData?.endOfProjectValue ?? undefined,
        estimatedDueDate: projectData?.estimatedDueDate
          ? new Date(projectData.estimatedDueDate)
          : undefined,
        closedDate: projectData?.closedDate ? new Date(projectData.closedDate) : undefined,
        description: projectData?.description ?? lead.notes ?? undefined,
        projectManagerId: projectManagerId || accountManagerId || lead.assignedToId,
        designerId: projectData?.designerId || lead.designerId || undefined,
        qsId: projectData?.qsId || lead.qsId || undefined,
      },
      include: {
        projectManager: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { convertedToClientId: customer.id },
    });

    await this.prisma.client.update({
      where: { id: customer.id },
      data: { totalProjectCount: { increment: 1 }, activeProjectCount: { increment: 1 } },
    });

    const message = isNewCustomer
      ? `Successfully converted lead "${lead.contactName}" to new customer "${customer.name}" with first project`
      : existingCustomerDetected
        ? `Lead "${lead.contactName}" auto-linked to existing customer "${customer.name}" (matching email) with new project`
        : `Successfully converted lead "${lead.contactName}" to project for existing customer "${customer.name}"`;

    await this.auditService.log({
      userId: accountManagerId || lead.assignedToId || 'system',
      action: 'CONVERT_LEAD_TO_CUSTOMER',
      details: {
        leadId,
        customerId: customer.id,
        customerName: customer.name,
        projectId: project.id,
        projectName: project.name,
        isNewCustomer,
      },
    });

    return { customer, project, message, isNewCustomer, existingCustomerDetected };
  }
}
