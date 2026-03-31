import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  fillDocx,
  extractParagraphs,
  formatProposalDate,
  monthName,
  formatCurrency,
  ProposalData,
} from './proposal-fill.util';
import { CreateProposalTemplateDto } from './dto/create-proposal-template.dto';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { Readable } from 'stream';

@Injectable()
export class ProposalTemplatesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  listGenerated() {
    return this.prisma.file.findMany({
      where: { category: 'proposal' },
      include: {
        client: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listTemplates(serviceTypeId?: string) {
    return this.prisma.proposalTemplate.findMany({
      where: serviceTypeId ? { serviceTypeId } : undefined,
      include: {
        serviceType: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async uploadTemplate(
    file: Express.Multer.File,
    dto: CreateProposalTemplateDto,
  ) {
    const { gcpPath, fileName } = await this.storageService.uploadFile(
      file,
      'proposal-templates',
    );
    return this.prisma.proposalTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        serviceTypeId: dto.serviceTypeId || null,
        gcpPath,
        fileName,
      },
      include: {
        serviceType: { select: { id: true, name: true } },
      },
    });
  }

  async deleteTemplate(id: string) {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    await this.storageService.deleteFile(template.gcpPath);
    return this.prisma.proposalTemplate.delete({ where: { id } });
  }

  async deleteGeneratedFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.storageService.deleteFile(file.gcpPath);
    return this.prisma.file.delete({ where: { id: fileId } });
  }

  async renameGeneratedFile(fileId: string, name: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const newName = name.trim().endsWith('.docx') ? name.trim() : `${name.trim()}.docx`;
    return this.prisma.file.update({
      where: { id: fileId },
      data: { originalName: newName },
      include: {
        client: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getTemplateContent(templateId: string): Promise<{ paragraphs: string[] }> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');
    const stream = this.storageService.getFileStream(template.gcpPath);
    const buffer = await streamToBuffer(stream);
    return { paragraphs: extractParagraphs(buffer) };
  }

  async downloadGeneratedFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    const stream = this.storageService.getFileStream(file.gcpPath);
    return { stream, fileName: file.originalName, mimeType: file.mimeType };
  }

  async generateProposal(
    templateId: string,
    dto: GenerateProposalDto,
    userId: string,
  ): Promise<{ fileId: string; fileName: string; downloadUrl: string }> {
    // 1. Fetch template
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    // 2. Determine data source and derive CRM values
    let clientId: string | null = null;
    let crmFirstName = '';
    let crmLastName = '';
    let companyName = '';
    let derivedProjectName = '';
    let quoteTotal = dto.totalAmount ?? '';

    if (dto.quoteId) {
      // Source: Quote
      const quote = await this.prisma.quote.findUnique({
        where: { id: dto.quoteId },
        include: {
          lead: {
            include: {
              client: {
                include: {
                  contacts: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          client: {
            include: {
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          project: {
            include: {
              client: {
                include: {
                  contacts: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      });
      if (!quote) throw new NotFoundException('Quote not found');

      const client =
        quote.client ??
        quote.lead?.client ??
        (quote.project as any)?.client ??
        null;
      clientId =
        quote.clientId ??
        quote.lead?.clientId ??
        (quote.project as any)?.clientId ??
        null;
      const primaryContact = (client as any)?.contacts?.[0] ?? null;

      if (quote.lead?.contactName) {
        const parts = quote.lead.contactName.trim().split(/\s+/);
        crmFirstName = parts[0] ?? '';
        crmLastName = parts.slice(1).join(' ');
      } else if (primaryContact) {
        crmFirstName = primaryContact.firstName ?? '';
        crmLastName = primaryContact.lastName ?? '';
      }

      companyName = (client as any)?.name ?? '';
      derivedProjectName =
        quote.lead?.projectName ??
        (quote.project as any)?.name ??
        '';
      quoteTotal = dto.totalAmount ?? formatCurrency(quote.total);

      if (dto.saveAddressToClient && clientId && dto.address) {
        await this.prisma.client.update({
          where: { id: clientId },
          data: { address: dto.address },
        });
      }
    } else if (dto.projectId) {
      // Source: Project
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        include: {
          client: {
            include: {
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          lead: true,
        },
      });
      if (!project) throw new NotFoundException('Project not found');

      clientId = (project as any).clientId ?? null;
      companyName = (project as any).client?.name ?? (project as any).lead?.company ?? '';
      const contact = (project as any).client?.contacts?.[0] ?? null;
      crmFirstName = contact?.firstName ?? '';
      crmLastName = contact?.lastName ?? '';
      derivedProjectName = project.name ?? '';

      if (dto.saveAddressToClient && clientId && dto.address) {
        await this.prisma.client.update({
          where: { id: clientId },
          data: { address: dto.address },
        });
      }
    }
    // else: manual mode — all values come from DTO

    // 3. Build ProposalData — DTO overrides win over CRM
    const today = dto.proposalDate
      ? new Date(dto.proposalDate)
      : new Date();

    const firstName = dto.firstName ?? crmFirstName;
    const lastName = dto.lastName ?? crmLastName;

    const data: ProposalData = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      salutation: dto.salutation ?? '',
      companyName: dto.firstName ? companyName : companyName,
      address: dto.address ?? '',
      suite: dto.suite ?? '',
      city: dto.city ?? '',
      state: dto.state ?? '',
      zip: dto.zip ?? '',
      projectName: dto.projectName ?? derivedProjectName,
      projectAddress: dto.projectAddress ?? '',
      projectDescription: '',
      totalAmount: quoteTotal,
      timeline: dto.timeline ?? '',
      proposalDate: formatProposalDate(today),
      month: monthName(today),
      day: String(today.getDate()),
      year: String(today.getFullYear()),
    };

    // 4. Download template buffer from GCS
    const stream = this.storageService.getFileStream(template.gcpPath);
    const templateBuffer = await streamToBuffer(stream);

    // 5. Fill the template
    const filledBuffer = fillDocx(templateBuffer, data);

    // 6. Upload filled .docx to GCS
    const slug = template.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
    const originalName = `${slug}-${Date.now()}.docx`;
    const uploadPath = clientId
      ? `clients/${clientId}/proposals`
      : 'proposals/manual';
    const { fileName, gcpPath } = await this.storageService.uploadBuffer(
      filledBuffer,
      uploadPath,
      originalName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // 7. Create File record
    const fileRecord = await this.prisma.file.create({
      data: {
        clientId: clientId ?? undefined,
        fileName,
        originalName,
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: filledBuffer.length,
        category: 'proposal',
        gcpPath,
        uploadedById: userId,
      },
    });

    return {
      fileId: fileRecord.id,
      fileName: originalName,
      downloadUrl: `/proposal-templates/generated/${fileRecord.id}/download`,
    };
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
