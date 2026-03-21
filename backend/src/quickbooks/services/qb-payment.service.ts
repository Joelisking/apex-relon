import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbTokenService } from './qb-token.service';

@Injectable()
export class QbPaymentService {
  private readonly logger = new Logger(QbPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
  ) {}

  async syncPayments(): Promise<{ updated: number }> {
    const { client: qbClient, realmId } = await this.qbToken.getApiClient();

    const PAGE_SIZE = 100;
    let startPosition = 1;
    const payments: any[] = [];
    while (true) {
      const query = `SELECT * FROM Payment STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
      const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
      const page: any[] = res?.QueryResponse?.Payment ?? [];
      payments.push(...page);
      if (page.length < PAGE_SIZE) break;
      startPosition += PAGE_SIZE;
    }

    let updated = 0;
    for (const payment of payments) {
      const invoiceId = payment.Line?.[0]?.LinkedTxn?.[0]?.TxnId;
      if (!invoiceId) continue;

      const quote = await this.prisma.quote.findFirst({ where: { qbInvoiceId: invoiceId } });
      if (!quote || quote.qbPaymentStatus === 'paid') continue;

      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { qbPaymentStatus: 'paid' },
      });
      await this.prisma.quickBooksSync.create({
        data: {
          realmId,
          direction: 'QB_TO_CRM',
          entityType: 'Payment',
          externalId: payment.Id,
          internalId: quote.id,
          status: 'success',
        },
      });

      if (quote.clientId) {
        await this.recalculateClientRevenue(quote.clientId);
      }

      updated++;
    }

    return { updated };
  }

  async recalculateClientRevenue(clientId: string): Promise<void> {
    const agg = await this.prisma.quote.aggregate({
      where: { clientId, qbPaymentStatus: 'paid' },
      _sum: { total: true },
    });
    await this.prisma.client.update({
      where: { id: clientId },
      data: { lifetimeRevenue: agg._sum.total ?? 0 },
    });
  }
}
