import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProposalTemplatesService } from './proposal-templates.service';
import { CreateProposalTemplateDto } from './dto/create-proposal-template.dto';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { Permissions } from '../permissions/permissions.decorator';

interface AuthRequest {
  user: { id: string; role: string; email: string };
}

const TENANT_ID = 'apex';

@Controller('proposal-templates')
export class ProposalTemplatesController {
  constructor(private readonly service: ProposalTemplatesService) {}

  // ── Templates ──────────────────────────────────────────────────────────────

  @Get()
  @Permissions('quotes:view')
  listTemplates(@Query('serviceTypeId') serviceTypeId?: string) {
    return this.service.listTemplates(serviceTypeId);
  }

  @Post()
  @Permissions('settings:manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('serviceTypeId') serviceTypeId?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const dto: CreateProposalTemplateDto = { name, description, serviceTypeId };
    return this.service.uploadTemplate(file, dto);
  }

  @Get(':id/content')
  @Permissions('quotes:view')
  getTemplateContent(@Param('id') id: string) {
    return this.service.getTemplateContent(id);
  }

  @Delete(':id')
  @Permissions('settings:manage')
  deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Post(':id/generate')
  @Permissions('quotes:create')
  generateProposal(
    @Param('id') id: string,
    @Body() dto: GenerateProposalDto,
    @Request() req: AuthRequest,
  ) {
    return this.service.generateProposal(id, dto, req.user.id, TENANT_ID);
  }

  // ── Proposals ──────────────────────────────────────────────────────────────

  @Get('proposals')
  @Permissions('quotes:view')
  listProposals(@Query('leadId') leadId?: string) {
    return this.service.listProposals(TENANT_ID, leadId);
  }

  @Get('proposals/:id')
  @Permissions('quotes:view')
  getProposal(@Param('id') id: string) {
    return this.service.getProposalById(id);
  }

  @Patch('proposals/:id')
  @Permissions('quotes:create')
  renameProposal(
    @Param('id') id: string,
    @Body('title') title: string,
  ) {
    if (!title?.trim()) throw new BadRequestException('Title is required');
    return this.service.renameProposal(id, title);
  }

  @Patch('proposals/:id/accept')
  @Permissions('quotes:create')
  acceptProposal(@Param('id') id: string) {
    return this.service.acceptProposal(id);
  }

  @Delete('proposals/:id')
  @Permissions('quotes:create')
  deleteProposal(@Param('id') id: string) {
    return this.service.deleteProposal(id);
  }

  @Get('proposals/:id/download')
  @Permissions('quotes:view')
  async downloadProposal(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } =
      await this.service.downloadProposalFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    stream.pipe(res);
  }

  @Get('proposals/:id/combined-pdf')
  @Permissions('quotes:view')
  async downloadCombinedPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.service.downloadCombinedPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.send(buffer);
  }
}
