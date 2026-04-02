import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, key: string): Promise<unknown | null> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId_key: { userId, key } },
    });
    return pref?.value ?? null;
  }

  async set(userId: string, key: string, value: unknown): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, value: value as object },
      update: { value: value as object },
    });
  }

  async delete(userId: string, key: string): Promise<void> {
    await this.prisma.userPreference.deleteMany({
      where: { userId, key },
    });
  }
}
