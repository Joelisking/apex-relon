import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quotes.dto';

@Injectable()
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  private calculateTotals(
    lineItems: Array<{
      quantity: number;
      unitPrice: number;
      taxable?: boolean;
    }>,
    taxRate: number,
    discount: number,
  ) {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxableAmount = lineItems
      .filter((item) => item.taxable !== false)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  }

  async findAll(filters: {
    leadId?: string;
    clientId?: string;
    status?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.status) where.status = filters.status;

    return this.prisma.quote.findMany({
      where,
      include: {
        lead: {
          select: { id: true, contactName: true, company: true, stage: true },
        },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            contactName: true,
            company: true,
            email: true,
            stage: true,
          },
        },
        client: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async create(dto: CreateQuoteDto, userId: string) {
    const lineItemsData = (dto.lineItems || []).map(
      (item, index) => ({
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        taxable: item.taxable ?? true,
        lineTotal: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        sortOrder: item.sortOrder ?? index,
      }),
    );

    const taxRate = dto.taxRate ?? 0;
    const discount = dto.discount ?? 0;
    const { subtotal, taxAmount, total } = this.calculateTotals(
      lineItemsData,
      taxRate,
      discount,
    );

    return this.prisma.quote.create({
      data: {
        leadId: dto.leadId,
        clientId: dto.clientId,
        validUntil: dto.validUntil
          ? new Date(dto.validUntil)
          : undefined,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        taxRate,
        discount,
        subtotal,
        taxAmount,
        total,
        currency: dto.currency || 'USD',
        createdById: userId,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: {
        lead: {
          select: { id: true, contactName: true, company: true, stage: true },
        },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(id);

    // Content edits (line items, financial, metadata) require DRAFT status.
    // Status-only transitions (send/accept/reject) are allowed on any status.
    const isContentEdit =
      dto.leadId !== undefined ||
      dto.clientId !== undefined ||
      dto.validUntil !== undefined ||
      dto.notes !== undefined ||
      dto.termsAndConditions !== undefined ||
      dto.currency !== undefined ||
      dto.taxRate !== undefined ||
      dto.discount !== undefined ||
      dto.lineItems !== undefined;

    if (isContentEdit && existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotes can be edited',
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.leadId !== undefined) data.leadId = dto.leadId;
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.termsAndConditions !== undefined)
      data.termsAndConditions = dto.termsAndConditions;
    if (dto.currency) data.currency = dto.currency;
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'SENT') data.sentAt = new Date();
      if (dto.status === 'ACCEPTED') data.acceptedAt = new Date();
      if (dto.status === 'REJECTED') data.rejectedAt = new Date();
    }

    const include = {
      lead: {
        select: { id: true, contactName: true, company: true, stage: true },
      },
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
    } as const;

    // Handle line items update (replace all) — wrapped in a transaction
    if (dto.lineItems) {
      const taxRate = dto.taxRate ?? existing.taxRate;
      const discount = dto.discount ?? existing.discount;

      const lineItemsData = dto.lineItems.map((item, index) => ({
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        taxable: item.taxable ?? true,
        lineTotal: (item.quantity ?? 1) * (item.unitPrice ?? 0),
        sortOrder: item.sortOrder ?? index,
      }));

      const { subtotal, taxAmount, total } = this.calculateTotals(
        lineItemsData,
        taxRate,
        discount,
      );
      data.taxRate = taxRate;
      data.discount = discount;
      data.subtotal = subtotal;
      data.taxAmount = taxAmount;
      data.total = total;

      return this.prisma.$transaction(async (tx) => {
        await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });
        await tx.quoteLineItem.createMany({
          data: lineItemsData.map((item) => ({ ...item, quoteId: id })),
        });
        return tx.quote.update({ where: { id }, data, include });
      });
    }

    if (dto.taxRate !== undefined || dto.discount !== undefined) {
      // Recalculate with existing line items
      const lineItems = await this.prisma.quoteLineItem.findMany({
        where: { quoteId: id },
      });
      const taxRate = dto.taxRate ?? existing.taxRate;
      const discount = dto.discount ?? existing.discount;
      const { subtotal, taxAmount, total } = this.calculateTotals(
        lineItems,
        taxRate,
        discount,
      );
      data.taxRate = taxRate;
      data.discount = discount;
      data.subtotal = subtotal;
      data.taxAmount = taxAmount;
      data.total = total;
    }

    return this.prisma.quote.update({ where: { id }, data, include });
  }

  async delete(id: string) {
    const quote = await this.findOne(id);
    if (quote.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotes can be deleted',
      );
    }
    return this.prisma.quote.delete({ where: { id } });
  }

  async send(id: string) {
    return this.update(id, { status: 'SENT' });
  }

  async accept(id: string) {
    return this.update(id, { status: 'ACCEPTED' });
  }

  async reject(id: string) {
    return this.update(id, { status: 'REJECTED' });
  }
}
