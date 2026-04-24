import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { handlePrismaError } from '../common/prisma-error.handler';

@Injectable()
export class UserPreferencesService {
  private readonly logger = new Logger(UserPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, key: string): Promise<unknown | null> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId_key: { userId, key } },
    });
    return pref?.value ?? null;
  }

  async set(userId: string, key: string, value: unknown): Promise<void> {
    try {
      await this.prisma.userPreference.upsert({
        where: { userId_key: { userId, key } },
        create: { userId, key, value: value as object },
        update: { value: value as object },
      });
      this.logger.log(`set: preference saved userId=${userId} key=${key}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'set');
    }
  }

  async delete(userId: string, key: string): Promise<void> {
    try {
      await this.prisma.userPreference.deleteMany({
        where: { userId, key },
      });
      this.logger.log(`delete: preference removed userId=${userId} key=${key}`);
    } catch (error) {
      handlePrismaError(error, this.logger, 'delete');
    }
  }
}
