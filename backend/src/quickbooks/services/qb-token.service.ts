import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QbApiClient } from '../api/qb-api.client';

@Injectable()
export class QbTokenService {
  private readonly logger = new Logger(QbTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  get environment(): string {
    return process.env.QB_ENVIRONMENT ?? 'sandbox';
  }

  get qbBaseUrl(): string {
    return this.environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  }

  get basicAuth(): string {
    const id = process.env.QB_CLIENT_ID ?? '';
    const secret = process.env.QB_CLIENT_SECRET ?? '';
    return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
  }

  async getActiveConnection() {
    const conn = await this.prisma.quickBooksConnection.findFirst({
      where: { isActive: true },
      orderBy: { connectedAt: 'desc' },
    });
    if (!conn) throw new BadRequestException('QuickBooks is not connected');
    return conn;
  }

  async getValidAccessToken(): Promise<{ token: string; realmId: string }> {
    const conn = await this.getActiveConnection();
    if (conn.tokenExpiry.getTime() - Date.now() < 5 * 60 * 1000) {
      return this.refreshToken(conn);
    }
    return { token: conn.accessToken, realmId: conn.realmId };
  }

  private async refreshToken(conn: {
    id: string;
    realmId: string;
    refreshToken: string;
  }): Promise<{ token: string; realmId: string }> {
    this.logger.log('Refreshing QB access token...');
    const res = await fetch(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.basicAuth,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: conn.refreshToken,
        }).toString(),
      },
    );
    const data = await res.json();
    const { access_token, refresh_token, expires_in } = data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);
    await this.prisma.quickBooksConnection.update({
      where: { id: conn.id },
      data: { accessToken: access_token, refreshToken: refresh_token, tokenExpiry },
    });
    return { token: access_token, realmId: conn.realmId };
  }

  async getApiClient(): Promise<{ client: QbApiClient; realmId: string }> {
    const { token, realmId } = await this.getValidAccessToken();
    const client = new QbApiClient(
      `${this.qbBaseUrl}/v3/company/${realmId}`,
      token,
    );
    return { client, realmId };
  }

  async getIncomeAccountRef(
    qbClient: QbApiClient,
  ): Promise<{ value: string; name: string }> {
    const envId = process.env.QB_INCOME_ACCOUNT_ID;
    if (envId) return { value: envId, name: 'Services' };

    const res = await qbClient.get(
      `/query?query=${encodeURIComponent("SELECT Id, Name FROM Account WHERE AccountType = 'Income' MAXRESULTS 1")}`,
    );
    const acct = res?.QueryResponse?.Account?.[0];
    if (acct) return { value: acct.Id, name: acct.Name };
    throw new BadRequestException(
      'No Income account found in QuickBooks. Set QB_INCOME_ACCOUNT_ID in environment.',
    );
  }
}
