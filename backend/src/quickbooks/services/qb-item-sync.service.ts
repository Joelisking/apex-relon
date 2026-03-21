import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbTokenService } from './qb-token.service';
import { QbApiClient } from '../api/qb-api.client';

@Injectable()
export class QbItemSyncService {
  private readonly logger = new Logger(QbItemSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qbToken: QbTokenService,
  ) {}

  async syncServiceItems(): Promise<{
    pulled: number;
    synced: number;
    skipped: number;
    errors: number;
  }> {
    const { client: qbClient, realmId } = await this.qbToken.getApiClient();
    const pulled = await this.pullQbServiceItems(qbClient, realmId);
    const { synced, skipped, errors } = await this.pushCrmServiceItems(qbClient, realmId);
    return { pulled, synced, skipped, errors };
  }

  private async pullQbServiceItems(qbClient: QbApiClient, realmId: string): Promise<number> {
    const PAGE_SIZE = 100;
    let startPosition = 1;
    const qbItems: any[] = [];
    while (true) {
      const query = `SELECT * FROM Item WHERE Type = 'Service' AND Active = true STARTPOSITION ${startPosition} MAXRESULTS ${PAGE_SIZE}`;
      const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
      const page: any[] = res?.QueryResponse?.Item ?? [];
      qbItems.push(...page);
      if (page.length < PAGE_SIZE) break;
      startPosition += PAGE_SIZE;
    }

    let count = 0;
    for (const qbItem of qbItems) {
      try {
        const qbId: string = qbItem.Id;
        const name: string = qbItem.Name ?? '';
        const description: string | null = qbItem.Description ?? null;
        const defaultPrice: number | null = qbItem.UnitPrice ?? null;

        let existing = await this.prisma.serviceItem.findFirst({ where: { qbItemId: qbId } });

        if (!existing) {
          existing = await this.prisma.serviceItem.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
          });
          if (existing) {
            this.logger.log(`Linking QB Item "${name}" (${qbId}) to CRM ServiceItem ${existing.id} by name match`);
          }
        }

        if (existing) {
          await this.prisma.serviceItem.update({
            where: { id: existing.id },
            data: {
              qbItemId: qbId,
              ...(description !== null && { description }),
              ...(defaultPrice !== null && { defaultPrice }),
            },
          });
        } else {
          existing = await this.prisma.serviceItem.create({
            data: { name, description, defaultPrice, qbItemId: qbId, isActive: true },
          });
        }

        await this.prisma.quickBooksSync.create({
          data: {
            realmId,
            direction: 'QB_TO_CRM',
            entityType: 'Item',
            externalId: qbId,
            internalId: existing.id,
            status: 'success',
          },
        });

        count++;
      } catch (e: any) {
        this.logger.warn(`Failed to pull QB Item ${qbItem.Id}`, e?.message);
        await this.prisma.quickBooksSync
          .create({
            data: {
              realmId,
              direction: 'QB_TO_CRM',
              entityType: 'Item',
              externalId: qbItem.Id,
              status: 'error',
              errorMessage: e?.message ?? 'Unknown error',
            },
          })
          .catch(() => {});
      }
    }

    this.logger.log(`Pulled ${count} QB service items`);
    return count;
  }

  private async pushCrmServiceItems(
    qbClient: QbApiClient,
    realmId: string,
  ): Promise<{ synced: number; skipped: number; errors: number }> {
    let synced = 0, skipped = 0, errors = 0;

    const items = await this.prisma.serviceItem.findMany({
      where: { isActive: true, qbItemId: null },
    });

    const incomeAccountRef = await this.qbToken.getIncomeAccountRef(qbClient);

    for (const item of items) {
      try {
        const res = await qbClient.post('/item', {
          Name: item.name,
          Type: 'Service',
          ...(item.description && { Description: item.description }),
          ...(item.defaultPrice != null && { UnitPrice: item.defaultPrice }),
          IncomeAccountRef: incomeAccountRef,
        });
        const qbId = res?.Item?.Id;
        if (!qbId) { skipped++; continue; }

        await this.prisma.serviceItem.update({
          where: { id: item.id },
          data: { qbItemId: qbId },
        });
        await this.prisma.quickBooksSync.create({
          data: {
            realmId,
            direction: 'CRM_TO_QB',
            entityType: 'Item',
            externalId: qbId,
            internalId: item.id,
            status: 'success',
          },
        });
        synced++;
      } catch (e: any) {
        this.logger.warn(`Failed to push service item ${item.id} to QB`, e?.message);
        await this.prisma.quickBooksSync
          .create({
            data: {
              realmId,
              direction: 'CRM_TO_QB',
              entityType: 'Item',
              internalId: item.id,
              status: 'error',
              errorMessage: e?.message ?? 'Unknown error',
            },
          })
          .catch(() => {});
        errors++;
      }
    }

    return { synced, skipped, errors };
  }
}
