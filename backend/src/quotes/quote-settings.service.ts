import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateQuoteSettingsDto } from './dto/quotes.dto';

@Injectable()
export class QuoteSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const existing = await this.prisma.quoteSettings.findFirst();
    if (existing) return existing;

    return this.prisma.quoteSettings.create({ data: {} });
  }

  async updateSettings(dto: UpdateQuoteSettingsDto) {
    const existing = await this.prisma.quoteSettings.findFirst();

    if (existing) {
      return this.prisma.quoteSettings.update({
        where: { id: existing.id },
        data: dto,
      });
    }

    return this.prisma.quoteSettings.create({ data: dto });
  }
}
