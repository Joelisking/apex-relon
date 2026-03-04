import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('🔄 Connecting to database...');

      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Add connection timeout
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout after 30s')), 30000)
        ),
      ]);

      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:');
      this.logger.error(error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('✅ Database disconnected');
  }
}
