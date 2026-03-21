import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

// Services
import { QbTokenService } from './services/qb-token.service';
import { QbConnectionService } from './services/qb-connection.service';
import { QbPaymentService } from './services/qb-payment.service';
import { QbInvoiceService } from './services/qb-invoice.service';
import { QbCustomerSyncService } from './services/qb-customer-sync.service';
import { QbExpenseSyncService } from './services/qb-expense-sync.service';
import { QbItemSyncService } from './services/qb-item-sync.service';
import { QuickBooksWebhookService } from './quickbooks-webhook.service';
import { QuickBooksScheduleService } from './quickbooks-schedule.service';

// Controllers
import { QbConnectionController } from './controllers/qb-connection.controller';
import { QbSyncController } from './controllers/qb-sync.controller';
import { QbInvoiceController } from './controllers/qb-invoice.controller';
import { QbWebhookController } from './controllers/qb-webhook.controller';

const services = [
  QbTokenService,
  QbConnectionService,
  QbPaymentService,
  QbInvoiceService,
  QbCustomerSyncService,
  QbExpenseSyncService,
  QbItemSyncService,
  QuickBooksWebhookService,
  QuickBooksScheduleService,
];

@Module({
  imports: [DatabaseModule],
  controllers: [
    QbConnectionController,
    QbSyncController,
    QbInvoiceController,
    QbWebhookController,
  ],
  providers: services,
  exports: [
    QbConnectionService,
    QbInvoiceService,
    QbCustomerSyncService,
    QbPaymentService,
  ],
})
export class QuickBooksModule {}
