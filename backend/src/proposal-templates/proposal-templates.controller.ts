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

@Controller('proposal-templates')
export class ProposalTemplatesController {
  constructor(private readonly service: ProposalTemplatesService) {}

  @Get()
  @Permissions('quotes:view')
  listTemplates(@Query('serviceTypeId') serviceTypeId?: string) {
    return this.service.listTemplates(serviceTypeId);
  }

  @Get('generated')
  @Permissions('quotes:view')
  listGenerated() {
    return this.service.listGenerated();
  }

  @Delete('generated/:fileId')
  @Permissions('quotes:create')
  deleteGenerated(@Param('fileId') fileId: string) {
    return this.service.deleteGeneratedFile(fileId);
  }

  @Patch('generated/:fileId')
  @Permissions('quotes:create')
  renameGenerated(
    @Param('fileId') fileId: string,
    @Body('name') name: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('Name is required');
    return this.service.renameGeneratedFile(fileId, name);
  }

  @Get('generated/:fileId/download')
  @Permissions('quotes:view')
  async downloadGenerated(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const { stream, fileName, mimeType } =
      await this.service.downloadGeneratedFile(fileId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    stream.pipe(res);
  }

  @Post()
  @Permissions('settings:manage')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — docx files can be large
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
    return this.service.generateProposal(id, dto, req.user.id);
  }
}
