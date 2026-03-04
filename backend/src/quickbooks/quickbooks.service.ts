import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QbCallbackDto } from './dto/qb-callback.dto';

// Simple fetch-based QB API client (no axios dependency)
export class QbApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(`QB API ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async get(path: string): Promise<any> {
    return this.request(path);
  }

  async post(path: string, body: unknown): Promise<any> {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  }
}

@Injectable()
export class QuickBooksService {
  private readonly logger = new Logger(QuickBooksService.name);

  private get clientId(): string {
    return process.env.QB_CLIENT_ID ?? '';
  }
  private get clientSecret(): string {
    return process.env.QB_CLIENT_SECRET ?? '';
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
    return `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
  }

  constructor(private readonly prisma: PrismaService) {}

  // ─── OAuth ────────────────────────────────────────────────────────────────

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

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Fetch company info
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

  async getStatus(): Promise<{ connected: boolean; companyName?: string; lastSyncAt?: Date; realmId?: string }> {
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

  // ─── Token Management ─────────────────────────────────────────────────────

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

  private async refreshToken(conn: { id: string; realmId: string; refreshToken: string }): Promise<{ token: string; realmId: string }> {
    this.logger.log('Refreshing QB access token...');
    const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: this.basicAuth },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken }).toString(),
    });
    const data = await res.json();
    const { access_token, refresh_token, expires_in } = data;
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    await this.prisma.quickBooksConnection.update({
      where: { id: conn.id },
      data: { accessToken: access_token, refreshToken: refresh_token, tokenExpiry },
    });
    return { token: access_token, realmId: conn.realmId };
  }

  // ─── QB API Client Factory ────────────────────────────────────────────────

  async getApiClient(): Promise<{ client: QbApiClient; realmId: string }> {
    const { token, realmId } = await this.getValidAccessToken();
    const client = new QbApiClient(`${this.qbBaseUrl}/v3/company/${realmId}`, token);
    return { client, realmId };
  }

  // ─── Invoice Generation ───────────────────────────────────────────────────

  async createInvoiceFromQuote(quoteId: string): Promise<{ qbInvoiceId: string }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: true, client: true },
    });
    if (!quote) throw new NotFoundException(`Quote ${quoteId} not found`);
    if (!quote.clientId) throw new BadRequestException('Quote has no client');
    if (!quote.client?.qbCustomerId) {
      throw new BadRequestException('Client is not synced to QuickBooks. Run client sync first.');
    }

    const { client: qbClient } = await this.getApiClient();

    const lineItems = await Promise.all(
      quote.lineItems.map(async (item, idx) => {
        const qbItem = await this.findOrCreateQbItem(qbClient, item.description, item.unitPrice);
        return {
          LineNum: idx + 1,
          Amount: item.lineTotal,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: qbItem.Id, name: qbItem.Name },
            Qty: item.quantity,
            UnitPrice: item.unitPrice,
          },
        };
      }),
    );

    const res = await qbClient.post('/invoice', {
      Line: lineItems,
      CustomerRef: { value: quote.client.qbCustomerId },
      TaxRate: quote.taxRate,
      ...(quote.validUntil && { DueDate: quote.validUntil.toISOString().split('T')[0] }),
    });

    const qbInvoiceId = res?.Invoice?.Id;
    if (!qbInvoiceId) throw new BadRequestException('QB did not return an Invoice ID');

    await this.prisma.quote.update({ where: { id: quoteId }, data: { qbInvoiceId, qbPaymentStatus: 'unpaid' } });
    await this.prisma.quickBooksSync.create({
      data: { direction: 'CRM_TO_QB', entityType: 'Invoice', externalId: qbInvoiceId, internalId: quoteId, status: 'success' },
    });

    this.logger.log(`Created QB Invoice ${qbInvoiceId} from Quote ${quoteId}`);
    return { qbInvoiceId };
  }

  private async findOrCreateQbItem(qbClient: QbApiClient, name: string, unitPrice: number): Promise<{ Id: string; Name: string }> {
    const query = `SELECT * FROM Item WHERE Name = '${name.replace(/'/g, "\\'")}'`;
    const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
    const existing = res?.QueryResponse?.Item?.[0];
    if (existing) return { Id: existing.Id, Name: existing.Name };

    const createRes = await qbClient.post('/item', {
      Name: name.slice(0, 100),
      Type: 'Service',
      UnitPrice: unitPrice,
      IncomeAccountRef: { value: '1', name: 'Services' },
    });
    const item = createRes?.Item;
    return { Id: item.Id, Name: item.Name };
  }

  // ─── Payment Tracking ─────────────────────────────────────────────────────

  async syncPayments(): Promise<{ updated: number }> {
    const { client: qbClient } = await this.getApiClient();
    const query = 'SELECT * FROM Payment MAXRESULTS 100 ORDERBY TxnDate DESC';
    const res = await qbClient.get(`/query?query=${encodeURIComponent(query)}`);
    const payments: any[] = res?.QueryResponse?.Payment ?? [];

    let updated = 0;
    for (const payment of payments) {
      const invoiceId = payment.Line?.[0]?.LinkedTxn?.[0]?.TxnId;
      if (!invoiceId) continue;
      const quote = await this.prisma.quote.findFirst({ where: { qbInvoiceId: invoiceId } });
      if (!quote) continue;

      await this.prisma.quote.update({ where: { id: quote.id }, data: { qbPaymentStatus: 'paid' } });
      await this.prisma.quickBooksSync.create({
        data: { direction: 'QB_TO_CRM', entityType: 'Payment', externalId: payment.Id, internalId: quote.id, status: 'success' },
      });
      updated++;
    }
    return { updated };
  }

  // ─── Sync History ─────────────────────────────────────────────────────────

  async getSyncHistory(limit = 50) {
    return this.prisma.quickBooksSync.findMany({ orderBy: { syncedAt: 'desc' }, take: limit });
  }
}
