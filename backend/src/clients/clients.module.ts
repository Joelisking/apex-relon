import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

// Services
import { CustomerMetricsService } from './services/customer-metrics.service';
import { CustomerHealthFlagsService } from './services/customer-health-flags.service';
import { CustomerCrudService } from './services/customer-crud.service';
import { CustomerAiService } from './services/customer-ai.service';
import { CustomerLeadConversionService } from './services/customer-lead-conversion.service';

// Controllers
import { CustomersController } from './controllers/customers.controller';
import { CustomerHealthController } from './controllers/customer-health.controller';

const services = [
  CustomerMetricsService,
  CustomerHealthFlagsService,
  CustomerCrudService,
  CustomerAiService,
  CustomerLeadConversionService,
];

@Module({
  imports: [AiModule, DatabaseModule, AuditModule],
  controllers: [CustomersController, CustomerHealthController],
  providers: services,
  exports: [CustomerCrudService, CustomerMetricsService],
})
export class ClientsModule {}
