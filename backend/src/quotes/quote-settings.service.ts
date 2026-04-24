import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateQuoteSettingsDto } from './dto/quotes.dto';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class QuoteSettingsService {
  private readonly logger = new Logger(QuoteSettingsService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const existing = await this.prisma.quoteSettings.findFirst();
    if (existing) return existing;

    try {
      const created = await this.prisma.quoteSettings.create({ data: {} });
      this.logger.log('[getSettings] Quote settings initialised');
      return created;
    } catch (error) {
      handlePrismaError(error, this.logger, 'getSettings.create');
    }
  }

  async updateSettings(dto: UpdateQuoteSettingsDto) {
    const existing = await this.prisma.quoteSettings.findFirst();

    if (existing) {
      try {
        const result = await this.prisma.quoteSettings.update({
          where: { id: existing.id },
          data: dto,
        });
        this.logger.log(`[updateSettings] Quote settings updated: id=${existing.id}`);
        return result;
      } catch (error) {
        handlePrismaError(error, this.logger, 'updateSettings.update');
      }
    }

    try {
      const result = await this.prisma.quoteSettings.create({ data: dto });
      this.logger.log('[updateSettings] Quote settings created');
      return result;
    } catch (error) {
      handlePrismaError(error, this.logger, 'updateSettings.create');
    }
  }
}
