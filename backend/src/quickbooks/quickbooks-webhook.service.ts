import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { QbTokenService } from './services/qb-token.service';
import { QbPaymentService } from './services/qb-payment.service';

@Injectable()
export class QuickBooksWebhookService {
  private readonly logger = new Logger(QuickBooksWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
    private readonly qbPayment: QbPaymentService,
  ) {}

  verifySignature(payload: string, signature: string): boolean {
    const verifierToken = process.env.QB_WEBHOOK_VERIFIER_TOKEN;
    if (!verifierToken) {
      throw new Error('QB_WEBHOOK_VERIFIER_TOKEN is not set — cannot verify QuickBooks webhooks. Set this environment variable to enable webhook processing.');
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
      for (const entity of notification?.dataChangeEvent?.entities ?? []) {
        await this.handleEntityChange(entity).catch((e) =>
          this.logger.error(
            `Failed to handle QB webhook for ${entity.name} ${entity.id}`,
            e?.message,
          ),
        );
      }
    }
  }

  private async handleEntityChange(entity: {
    name: string;
    id: string;
    operation: string;
  }): Promise<void> {
    this.logger.log(`QB webhook: ${entity.operation} ${entity.name} ${entity.id}`);
    switch (entity.name) {
      case 'Customer':
        await this.handleCustomerChange(entity.id, entity.operation);
        break;
      case 'Invoice':
        await this.handleInvoiceChange(entity.id, entity.operation);
        break;
      case 'Payment':
        await this.qbPayment.syncPayments();
        break;
      case 'Item':
        await this.handleItemChange(entity.id, entity.operation);
        break;
      default:
        this.logger.debug(`Unhandled QB entity type: ${entity.name}`);
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

    const { client: qbClient } = await this.qbToken.getApiClient();
    const res = await qbClient.get(`/customer/${qbCustomerId}`);
    const customer = res?.Customer;
    if (!customer) return;

    const existing = await this.prisma.client.findFirst({ where: { qbCustomerId } });
    if (existing) {
      await this.prisma.client.update({
        where: { id: existing.id },
        data: {
          ...(customer.PrimaryEmailAddr?.Address && { email: customer.PrimaryEmailAddr.Address }),
          ...(customer.PrimaryPhone?.FreeFormNumber && { phone: customer.PrimaryPhone.FreeFormNumber }),
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

    const { client: qbClient } = await this.qbToken.getApiClient();
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

  private async handleItemChange(qbItemId: string, operation: string): Promise<void> {
    if (operation === 'Delete') {
      await this.prisma.serviceItem.updateMany({
        where: { qbItemId },
        data: { qbItemId: null },
      });
      await this.prisma.quickBooksSync.create({
        data: { direction: 'QB_TO_CRM', entityType: 'Item', externalId: qbItemId, status: 'success' },
      });
      return;
    }

    const { client: qbClient, realmId } = await this.qbToken.getApiClient();
    const res = await qbClient.get(`/item/${qbItemId}`);
    const item = res?.Item;
    if (!item || item.Type !== 'Service') return;

    let existing = await this.prisma.serviceItem.findFirst({ where: { qbItemId } });

    if (existing) {
      await this.prisma.serviceItem.update({
        where: { id: existing.id },
        data: {
          ...(item.Description != null && { description: item.Description }),
          ...(item.UnitPrice != null && { defaultPrice: item.UnitPrice }),
        },
      });
    } else {
      existing = await this.prisma.serviceItem.create({
        data: {
          name: item.Name ?? '',
          description: item.Description ?? null,
          defaultPrice: item.UnitPrice ?? null,
          qbItemId,
          isActive: true,
        },
      });
    }

    await this.prisma.quickBooksSync.create({
      data: {
        realmId,
        direction: 'QB_TO_CRM',
        entityType: 'Item',
        externalId: qbItemId,
        internalId: existing.id,
        status: 'success',
      },
    });
  }
}
