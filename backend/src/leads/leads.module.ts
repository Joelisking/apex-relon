import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadMetricsService } from './lead-metrics.service';
import { LeadsQueryService } from './leads-query.service';
import { LeadsMutationService } from './leads-mutation.service';
import { LeadsAiService } from './leads-ai.service';
import { LeadRepsService } from './lead-reps.service';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AiModule, AuditModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadsQueryService,
    LeadsMutationService,
    LeadsAiService,
    LeadRepsService,
    LeadMetricsService,
  ],
})
export class LeadsModule {}
