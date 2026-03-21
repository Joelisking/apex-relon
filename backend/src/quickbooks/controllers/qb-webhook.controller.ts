import { Controller, Post, Headers, Req, Body } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { QuickBooksWebhookService } from '../quickbooks-webhook.service';

@Controller('quickbooks/webhook')
export class QbWebhookController {
  constructor(private readonly webhookService: QuickBooksWebhookService) {}

  @Post()
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
