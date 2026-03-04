import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService } from './ai.service';
import { Permissions } from '../permissions/permissions.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('executive-summary')
  @Permissions('dashboard:view')
  async generateExecutiveSummary(
    @Body() body: { metrics: Record<string, unknown>; provider?: string },
  ) {
    return this.aiService.generateExecutiveSummary(
      body.metrics,
      body.provider,
    );
  }

  @Post('chat')
  @Permissions('leads:view')
  async chat(
    @Body()
    body: {
      message: string;
      context: Record<string, unknown>;
      provider?: string;
    },
  ) {
    return this.aiService.chat(
      body.message,
      body.context,
      body.provider,
    );
  }

  @Get('providers')
  @Permissions('dashboard:view')
  getProviders() {
    return {
      available: this.aiService.getAvailableProviders(),
      default: this.aiService.getDefaultProvider(),
    };
  }
}
