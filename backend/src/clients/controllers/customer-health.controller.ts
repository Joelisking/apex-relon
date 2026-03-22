import { Controller, Post, Body, Param } from '@nestjs/common';
import { CustomerAiService } from '../services/customer-ai.service';
import { CustomerLeadConversionService } from '../services/customer-lead-conversion.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../permissions/permissions.decorator';

interface AuthenticatedUser {
  id: string;
  role: string;
  email: string;
}

@Controller('clients')
export class CustomerHealthController {
  constructor(
    private readonly aiService: CustomerAiService,
    private readonly leadConversionService: CustomerLeadConversionService,
  ) {}

  @Post(':id/health')
  @Permissions('clients:health')
  generateHealthReport(
    @Param('id') id: string,
    @Body() body: { provider?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateHealthReport(id, body.provider, user.id, user.role);
  }

  @Post(':id/upsell')
  @Permissions('clients:upsell')
  generateUpsellStrategy(
    @Param('id') id: string,
    @Body() body: { provider?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.generateUpsellStrategy(id, body.provider, user.id, user.role);
  }

  @Post(':id/health/auto-update')
  @Permissions('clients:health')
  updateHealthStatus(
    @Param('id') id: string,
    @Body() body: { provider?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.updateHealthStatus(id, body.provider, user.id, user.role);
  }

  @Post(':id/health/override')
  @Permissions('clients:health')
  overrideHealthStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiService.overrideHealthStatus(id, body.status, body.reason, user.id, user.role);
  }

  @Post('convert-lead/:leadId')
  @Permissions('clients:convert', 'projects:create')
  convertLead(
    @Param('leadId') leadId: string,
    @Body()
    body: {
      projectManagerId?: string;
      projectName?: string;
      contractedValue?: number;
      endOfProjectValue?: number;
      startDate?: string;
      estimatedDueDate?: string;
      closedDate?: string;
      description?: string;
      status?: string;
      riskStatus?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.leadConversionService.convertLeadToClient(
      leadId,
      body.projectManagerId,
      {
        name: body.projectName,
        contractedValue: body.contractedValue,
        endOfProjectValue: body.endOfProjectValue,
        startDate: body.startDate,
        estimatedDueDate: body.estimatedDueDate,
        closedDate: body.closedDate,
        description: body.description,
        status: body.status,
        riskStatus: body.riskStatus,
      },
      user?.id,
    );
  }
}
