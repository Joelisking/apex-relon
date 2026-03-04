import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardLayoutController } from './dashboard-layout.controller';
import { DashboardLayoutService } from './dashboard-layout.service';
import { PrismaService } from '../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [DashboardController, DashboardLayoutController],
  providers: [
    DashboardService,
    DashboardLayoutService,
    PrismaService,
    AiService,
  ],
  exports: [DashboardService, DashboardLayoutService],
})
export class DashboardModule {}
