import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { QuoteSettingsService } from './quote-settings.service';
import { PdfService } from './pdf.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteSettingsDto,
} from './dto/quotes.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../permissions/permissions.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quoteSettingsService: QuoteSettingsService,
    private readonly pdfService: PdfService,
  ) {}

  @Get('settings')
  @Permissions('quotes:view')
  getSettings() {
    return this.quoteSettingsService.getSettings();
  }

  @Patch('settings')
  @Permissions('quotes:edit')
  updateSettings(@Body() dto: UpdateQuoteSettingsDto) {
    return this.quoteSettingsService.updateSettings(dto);
  }

  @Get()
  @Permissions('quotes:view')
  findAll(
    @Query('leadId') leadId?: string,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.quotesService.findAll({ leadId, clientId, projectId, status });
  }

  @Get(':id/pdf')
  @Permissions('quotes:view')
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateQuotePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/scope-pdf')
  @Permissions('quotes:view')
  async downloadScopePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.pdfService.generateScopePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="scope-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  @Permissions('quotes:view')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Post()
  @Permissions('quotes:create')
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.quotesService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('quotes:edit')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('quotes:delete')
  delete(@Param('id') id: string) {
    return this.quotesService.delete(id);
  }

  @Post(':id/send')
  @Permissions('quotes:edit')
  send(@Param('id') id: string) {
    return this.quotesService.send(id);
  }

  @Post(':id/accept')
  @Permissions('quotes:edit')
  accept(@Param('id') id: string) {
    return this.quotesService.accept(id);
  }

  @Post(':id/reject')
  @Permissions('quotes:edit')
  reject(@Param('id') id: string) {
    return this.quotesService.reject(id);
  }
}
