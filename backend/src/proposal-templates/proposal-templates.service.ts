import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PDFDocument } from 'pdf-lib';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libre = require('libreoffice-convert') as {
  convert: typeof import('libreoffice-convert').convert;
  convertWithOptions: (
    doc: Buffer,
    format: string,
    filter: string | undefined,
    options: { sofficeBinaryPaths?: string[] },
    callback: (err: Error | null, result: Buffer) => void,
  ) => void;
};
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PdfService } from '../quotes/pdf.service';
import {
  fillDocx,
  extractParagraphs,
  formatProposalDate,
  monthName,
  formatCurrency,
  patchDocxMarginsForLibreOffice,
  ProposalData,
} from './proposal-fill.util';
import { extractTemplateFields, TemplateFields } from './proposal-extract.util';
import { CreateProposalTemplateDto } from './dto/create-proposal-template.dto';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { Readable } from 'stream';

const libreConvertAsync = promisify(libre.convertWithOptions);

// Allow overriding the soffice binary path via env var (needed on macOS Homebrew).
// The package only checks /Applications/LibreOffice.app/... on darwin by default.
const sofficeBinaryPaths: string[] = process.env.LIBREOFFICE_BINARY
  ? [process.env.LIBREOFFICE_BINARY]
  : [];

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

/**
 * Build a human-readable filename for a generated proposal.
 * Format: "Proposal - {Company} - {Project} - YYYY-MM-DD.{ext}"
 * Falls back to template name when company/project are not available.
 */
function buildProposalFileName(
  companyName: string,
  projectName: string,
  templateName: string,
  date: Date,
  ext: string,
): string {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const clean = (s: string, max: number) =>
    s.replace(/[^\w\s&()\-,.]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  const parts: string[] = ['Proposal'];
  const company = clean(companyName, 50);
  const project = clean(projectName, 60);
  if (company) parts.push(company);
  if (project) parts.push(project);
  if (!company && !project) parts.push(clean(templateName, 60));
  parts.push(dateStr);
  return `${parts.join(' - ')}.${ext}`;
}

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
      if (count > 0) {
        // Templates already exist — patch names to the clean values from SEED_TEMPLATES
        // in case they were seeded before clean names were defined.
        await this.patchSeedTemplateNames();
        return;
      }
      await this.seedTemplates();
    } catch (err) {
      this.logger.warn(`Proposal template seeding skipped: ${(err as Error).message}`);
    }
  }

  /** Update the `name` (and jobTypeId) of any seeded template whose fileName contains the seed file name. */
  private async patchSeedTemplateNames() {
    const jobTypes = await this.prisma.jobType.findMany({ select: { id: true, name: true } });
    const jobTypeMap = new Map(jobTypes.map((s) => [s.name, s.id]));

    for (const tpl of SEED_TEMPLATES) {
      const existing = await this.prisma.proposalTemplate.findFirst({
        where: { fileName: { contains: tpl.file } },
      });
      if (!existing) continue;
      if (existing.name === tpl.name) continue; // already clean
      const jobTypeId = tpl.serviceTypeName ? (jobTypeMap.get(tpl.serviceTypeName) ?? null) : null;
      await this.prisma.proposalTemplate.update({
        where: { id: existing.id },
        data: { name: tpl.name, jobTypeId },
      });
      this.logger.log(`Patched template name: "${existing.name}" → "${tpl.name}"`);
    }
  }

  private async seedTemplates() {
    const seedDir = path.join(__dirname, 'seed-templates');
    if (!fs.existsSync(seedDir)) {
      this.logger.warn('Seed templates directory not found, skipping');
      return;
    }

    // Build jobType name → id map
    const jobTypes = await this.prisma.jobType.findMany({
      select: { id: true, name: true },
    });
    const jobTypeMap = new Map(jobTypes.map((s) => [s.name, s.id]));

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

      const jobTypeId = tpl.serviceTypeName
        ? (jobTypeMap.get(tpl.serviceTypeName) ?? null)
        : null;

      await this.prisma.proposalTemplate.create({
        data: { name: tpl.name, jobTypeId, gcpPath, fileName },
      });
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} proposal templates`);
  }

  listProposals(tenantId: string, filters?: { leadId?: string; projectId?: string }) {
    // leadId takes priority; fall back to matching via the linked cost breakdown's projectId
    const where: Record<string, unknown> = { tenantId };
    if (filters?.leadId) {
      where.leadId = filters.leadId;
    } else if (filters?.projectId) {
      where.costBreakdown = { projectId: filters.projectId };
    }
    return this.prisma.proposal.findMany({
      where,
      include: {
        lead: { select: { id: true, company: true, contactName: true, projectName: true } },
        costBreakdown: { select: { id: true, title: true, status: true } },
        file: { select: { id: true, originalName: true, fileSize: true } },
        createdBy: { select: { id: true, name: true } },
        proposalTemplate: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getProposalById(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, company: true, contactName: true, projectName: true } },
        costBreakdown: { select: { id: true, title: true, status: true } },
        file: { select: { id: true, originalName: true, fileSize: true } },
        createdBy: { select: { id: true, name: true } },
        proposalTemplate: { select: { id: true, name: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  listTemplates(jobTypeId?: string) {
    return this.prisma.proposalTemplate.findMany({
      where: jobTypeId ? { jobTypeId } : undefined,
      include: {
        jobType: { select: { id: true, name: true } },
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
        jobTypeId: dto.jobTypeId || null,
        gcpPath,
        fileName,
      },
      include: {
        jobType: { select: { id: true, name: true } },
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

  async acceptProposal(proposalId: string, contractedValue?: number, invoicedValue?: number) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lead: { select: { id: true } },
        costBreakdown: { select: { id: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    // Write contractedValue + invoicedValue to the linked project and lead if present
    if ((contractedValue !== undefined || invoicedValue !== undefined) && proposal.leadId) {
      // Update the lead's contractedValue so conversion dialogs pre-fill correctly
      if (contractedValue !== undefined) {
        await this.prisma.lead.update({
          where: { id: proposal.leadId },
          data: { contractedValue },
        });
      }

      const project = await this.prisma.project.findFirst({
        where: { leadId: proposal.leadId },
        select: { id: true },
      });
      if (project) {
        await this.prisma.project.update({
          where: { id: project.id },
          data: {
            ...(contractedValue !== undefined && { contractedValue }),
            ...(invoicedValue !== undefined && { invoicedValue }),
          },
        });
      }
    }

    // Lock the cost breakdown and mark as final so it can't be edited after acceptance
    if (proposal.costBreakdownId) {
      await this.prisma.costBreakdown.update({
        where: { id: proposal.costBreakdownId },
        data: { benchmarkLockedAt: new Date(), status: 'FINAL' },
      });
    }

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
    // Patch bottom margin first to compensate for LibreOffice's slightly different
    // font metrics — without this, 1-page Word docs can overflow to 2 pages in LibreOffice.
    const patchedDocxBuffer = patchDocxMarginsForLibreOffice(docxBuffer);
    let proposalPdfBuffer: Buffer;
    try {
      proposalPdfBuffer = await libreConvertAsync(patchedDocxBuffer, '.pdf', undefined, { sofficeBinaryPaths });
    } catch (err) {
      this.logger.error('LibreOffice conversion failed', err instanceof Error ? err.stack : String(err));
      throw new Error(`PDF conversion failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. If no cost breakdown linked, just return the proposal PDF
    if (!proposal.costBreakdownId) {
      const baseName = proposal.file.originalName.replace(/\.\w+$/i, '');
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
    const baseName = proposal.file.originalName.replace(/\.\w+$/i, '');
    return { buffer: Buffer.from(mergedBytes), fileName: `${baseName} (with Cost Breakdown).pdf` };
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

    // 1.5. If regenerating, delete the prior proposal first. The Proposal model
    // has a unique constraint on costBreakdownId (and fileId); re-creating without
    // first removing the old row would violate it.
    //
    // Two ways to land here:
    //   a) editor sent replaceProposalId explicitly (edit-existing flow)
    //   b) the cost breakdown already has a proposal — even from "New Proposal",
    //      one breakdown = one proposal, so we always replace.
    let replaceId = dto.replaceProposalId;
    if (!replaceId && dto.costBreakdownId) {
      const existing = await this.prisma.proposal.findFirst({
        where: { costBreakdownId: dto.costBreakdownId },
        select: { id: true },
      });
      if (existing) replaceId = existing.id;
    }
    if (replaceId) {
      const existing = await this.prisma.proposal.findUnique({
        where: { id: replaceId },
      });
      if (existing) await this.deleteProposal(replaceId);
    }

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
    } else if (dto.costBreakdownId) {
      // 0.3: no leadId provided — derive header fields from the breakdown's linked lead or project
      const breakdown = await this.prisma.costBreakdown.findUnique({
        where: { id: dto.costBreakdownId },
        include: {
          lead: true,
          project: { include: { client: true } },
        },
      });
      if (breakdown?.lead) {
        const lead = breakdown.lead as any;
        if (lead.contactName) {
          const parts = String(lead.contactName).trim().split(/\s+/);
          crmFirstName = parts[0] ?? '';
          crmLastName = parts.slice(1).join(' ');
        }
        companyName = lead.company ?? '';
        derivedProjectName = lead.projectName ?? '';
        derivedAddress = lead.address ?? '';
        derivedCity = lead.city ?? '';
        derivedState = lead.state ?? '';
        derivedZip = lead.zip ?? '';
        clientId = lead.clientId ?? null;
      } else if (breakdown?.project) {
        const project = breakdown.project as any;
        companyName = project.client?.name ?? '';
        derivedProjectName = project.name ?? '';
        clientId = project.clientId ?? null;
      }
    }

    // 3. Build ProposalData — DTO overrides win over CRM
    const today = dto.proposalDate ? new Date(dto.proposalDate) : new Date();
    const firstName = dto.firstName ?? crmFirstName;
    const lastName = dto.lastName ?? crmLastName;

    // Guard against excessively long values that would push the signing block
    // onto page 2 in the template (DOCX overflow bug).
    const trunc = (s: string | undefined, max: number) =>
      s && s.length > max ? `${s.slice(0, max - 1)}…` : (s ?? '');

    const data: ProposalData = {
      firstName,
      lastName,
      fullName: trunc(`${firstName} ${lastName}`.trim(), 60),
      salutation: dto.salutation ?? '',
      companyName: trunc(companyName, 55),
      address: trunc(dto.address ?? derivedAddress, 70),
      suite: trunc(dto.suite ?? '', 20),
      city: trunc(dto.city ?? derivedCity, 40),
      state: dto.state ?? derivedState,
      zip: dto.zip ?? derivedZip,
      projectName: trunc(dto.projectName ?? derivedProjectName, 70),
      projectAddress: trunc(dto.projectAddress ?? '', 70),
      projectDescription: '',
      totalAmount: dto.totalAmount ?? '',
      timeline: trunc(dto.timeline ?? '', 80),
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
    const originalName = buildProposalFileName(
      companyName,
      dto.projectName ?? derivedProjectName,
      template.name,
      today,
      'docx',
    );
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
        formSnapshot: {
          salutation: dto.salutation ?? null,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          state: dto.state ?? null,
          zip: dto.zip ?? null,
          timeline: dto.timeline ?? null,
          proposalDate: dto.proposalDate ?? null,
          projectName: dto.projectName ?? null,
          projectAddress: dto.projectAddress ?? null,
          totalAmount: dto.totalAmount ?? null,
          dynamicValues: dto.dynamicValues ?? null,
          tableCellValues: dto.tableCellValues ?? null,
          paragraphOverrides: dto.paragraphOverrides ?? null,
        },
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
