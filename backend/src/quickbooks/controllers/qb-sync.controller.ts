import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { QbConnectionService } from '../services/qb-connection.service';
import { QbCustomerSyncService } from '../services/qb-customer-sync.service';
import { QbPaymentService } from '../services/qb-payment.service';
import { QbExpenseSyncService } from '../services/qb-expense-sync.service';
import { QbItemSyncService } from '../services/qb-item-sync.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { Permissions } from '../../permissions/permissions.decorator';

@Controller('quickbooks/sync')
export class QbSyncController {
  constructor(
    private readonly qbConnection: QbConnectionService,
    private readonly qbCustomerSync: QbCustomerSyncService,
    private readonly qbPayment: QbPaymentService,
    private readonly qbExpenseSync: QbExpenseSyncService,
    private readonly qbItemSync: QbItemSyncService,
  ) {}

  @Post('clients')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:sync')
  async syncClients() {
    const result = await this.qbCustomerSync.syncClients();
    await this.qbConnection.updateLastSyncAt();
    return result;
  }

  @Post('payments')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:sync')
  syncPayments() {
    return this.qbPayment.syncPayments();
  }

  @Post('expenses')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:sync')
  async syncExpenses(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.qbExpenseSync.syncExpenses(user.id);
    await this.qbConnection.updateLastSyncAt();
    return result;
  }

  @Post('service-items')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:sync')
  async syncServiceItems() {
    const result = await this.qbItemSync.syncServiceItems();
    await this.qbConnection.updateLastSyncAt();
    return result;
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:manage')
  getSyncHistory(@Query('limit') limit?: string) {
    return this.qbConnection.getSyncHistory(limit ? parseInt(limit, 10) : 50);
  }
}
