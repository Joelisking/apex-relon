import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbCallbackDto } from '../dto/qb-callback.dto';

@Injectable()
export class QbConnectionService {
  private readonly logger = new Logger(QbConnectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get clientId(): string {
    return process.env.QB_CLIENT_ID ?? '';
  }
  private get redirectUri(): string {
    return process.env.QB_REDIRECT_URI ?? '';
  }
  private get environment(): string {
    return process.env.QB_ENVIRONMENT ?? 'sandbox';
  }
  private get qbBaseUrl(): string {
    return this.environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  }
  private get basicAuth(): string {
    const secret = process.env.QB_CLIENT_SECRET ?? '';
    return `Basic ${Buffer.from(`${this.clientId}:${secret}`).toString('base64')}`;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'com.intuit.quickbooks.accounting',
      state: Buffer.from(Date.now().toString()).toString('base64'),
    });
    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  async handleCallback(dto: QbCallbackDto): Promise<{ companyName: string }> {
    const tokenRes = await fetch(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.basicAuth,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: dto.code,
          redirect_uri: this.redirectUri,
        }).toString(),
      },
    );
    const { access_token, refresh_token, expires_in } = await tokenRes.json();
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    let companyName = 'Unknown';
    try {
      const infoRes = await fetch(
        `${this.qbBaseUrl}/v3/company/${dto.realmId}/companyinfo/${dto.realmId}`,
        { headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' } },
      );
      const infoData = await infoRes.json();
      companyName = infoData?.CompanyInfo?.CompanyName ?? 'Unknown';
    } catch (e: any) {
      this.logger.warn('Could not fetch company info from QB', e?.message);
    }

    await this.prisma.quickBooksConnection.upsert({
      where: { realmId: dto.realmId },
      update: { accessToken: access_token, refreshToken: refresh_token, tokenExpiry, companyName, isActive: true, lastSyncAt: null },
      create: { realmId: dto.realmId, accessToken: access_token, refreshToken: refresh_token, tokenExpiry, companyName, isActive: true },
    });

    this.logger.log(`QB connected: ${companyName} (realm: ${dto.realmId})`);
    return { companyName };
  }

  async disconnect(): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    this.logger.log('QB disconnected');
  }

  async getStatus(): Promise<{
    connected: boolean;
    companyName?: string;
    lastSyncAt?: Date;
    realmId?: string;
  }> {
    const conn = await this.prisma.quickBooksConnection.findFirst({
      where: { isActive: true },
      orderBy: { connectedAt: 'desc' },
    });
    if (!conn) return { connected: false };
    return {
      connected: true,
      companyName: conn.companyName ?? undefined,
      lastSyncAt: conn.lastSyncAt ?? undefined,
      realmId: conn.realmId,
    };
  }

  async getSyncHistory(limit = 50) {
    const conn = await this.prisma.quickBooksConnection.findFirst({
      where: { isActive: true },
      select: { realmId: true },
    });
    return this.prisma.quickBooksSync.findMany({
      where: conn ? { OR: [{ realmId: conn.realmId }, { realmId: null }] } : {},
      orderBy: { syncedAt: 'desc' },
      take: limit,
    });
  }

  async updateLastSyncAt(): Promise<void> {
    await this.prisma.quickBooksConnection.updateMany({
      where: { isActive: true },
      data: { lastSyncAt: new Date() },
    });
  }
}
