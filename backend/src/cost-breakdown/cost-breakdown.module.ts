import { Module } from '@nestjs/common';
import { CostBreakdownController } from './cost-breakdown.controller';
import { CostBreakdownService } from './cost-breakdown.service';

@Module({
  controllers: [CostBreakdownController],
  providers: [CostBreakdownService],
})
export class CostBreakdownModule {}
