import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QbConnectionService } from './services/qb-connection.service';
import { QbPaymentService } from './services/qb-payment.service';
import { QbCustomerSyncService } from './services/qb-customer-sync.service';

@Injectable()
export class QuickBooksScheduleService {
  private readonly logger = new Logger(QuickBooksScheduleService.name);

  constructor(
    private readonly qbConnection: QbConnectionService,
    private readonly qbPayment: QbPaymentService,
    private readonly qbCustomerSync: QbCustomerSyncService,
  ) {}

  private async isConnected(): Promise<boolean> {
    const status = await this.qbConnection.getStatus();
    return status.connected;
  }

  // Every 30 minutes — keeps payment statuses current
  @Cron('*/30 * * * *')
  async scheduledPaymentSync(): Promise<void> {
    if (!(await this.isConnected())) return;
    try {
      const result = await this.qbPayment.syncPayments();
      if (result.updated > 0) {
        this.logger.log(`Scheduled payment sync: updated ${result.updated} payment(s)`);
      }
    } catch (e: any) {
      this.logger.error('Scheduled payment sync failed', e?.message);
    }
  }

  // Every 2 hours — keeps QB and CRM customers in sync
  @Cron('0 */2 * * *')
  async scheduledCustomerSync(): Promise<void> {
    if (!(await this.isConnected())) return;
    try {
      const result = await this.qbCustomerSync.syncClients();
      await this.qbConnection.updateLastSyncAt();
      this.logger.log(
        `Scheduled customer sync: pulled ${result.pulled}, pushed ${result.pushed}, errors ${result.errors}`,
      );
    } catch (e: any) {
      this.logger.error('Scheduled customer sync failed', e?.message);
    }
  }
}
