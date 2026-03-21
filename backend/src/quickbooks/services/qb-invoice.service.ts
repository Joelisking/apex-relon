import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbTokenService } from './qb-token.service';
import { QbApiClient } from '../api/qb-api.client';

@Injectable()
export class QbInvoiceService {
  private readonly logger = new Logger(QbInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
  ) {}

  async createInvoiceFromQuote(quoteId: string): Promise<{ qbInvoiceId: string }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: true, client: true },
    });
    if (!quote) throw new NotFoundException(`Quote ${quoteId} not found`);
    if (!quote.clientId) throw new BadRequestException('Quote has no client');
    if (!quote.client?.qbCustomerId) {
      throw new BadRequestException(
        'Customer is not synced to QuickBooks. Run customer sync first.',
      );
    }

    const { client: qbClient } = await this.qbToken.getApiClient();

    const lineItems = await Promise.all(
      quote.lineItems.map(async (item, idx) => {
        const qbItem = await this.findOrCreateQbItem(qbClient, item.description, item.unitPrice);
        return {
          LineNum: idx + 1,
          Amount: item.lineTotal,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: qbItem.Id, name: qbItem.Name },
            Qty: item.quantity,
            UnitPrice: item.unitPrice,
          },
        };
      }),
    );

    const res = await qbClient.post('/invoice', {
      Line: lineItems,
      CustomerRef: { value: quote.client.qbCustomerId },
      ...(quote.validUntil && { DueDate: quote.validUntil.toISOString().split('T')[0] }),
    });

    const qbInvoiceId = res?.Invoice?.Id;
    if (!qbInvoiceId) throw new BadRequestException('QB did not return an Invoice ID');

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { qbInvoiceId, qbPaymentStatus: 'unpaid' },
    });
    await this.prisma.quickBooksSync.create({
      data: {
        direction: 'CRM_TO_QB',
        entityType: 'Invoice',
        externalId: qbInvoiceId,
        internalId: quoteId,
        status: 'success',
      },
    });

    this.logger.log(`Created QB Invoice ${qbInvoiceId} from Quote ${quoteId}`);
    return { qbInvoiceId };
  }

  private async findOrCreateQbItem(
    qbClient: QbApiClient,
    name: string,
    unitPrice: number,
  ): Promise<{ Id: string; Name: string }> {
    const safeName = name.replace(/'/g, "''");
    const res = await qbClient.get(
      `/query?query=${encodeURIComponent(`SELECT * FROM Item WHERE Name = '${safeName}'`)}`,
    );
    const existing = res?.QueryResponse?.Item?.[0];
    if (existing) return { Id: existing.Id, Name: existing.Name };

    const incomeAccountRef = await this.qbToken.getIncomeAccountRef(qbClient);
    const createRes = await qbClient.post('/item', {
      Name: name.slice(0, 100),
      Type: 'Service',
      UnitPrice: unitPrice,
      IncomeAccountRef: incomeAccountRef,
    });
    const item = createRes?.Item;
    return { Id: item.Id, Name: item.Name };
  }
}
