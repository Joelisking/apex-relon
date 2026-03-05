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
    const { client: qbClient, realmId } = await this.qbService.getApiClient();
    const query = 'SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000';
    const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
    const customers: any[] = res?.QueryResponse?.Customer ?? [];

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
            realmId,
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
    const { client: qbClient, realmId } = await this.qbService.getApiClient();

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
      } catch (e) {
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

  // ─── Expense Sync (QB Bills → CostLog) ───────────────────────────────────

  async syncExpenses(userId: string): Promise<{ created: number; skipped: number; errors: number }> {
    let created = 0, skipped = 0, errors = 0;

    const { client: qbClient, realmId } = await this.qbService.getApiClient();
    const query = 'SELECT * FROM Bill MAXRESULTS 100';
    const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
    const bills: any[] = res?.QueryResponse?.Bill ?? [];

    for (const bill of bills) {
      for (const line of (bill.Line ?? [])) {
        if (line.DetailType !== 'AccountBasedExpenseLineDetail') continue;
        const customerRef = line.AccountBasedExpenseLineDetail?.CustomerRef?.value;
        if (!customerRef) continue;

        const billLineId = `${bill.Id}-${line.Id}`;

        try {
          const existing = await this.prisma.quickBooksSync.findFirst({
            where: { realmId, entityType: 'Expense', externalId: billLineId },
          });
          if (existing) { skipped++; continue; }

          const crmClient = await this.prisma.client.findFirst({
            where: { qbCustomerId: customerRef },
          });
          if (!crmClient) {
            await this.logSkipped(realmId, 'Expense', billLineId, undefined, `No CRM client for QB customer ${customerRef}`);
            skipped++; continue;
          }

          const project = await this.prisma.project.findFirst({
            where: { clientId: crmClient.id, status: { notIn: ['Completed', 'Cancelled', 'Closed'] } },
            orderBy: { updatedAt: 'desc' },
          });
          if (!project) {
            await this.logSkipped(realmId, 'Expense', billLineId, crmClient.id, `No active project for client ${crmClient.id}`);
            skipped++; continue;
          }

          const costLog = await this.prisma.costLog.create({
            data: {
              projectId: project.id,
              date: bill.TxnDate ? new Date(bill.TxnDate) : new Date(),
              category: line.AccountBasedExpenseLineDetail?.AccountRef?.name ?? 'QB Import',
              description: line.Description ?? `QB Bill ${bill.Id} line ${line.Id}`,
              amount: line.Amount ?? 0,
              createdBy: userId,
            },
          });

          const sum = await this.prisma.costLog.aggregate({
            where: { projectId: project.id },
            _sum: { amount: true },
          });
          await this.prisma.project.update({
            where: { id: project.id },
            data: { totalCost: sum._sum.amount ?? 0 },
          });

          await this.prisma.quickBooksSync.create({
            data: { realmId, direction: 'QB_TO_CRM', entityType: 'Expense', externalId: billLineId, internalId: costLog.id, status: 'success' },
          });
          created++;
        } catch (e: any) {
          await this.prisma.quickBooksSync.create({
            data: { realmId, direction: 'QB_TO_CRM', entityType: 'Expense', externalId: billLineId, status: 'error', errorMessage: e?.message ?? 'Unknown error' },
          }).catch(() => {});
          errors++;
        }
      }
    }
    return { created, skipped, errors };
  }

  private async logSkipped(realmId: string, entityType: string, externalId: string, internalId: string | undefined, reason: string): Promise<void> {
    await this.prisma.quickBooksSync.create({
      data: { realmId, direction: 'QB_TO_CRM', entityType, externalId, internalId, status: 'skipped', errorMessage: reason },
    });
  }

  // ─── Update last sync time ────────────────────────────────────────────────

  async updateLastSyncAt(): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { isActive: true },
      data: { lastSyncAt: new Date() },
    });
  }
}
