import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QbInvoiceService } from '../services/qb-invoice.service';
import { QbCreateInvoiceDto } from '../dto/qb-create-invoice.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../permissions/permissions.decorator';

@Controller('quickbooks/invoices')
export class QbInvoiceController {
  constructor(private readonly qbInvoice: QbInvoiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:invoices')
  createInvoice(@Body() dto: QbCreateInvoiceDto) {
    return this.qbInvoice.createInvoiceFromQuote(dto.quoteId);
  }
}
