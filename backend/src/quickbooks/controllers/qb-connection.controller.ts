import { Controller, Get, Delete, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { QbConnectionService } from '../services/qb-connection.service';
import { QbCallbackDto } from '../dto/qb-callback.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { Permissions } from '../../permissions/permissions.decorator';

@Controller('quickbooks')
export class QbConnectionController {
  constructor(private readonly qbConnection: QbConnectionService) {}

  @Get('connect')
  @Public()
  connect(@Res() res: Response) {
    return res.redirect(this.qbConnection.getAuthorizationUrl());
  }

  @Get('callback')
  @Public()
  async callback(@Query() dto: QbCallbackDto, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    if (dto.error) {
      return res.redirect(`${frontendUrl}/admin/quickbooks?error=${encodeURIComponent(dto.error_description ?? dto.error)}`);
    }
    await this.qbConnection.handleCallback(dto as QbCallbackDto & { code: string; realmId: string });
    return res.redirect(`${frontendUrl}/admin/quickbooks?connected=true`);
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:manage')
  async disconnect() {
    await this.qbConnection.disconnect();
    return { message: 'QuickBooks disconnected' };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @Permissions('quickbooks:manage')
  getStatus() {
    return this.qbConnection.getStatus();
  }
}
