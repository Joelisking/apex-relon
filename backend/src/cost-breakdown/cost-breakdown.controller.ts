import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CostBreakdownService } from './cost-breakdown.service';
import { PdfService } from '../quotes/pdf.service';
import { CreateCostBreakdownDto } from './dto/create-cost-breakdown.dto';
import { UpdateCostBreakdownDto } from './dto/update-cost-breakdown.dto';
import { UpsertRoleEstimateDto } from './dto/upsert-role-estimate.dto';

const TENANT_ID = 'apex';

@UseGuards(JwtAuthGuard)
@Controller('cost-breakdowns')
export class CostBreakdownController {
  constructor(
    private readonly service: CostBreakdownService,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(TENANT_ID);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id, TENANT_ID);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.pdfService.generateCostBreakdownPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cost-breakdown-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post()
  create(@Body() dto: CreateCostBreakdownDto, @Request() req: any) {
    return this.service.create(dto, TENANT_ID, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCostBreakdownDto) {
    return this.service.update(id, dto, TENANT_ID);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id, TENANT_ID);
  }

  @Put('lines/:lineId/role-estimates')
  upsertRoleEstimate(
    @Param('lineId') lineId: string,
    @Body() dto: UpsertRoleEstimateDto,
  ) {
    return this.service.upsertRoleEstimate(lineId, dto, TENANT_ID);
  }

  @Delete('lines/:lineId/role-estimates/:subtaskId/:role')
  deleteRoleEstimate(
    @Param('lineId') lineId: string,
    @Param('subtaskId') subtaskId: string,
    @Param('role') role: string,
  ) {
    return this.service.deleteRoleEstimate(lineId, subtaskId, role, TENANT_ID);
  }
}
