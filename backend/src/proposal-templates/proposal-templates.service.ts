import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PDFDocument } from 'pdf-lib';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const libre = require('libreoffice-convert') as { convert: typeof import('libreoffice-convert').convert };
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfService } from '../quotes/pdf.service';
import {
  fillDocx,
  extractParagraphs,
  formatProposalDate,
  monthName,
  formatCurrency,
  ProposalData,
} from './proposal-fill.util';
import { extractTemplateFields, TemplateFields } from './proposal-extract.util';
import { CreateProposalTemplateDto } from './dto/create-proposal-template.dto';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { Readable } from 'stream';

const libreConvertAsync = promisify(libre.convert);

interface SeedTemplate {
  file: string;
  name: string;
  serviceTypeName?: string;
}

const SEED_TEMPLATES: SeedTemplate[] = [
  { file: 'Template - Proposal - APEX - Address - ALTA.docx',                         name: 'ALTA Survey',                        serviceTypeName: 'ALTA/NSPS' },
  { file: 'Template - Proposal - APEX - Address - Boundary, Topo, PP, HS, & FS.docx', name: 'Boundary, Topo & Improvements',      serviceTypeName: 'Boundary' },
  { file: 'Template - Proposal - APEX - Address -Boundary.docx',                      name: 'Boundary Survey',                    serviceTypeName: 'Boundary' },
  { file: 'Template - Proposal - APEX - Address -Boundary - with options.docx',       name: 'Boundary Survey (with options)',     serviceTypeName: 'Boundary' },
  { file: 'Template - Proposal - APEX - Address - Topo.docx',                         name: 'Topographic Survey',                 serviceTypeName: 'Topographic' },
  { file: 'Template - Proposal - APEX - Address - topo & ALTA.docx',                  name: 'Topo & ALTA',                        serviceTypeName: 'Topographic' },
  { file: 'Template - Proposal - APEX - Address - topo & boundary.docx',              name: 'Topo & Boundary',                    serviceTypeName: 'Topographic' },
  { file: 'Template - Proposal - APEX - Address - Subdivision Plat.docx',             name: 'Subdivision Plat',                   serviceTypeName: 'Subdivision Plat' },
  { file: 'Template - Proposal - APEX - Address - T&M.docx',                          name: 'Time & Materials',                   serviceTypeName: undefined },
  { file: 'Template - Proposal - Topo - For VS Engineering.docx',                     name: 'Topo (VS Engineering)',              serviceTypeName: 'Topographic' },
  { file: 'Template - COFW - Proj Name- TOPO-LCRS-RW Eng.docx',                       name: 'COFW – Topo/LCRS/RW Engineering',    serviceTypeName: 'ROW Engineering' },
];

@Injectable()
export class ProposalTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(ProposalTemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private pdfService: PdfService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.proposalTemplate.count();
      if (count > 0) return; // already seeded
      await this.seedTemplates();
    } catch (err) {
      this.logger.warn(`Proposal template seeding skipped: ${(err as Error).message}`);
    }
  }

  private async seedTemplates() {
    const seedDir = path.join(__dirname, 'seed-templates');
    if (!fs.existsSync(seedDir)) {
      this.logger.warn('Seed templates directory not found, skipping');
      return;
    }

    // Build serviceType name → id map
    const serviceTypes = await this.prisma.serviceType.findMany({
      select: { id: true, name: true },
    });
    const serviceTypeMap = new Map(serviceTypes.map((s) => [s.name, s.id]));

    let seeded = 0;
    for (const tpl of SEED_TEMPLATES) {
      const filePath = path.join(seedDir, tpl.file);
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Seed template not found: ${tpl.file}`);
        continue;
      }

      const buffer = fs.readFileSync(filePath);
      const { fileName, gcpPath } = await this.storageService.uploadBuffer(
        buffer,
        'proposal-templates',
        tpl.file,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      const serviceTypeId = tpl.serviceTypeName
        ? (serviceTypeMap.get(tpl.serviceTypeName) ?? null)
        : null;

      await this.prisma.proposalTemplate.create({
        data: { name: tpl.name, serviceTypeId, gcpPath, fileName },
      });
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} proposal templates`);
  }

  listProposals(tenantId: string) {
    return this.prisma.proposal.findMany({
      where: { tenantId },
      include: {
        lead: { select: { id: true, company: true, contactName: true, projectName: true } },
        costBreakdown: { select: { id: true, title: true } },
        file: { select: { id: true, originalName: true, fileSize: true } },
        createdBy: { select: { id: true, name: true } },
        proposalTemplate: { select: { id: true, name: true } },
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

  async deleteProposal(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { file: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.file) {
      await this.storageService.deleteFile(proposal.file.gcpPath);
      await this.prisma.file.delete({ where: { id: proposal.file.id } });
    }
    return this.prisma.proposal.delete({ where: { id: proposalId } });
  }

  async renameProposal(proposalId: string, title: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: { title: title.trim() },
      include: {
        lead: { select: { id: true, company: true, contactName: true, projectName: true } },
        costBreakdown: { select: { id: true, title: true } },
        file: { select: { id: true, originalName: true, fileSize: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async acceptProposal(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
      include: {
        lead: { select: { id: true, company: true, contactName: true, projectName: true } },
        costBreakdown: { select: { id: true, title: true } },
        file: { select: { id: true, originalName: true, fileSize: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async getTemplateContent(
    templateId: string,
  ): Promise<{ paragraphs: string[] } & TemplateFields> {
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');
    const stream = this.storageService.getFileStream(template.gcpPath);
    const buffer = await streamToBuffer(stream);
    return {
      paragraphs: extractParagraphs(buffer),
      ...extractTemplateFields(buffer),
    };
  }

  async downloadProposalFile(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { file: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (!proposal.file) throw new NotFoundException('No file generated for this proposal');
    const stream = this.storageService.getFileStream(proposal.file.gcpPath);
    return {
      stream,
      fileName: proposal.file.originalName,
      mimeType: proposal.file.mimeType,
    };
  }

  async downloadCombinedPdf(proposalId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { file: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (!proposal.file) throw new NotFoundException('No file generated for this proposal');

    // 1. Download the proposal .docx from GCS
    const docxStream = this.storageService.getFileStream(proposal.file.gcpPath);
    const docxBuffer = await streamToBuffer(docxStream);

    // 2. Convert .docx → PDF via LibreOffice
    const proposalPdfBuffer: Buffer = await libreConvertAsync(docxBuffer, '.pdf', undefined);

    // 3. If no cost breakdown linked, just return the proposal PDF
    if (!proposal.costBreakdownId) {
      const baseName = proposal.file.originalName.replace(/\.docx$/i, '');
      return { buffer: proposalPdfBuffer, fileName: `${baseName}.pdf` };
    }

    // 4. Generate cost breakdown PDF via existing service
    const breakdownPdfBuffer = await this.pdfService.generateCostBreakdownPdf(proposal.costBreakdownId);

    // 5. Merge: proposal pages first, then cost breakdown pages
    const merged = await PDFDocument.create();

    const proposalDoc = await PDFDocument.load(proposalPdfBuffer);
    const proposalPages = await merged.copyPages(proposalDoc, proposalDoc.getPageIndices());
    proposalPages.forEach((p) => merged.addPage(p));

    const breakdownDoc = await PDFDocument.load(breakdownPdfBuffer);
    const breakdownPages = await merged.copyPages(breakdownDoc, breakdownDoc.getPageIndices());
    breakdownPages.forEach((p) => merged.addPage(p));

    const mergedBytes = await merged.save();
    const baseName = proposal.file.originalName.replace(/\.docx$/i, '');
    return { buffer: Buffer.from(mergedBytes), fileName: `${baseName}-with-breakdown.pdf` };
  }

  async generateProposal(
    templateId: string,
    dto: GenerateProposalDto,
    userId: string,
    tenantId: string,
  ): Promise<{ proposalId: string; fileId: string; fileName: string; downloadUrl: string }> {
    // 1. Fetch template
    const template = await this.prisma.proposalTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    // 2. Derive CRM values from lead (if provided)
    let clientId: string | null = null;
    let crmFirstName = '';
    let crmLastName = '';
    let companyName = '';
    let derivedProjectName = '';
    let derivedAddress = '';
    let derivedCity = '';
    let derivedState = '';
    let derivedZip = '';

    if (dto.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: dto.leadId },
        include: {
          client: {
            include: { contacts: { where: { isPrimary: true }, take: 1 } },
          },
        },
      });
      if (!lead) throw new NotFoundException('Lead not found');

      if (lead.contactName) {
        const parts = lead.contactName.trim().split(/\s+/);
        crmFirstName = parts[0] ?? '';
        crmLastName = parts.slice(1).join(' ');
      } else if ((lead.client as any)?.contacts?.[0]) {
        const contact = (lead.client as any).contacts[0];
        crmFirstName = contact.firstName ?? '';
        crmLastName = contact.lastName ?? '';
      }

      companyName = lead.company ?? '';
      derivedProjectName = lead.projectName ?? '';
      derivedAddress = lead.address ?? '';
      derivedCity = lead.city ?? '';
      derivedState = lead.state ?? '';
      derivedZip = lead.zip ?? '';
      clientId = lead.clientId ?? null;

      if (dto.saveAddressToClient && clientId && dto.address) {
        await this.prisma.client.update({
          where: { id: clientId },
          data: { address: dto.address },
        });
      }
    }

    // 3. Build ProposalData — DTO overrides win over CRM
    const today = dto.proposalDate ? new Date(dto.proposalDate) : new Date();
    const firstName = dto.firstName ?? crmFirstName;
    const lastName = dto.lastName ?? crmLastName;

    const data: ProposalData = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      salutation: dto.salutation ?? '',
      companyName,
      address: dto.address ?? derivedAddress,
      suite: dto.suite ?? '',
      city: dto.city ?? derivedCity,
      state: dto.state ?? derivedState,
      zip: dto.zip ?? derivedZip,
      projectName: dto.projectName ?? derivedProjectName,
      projectAddress: dto.projectAddress ?? '',
      projectDescription: '',
      totalAmount: dto.totalAmount ?? '',
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
    const filledBuffer = fillDocx(
      templateBuffer,
      data,
      dto.dynamicValues,
      dto.tableCellValues,
      dto.paragraphOverrides,
    );

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
        leadId: dto.leadId ?? undefined,
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

    // 8. Auto-generate title if not provided
    const title =
      dto.title?.trim() ||
      (companyName
        ? `${companyName}${derivedProjectName ? ` – ${derivedProjectName}` : ''}`
        : 'Proposal');

    // 9. Create Proposal record
    const proposal = await this.prisma.proposal.create({
      data: {
        tenantId,
        title,
        status: 'DRAFT',
        leadId: dto.leadId ?? undefined,
        costBreakdownId: dto.costBreakdownId ?? undefined,
        proposalTemplateId: templateId,
        fileId: fileRecord.id,
        proposalDate: today,
        createdById: userId,
      },
    });

    return {
      proposalId: proposal.id,
      fileId: fileRecord.id,
      fileName: originalName,
      downloadUrl: `/proposal-templates/proposals/${proposal.id}/download`,
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
