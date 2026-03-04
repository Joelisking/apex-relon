import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { Response } from 'express';
import { QuickBooksService } from './quickbooks.service';
import { QuickBooksSyncService } from './quickbooks-sync.service';
import { QuickBooksWebhookService } from './quickbooks-webhook.service';
import { QbCallbackDto } from './dto/qb-callback.dto';
import { QbCreateInvoiceDto } from './dto/qb-create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('quickbooks')
export class QuickBooksController {
  constructor(
    private readonly qbService: QuickBooksService,
    private readonly syncService: QuickBooksSyncService,
    private readonly webhookService: QuickBooksWebhookService,
  ) {}

  // ─── OAuth ─────────────────────────────────────────────────────────────

  @Get('connect')
  @Public()
  connect(@Res() res: Response) {
    const url = this.qbService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @Get('callback')
  @Public()
  async callback(
    @Query() dto: QbCallbackDto,
    @Res() res: Response,
  ) {
    await this.qbService.handleCallback(dto);
    // Redirect back to admin QB page
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    return res.redirect(`${frontendUrl}/admin/quickbooks?connected=true`);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect() {
    await this.qbService.disconnect();
    return { message: 'QuickBooks disconnected' };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus() {
    return this.qbService.getStatus();
  }

  // ─── Sync ──────────────────────────────────────────────────────────────

  @Post('sync/clients')
  @UseGuards(JwtAuthGuard)
  async syncClients() {
    const result = await this.syncService.syncClients();
    await this.syncService.updateLastSyncAt();
    return result;
  }

  @Post('sync/payments')
  @UseGuards(JwtAuthGuard)
  async syncPayments() {
    const result = await this.qbService.syncPayments();
    return result;
  }

  @Get('sync/history')
  @UseGuards(JwtAuthGuard)
  async getSyncHistory(@Query('limit') limit?: string) {
    return this.qbService.getSyncHistory(limit ? parseInt(limit, 10) : 50);
  }

  // ─── Invoices ──────────────────────────────────────────────────────────

  @Post('invoices')
  @UseGuards(JwtAuthGuard)
  async createInvoice(@Body() dto: QbCreateInvoiceDto) {
    return this.qbService.createInvoiceFromQuote(dto.quoteId);
  }

  // ─── Webhook ───────────────────────────────────────────────────────────

  @Post('webhook')
  async webhook(
    @Headers('intuit-signature') signature: string,
    @Req() req: RawBodyRequest<any>,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody?.toString('utf-8') ?? JSON.stringify(body);
    await this.webhookService.handleWebhook(body, signature, rawBody);
    return { ok: true };
  }
}
