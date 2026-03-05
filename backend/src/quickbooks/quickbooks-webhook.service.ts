import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { QuickBooksSyncService } from './quickbooks-sync.service';
import { QuickBooksService } from './quickbooks.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbService: QuickBooksService,
    private readonly syncService: QuickBooksSyncService,
  ) {}

  verifySignature(payload: string, signature: string): boolean {
    const verifierToken = process.env.QB_WEBHOOK_VERIFIER_TOKEN ?? '';
    if (!verifierToken) {
      this.logger.warn('QB_WEBHOOK_VERIFIER_TOKEN not set — skipping verification in dev');
      return true;
    }
    const computed = crypto
      .createHmac('sha256', verifierToken)
      .update(payload)
      .digest('base64');
    return computed === signature;
  }

  async handleWebhook(payload: any, signature: string, rawBody: string): Promise<void> {
    if (!this.verifySignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid QB webhook signature');
    }

    const notifications: any[] = payload?.eventNotifications ?? [];
    for (const notification of notifications) {
      const entities: any[] = notification?.dataChangeEvent?.entities ?? [];
      for (const entity of entities) {
        await this.handleEntityChange(entity);
      }
    }
  }

  private async handleEntityChange(entity: {
    name: string;
    id: string;
    operation: string;
    lastUpdated: string;
  }): Promise<void> {
    this.logger.log(`QB webhook: ${entity.operation} ${entity.name} ${entity.id}`);

    try {
      switch (entity.name) {
        case 'Customer':
          await this.handleCustomerChange(entity.id, entity.operation);
          break;
        case 'Invoice':
          await this.handleInvoiceChange(entity.id, entity.operation);
          break;
        case 'Payment':
          await this.qbService.syncPayments();
          break;
        default:
          this.logger.debug(`Unhandled QB entity type: ${entity.name}`);
      }
    } catch (e) {
      this.logger.error(`Failed to handle QB webhook for ${entity.name} ${entity.id}`, e?.message);
    }
  }

  private async handleCustomerChange(qbCustomerId: string, operation: string): Promise<void> {
    if (operation === 'Delete') {
      await this.prisma.client.updateMany({
        where: { qbCustomerId },
        data: { qbCustomerId: null },
      });
      return;
    }

    // Re-sync the specific customer
    const { client: qbClient } = await this.qbService.getApiClient();
    const res = await qbClient.get(`/customer/${qbCustomerId}`);
    const customer = res?.Customer;
    if (!customer) return;

    const email = customer.PrimaryEmailAddr?.Address ?? null;
    const existing = await this.prisma.client.findFirst({
      where: { qbCustomerId },
    });

    if (existing) {
      // QB wins for contact info on updates from QB
      await this.prisma.client.update({
        where: { id: existing.id },
        data: {
          ...(email && { email }),
          ...(customer.PrimaryPhone?.FreeFormNumber && {
            phone: customer.PrimaryPhone.FreeFormNumber,
          }),
        },
      });
    }

    await this.prisma.quickBooksSync.create({
      data: {
        direction: 'QB_TO_CRM',
        entityType: 'Customer',
        externalId: qbCustomerId,
        internalId: existing?.id ?? null,
        status: 'success',
      },
    });
  }

  private async handleInvoiceChange(qbInvoiceId: string, operation: string): Promise<void> {
    if (operation === 'Delete') {
      await this.prisma.quote.updateMany({
        where: { qbInvoiceId },
        data: { qbInvoiceId: null, qbPaymentStatus: 'voided' },
      });
      return;
    }

    // Check payment status
    const { client: qbClient } = await this.qbService.getApiClient();
    const res = await qbClient.get(`/invoice/${qbInvoiceId}`);
    const invoice = res?.Invoice;
    if (!invoice) return;

    const balance = invoice.Balance ?? 0;
    const total = invoice.TotalAmt ?? 0;
    let paymentStatus = 'unpaid';
    if (balance === 0 && total > 0) paymentStatus = 'paid';
    else if (balance < total && balance > 0) paymentStatus = 'partial';

    await this.prisma.quote.updateMany({
      where: { qbInvoiceId },
      data: { qbPaymentStatus: paymentStatus },
    });
  }
}
