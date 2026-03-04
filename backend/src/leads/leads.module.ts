import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadMetricsService } from './lead-metrics.service';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AiModule, AuditModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadMetricsService],
})
export class LeadsModule {}
