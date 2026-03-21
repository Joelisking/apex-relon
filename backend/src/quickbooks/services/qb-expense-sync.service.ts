import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbTokenService } from './qb-token.service';

@Injectable()
export class QbExpenseSyncService {
  private readonly logger = new Logger(QbExpenseSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
  ) {}

  async syncExpenses(userId: string): Promise<{
    created: number;
    skipped: number;
    errors: number;
  }> {
    let created = 0, skipped = 0, errors = 0;
    const { client: qbClient, realmId } = await this.qbToken.getApiClient();

    const PAGE_SIZE = 100;
    let startPosition = 1;
    const bills: any[] = [];
    while (true) {
      const query = `SELECT * FROM Bill STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
      const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
      const page: any[] = res?.QueryResponse?.Bill ?? [];
      bills.push(...page);
      if (page.length < PAGE_SIZE) break;
      startPosition += PAGE_SIZE;
    }

    for (const bill of bills) {
      for (const line of bill.Line ?? []) {
        if (line.DetailType !== 'AccountBasedExpenseLineDetail') continue;
        const customerRef = line.AccountBasedExpenseLineDetail?.CustomerRef?.value;
        if (!customerRef) continue;

        const billLineId = `${bill.Id}-${line.Id}`;

        try {
          const alreadySynced = await this.prisma.quickBooksSync.findFirst({
            where: { realmId, entityType: 'Expense', externalId: billLineId },
          });
          if (alreadySynced) { skipped++; continue; }

          const crmClient = await this.prisma.client.findFirst({
            where: { qbCustomerId: customerRef },
          });
          if (!crmClient) {
            await this.logSkipped(realmId, billLineId, undefined, `No CRM client for QB customer ${customerRef}`);
            skipped++; continue;
          }

          const activeProjects = await this.prisma.project.findMany({
            where: {
              clientId: crmClient.id,
              status: { notIn: ['Completed', 'Cancelled', 'Closed'] },
            },
            orderBy: { updatedAt: 'desc' },
          });

          if (!activeProjects.length) {
            await this.logSkipped(realmId, billLineId, crmClient.id, `No active project for client ${crmClient.id}`);
            skipped++; continue;
          }
          if (activeProjects.length > 1) {
            await this.logSkipped(
              realmId,
              billLineId,
              crmClient.id,
              `Ambiguous: client ${crmClient.id} has ${activeProjects.length} active projects — manual assignment required`,
            );
            skipped++; continue;
          }

          const project = activeProjects[0];
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
            data: {
              realmId,
              direction: 'QB_TO_CRM',
              entityType: 'Expense',
              externalId: billLineId,
              internalId: costLog.id,
              status: 'success',
            },
          });
          created++;
        } catch (e: any) {
          this.logger.warn(`Failed to sync expense ${billLineId}`, e?.message);
          await this.prisma.quickBooksSync
            .create({
              data: {
                realmId,
                direction: 'QB_TO_CRM',
                entityType: 'Expense',
                externalId: billLineId,
                status: 'error',
                errorMessage: e?.message ?? 'Unknown error',
              },
            })
            .catch(() => {});
          errors++;
        }
      }
    }

    return { created, skipped, errors };
  }

  private async logSkipped(
    realmId: string,
    externalId: string,
    internalId: string | undefined,
    reason: string,
  ): Promise<void> {
    await this.prisma.quickBooksSync.create({
      data: {
        realmId,
        direction: 'QB_TO_CRM',
        entityType: 'Expense',
        externalId,
        internalId,
        status: 'skipped',
        errorMessage: reason,
      },
    });
  }
}
