import { Injectable } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { CustomerCrudService } from './customer-crud.service';
import { CustomerMetricsService } from './customer-metrics.service';
import { CustomerHealthFlagsService } from './customer-health-flags.service';

@Injectable()
export class CustomerAiService {
  constructor(
    private readonly aiService: AiService,
    private readonly crudService: CustomerCrudService,
    private readonly metricsService: CustomerMetricsService,
    private readonly healthFlagsService: CustomerHealthFlagsService,
  ) {}

  async generateHealthReport(id: string, provider?: string, userId?: string, userRole?: string) {
    const customer = await this.crudService.findOne(id, userId, userRole);

    const report = await this.aiService.generateClientHealth(customer, provider);

    await this.crudService.update(id, {
      healthScore: report.healthScore,
      aiHealthSummary: report.summary,
    });

    return report;
  }

  async generateUpsellStrategy(id: string, provider?: string, userId?: string, userRole?: string) {
    const customer = await this.crudService.findOne(id, userId, userRole);

    const strategy = await this.aiService.generateUpsellStrategy(customer, provider);

    await this.crudService.update(id, {
      aiUpsellStrategy: JSON.stringify(strategy),
    });

    return strategy;
  }

  async updateHealthStatus(id: string, provider?: string, userId?: string, userRole?: string) {
    const customer = await this.crudService.findOne(id, userId, userRole);

    if (customer.statusOverride) {
      return {
        message: 'Health status is manually overridden and will not be auto-updated',
        currentStatus: customer.status,
        overrideReason: customer.statusOverrideReason,
      };
    }

    const report = await this.aiService.generateClientHealth(customer, provider);

    const calculatedStatus = this.healthFlagsService.determineHealthStatus(
      customer.metrics?.engagementScore || 0,
      customer.metrics?.activeProjectCount || 0,
      customer.createdAt as Date,
    );

    await this.crudService.update(id, {
      status: calculatedStatus,
      healthScore: report.healthScore,
      aiHealthSummary: report.summary,
      statusLastCalculated: new Date(),
    });

    return {
      message: 'Health status updated successfully',
      status: calculatedStatus,
      healthScore: report.healthScore,
      report,
    };
  }

  async overrideHealthStatus(id: string, status: string, reason: string, userId: string, userRole?: string) {
    const customer = await this.crudService.findOne(id, userId, userRole);

    await this.crudService.update(id, { status, statusOverride: true, statusOverrideReason: reason });

    return { message: 'Health status overridden successfully', status, reason };
  }
}
