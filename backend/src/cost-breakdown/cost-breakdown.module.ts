import { Module } from '@nestjs/common';
import { CostBreakdownController } from './cost-breakdown.controller';
import { CostBreakdownService } from './cost-breakdown.service';
import { QuotesModule } from '../quotes/quotes.module';

@Module({
  imports: [QuotesModule],
  controllers: [CostBreakdownController],
  providers: [CostBreakdownService],
})
export class CostBreakdownModule {}
