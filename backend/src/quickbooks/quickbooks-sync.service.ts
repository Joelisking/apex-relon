import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QuickBooksService } from './quickbooks.service';

@Injectable()
export class QuickBooksSyncService {
  private readonly logger = new Logger(QuickBooksSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbService: QuickBooksService,
  ) {}

  // ─── Client Sync (Bidirectional) ─────────────────────────────────────────

  async syncClients(): Promise<{ pulled: number; pushed: number; errors: number }> {
    let pulled = 0;
    let pushed = 0;
    let errors = 0;

    // QB → CRM: pull all QB Customers
    try {
      pulled = await this.pullQbCustomers();
    } catch (e) {
      this.logger.error('QB→CRM customer pull failed', e?.message);
      errors++;
    }

    // CRM → QB: push CRM clients that have no qbCustomerId yet
    try {
      pushed = await this.pushCrmClients();
    } catch (e) {
      this.logger.error('CRM→QB client push failed', e?.message);
      errors++;
    }

    return { pulled, pushed, errors };
  }

  private async pullQbCustomers(): Promise<number> {
    const { client: qbClient } = await this.qbService.getApiClient();
    const query = 'SELECT * FROM Customer MAXRESULTS 1000 WHERE Active = true';
    const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
    const customers: any[] = res.data?.QueryResponse?.Customer ?? [];

    let count = 0;
    for (const customer of customers) {
      try {
        const email = customer.PrimaryEmailAddr?.Address ?? null;
        const qbId = customer.Id;

        // Match by existing qbCustomerId or email
        const existing = await this.prisma.client.findFirst({
          where: {
            OR: [
              { qbCustomerId: qbId },
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (existing) {
          // Update QB ID if missing
          if (!existing.qbCustomerId) {
            await this.prisma.client.update({
              where: { id: existing.id },
              data: { qbCustomerId: qbId },
            });
          }
        } else {
          // Create new CRM client from QB customer
          await this.prisma.client.create({
            data: {
              name: customer.DisplayName ?? customer.CompanyName ?? 'Unknown',
              email: email ?? null,
              phone: customer.PrimaryPhone?.FreeFormNumber ?? null,
              address: customer.BillAddr
                ? [customer.BillAddr.Line1, customer.BillAddr.City, customer.BillAddr.CountrySubDivisionCode]
                    .filter(Boolean)
                    .join(', ')
                : null,
              segment: 'SMB',
              industry: 'Surveying',
              qbCustomerId: qbId,
            },
          });
        }

        await this.prisma.quickBooksSync.create({
          data: {
            direction: 'QB_TO_CRM',
            entityType: 'Customer',
            externalId: qbId,
            internalId: existing?.id ?? null,
            status: 'success',
          },
        });

        count++;
      } catch (e) {
        this.logger.warn(`Failed to sync QB Customer ${customer.Id}`, e?.message);
        await this.prisma.quickBooksSync.create({
          data: {
            direction: 'QB_TO_CRM',
            entityType: 'Customer',
            externalId: customer.Id,
            status: 'error',
            errorMessage: e?.message ?? 'Unknown error',
          },
        });
      }
    }

    this.logger.log(`Pulled ${count} QB customers`);
    return count;
  }

  private async pushCrmClients(): Promise<number> {
    const { client: qbClient } = await this.qbService.getApiClient();

    // Find CRM clients without a QB customer ID
    const unsynced = await this.prisma.client.findMany({
      where: { qbCustomerId: null },
      take: 100,
    });

    let count = 0;
    for (const crmClient of unsynced) {
      try {
        const payload: any = {
          DisplayName: crmClient.name,
          ...(crmClient.email && { PrimaryEmailAddr: { Address: crmClient.email } }),
          ...(crmClient.phone && { PrimaryPhone: { FreeFormNumber: crmClient.phone } }),
        };

        const res = await qbClient.post('/customer', payload);
        const qbId = res.data?.Customer?.Id;
        if (!qbId) continue;

        await this.prisma.client.update({
          where: { id: crmClient.id },
          data: { qbCustomerId: qbId },
        });

        await this.prisma.quickBooksSync.create({
          data: {
            direction: 'CRM_TO_QB',
            entityType: 'Customer',
            externalId: qbId,
            internalId: crmClient.id,
            status: 'success',
          },
        });

        count++;
      } catch (e) {
        this.logger.warn(`Failed to push CRM client ${crmClient.id} to QB`, e?.message);
        await this.prisma.quickBooksSync.create({
          data: {
            direction: 'CRM_TO_QB',
            entityType: 'Customer',
            internalId: crmClient.id,
            status: 'error',
            errorMessage: e?.message ?? 'Unknown error',
          },
        });
      }
    }

    this.logger.log(`Pushed ${count} CRM clients to QB`);
    return count;
  }

  // ─── Update last sync time ────────────────────────────────────────────────

  async updateLastSyncAt(): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { isActive: true },
      data: { lastSyncAt: new Date() },
    });
  }
}
