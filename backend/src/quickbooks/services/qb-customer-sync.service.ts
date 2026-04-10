import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbTokenService } from './qb-token.service';
import { getClientDisplayName } from '../../clients/client-display.helper';

@Injectable()
export class QbCustomerSyncService {
  private readonly logger = new Logger(QbCustomerSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
  ) {}

  async syncClients(): Promise<{ pulled: number; pushed: number; errors: number }> {
    let pulled = 0, pushed = 0, errors = 0;

    try {
      pulled = await this.pullQbCustomers();
    } catch (e: any) {
      this.logger.error('QB→CRM customer pull failed', e?.message);
      errors++;
    }

    try {
      pushed = await this.pushCrmClients();
    } catch (e: any) {
      this.logger.error('CRM→QB client push failed', e?.message);
      errors++;
    }

    return { pulled, pushed, errors };
  }

  private async pullQbCustomers(): Promise<number> {
    const { client: qbClient, realmId } = await this.qbToken.getApiClient();

    const PAGE_SIZE = 1000;
    let startPosition = 1;
    const customers: any[] = [];
    while (true) {
      const query = `SELECT * FROM Customer WHERE Active = true STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
      const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
      const page: any[] = res?.QueryResponse?.Customer ?? [];
      customers.push(...page);
      if (page.length < PAGE_SIZE) break;
      startPosition += PAGE_SIZE;
    }

    let count = 0;
    for (const customer of customers) {
      try {
        const email = customer.PrimaryEmailAddr?.Address ?? null;
        const qbId = customer.Id;

        const existing = await this.prisma.client.findFirst({
          where: { OR: [{ qbCustomerId: qbId }, ...(email ? [{ email }] : [])] },
        });

        if (existing) {
          if (!existing.qbCustomerId) {
            await this.prisma.client.update({
              where: { id: existing.id },
              data: { qbCustomerId: qbId },
            });
          }
        } else {
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
            realmId,
            direction: 'QB_TO_CRM',
            entityType: 'Customer',
            externalId: qbId,
            internalId: existing?.id ?? null,
            status: 'success',
          },
        });

        count++;
      } catch (e: any) {
        this.logger.warn(`Failed to sync QB Customer ${customer.Id}`, e?.message);
        await this.prisma.quickBooksSync.create({
          data: {
            realmId,
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
    const { client: qbClient, realmId } = await this.qbToken.getApiClient();

    const unsynced = await this.prisma.client.findMany({
      where: { qbCustomerId: null },
      take: 100,
    });

    let count = 0;
    for (const crmClient of unsynced) {
      try {
        const res = await qbClient.post('/customer', {
          DisplayName: getClientDisplayName(crmClient),
          ...(crmClient.email && { PrimaryEmailAddr: { Address: crmClient.email } }),
          ...(crmClient.phone && { PrimaryPhone: { FreeFormNumber: crmClient.phone } }),
        });
        const qbId = res?.Customer?.Id;
        if (!qbId) continue;

        await this.prisma.client.update({
          where: { id: crmClient.id },
          data: { qbCustomerId: qbId },
        });
        await this.prisma.quickBooksSync.create({
          data: {
            realmId,
            direction: 'CRM_TO_QB',
            entityType: 'Customer',
            externalId: qbId,
            internalId: crmClient.id,
            status: 'success',
          },
        });
        count++;
      } catch (e: any) {
        this.logger.warn(`Failed to push CRM client ${crmClient.id} to QB`, e?.message);
        await this.prisma.quickBooksSync.create({
          data: {
            realmId,
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
}
