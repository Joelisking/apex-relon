import { Module } from '@nestjs/common';
import { BottleneckController } from './bottleneck.controller';
import { BottleneckService } from './bottleneck.service';
import { DatabaseModule } from '../database/database.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [BottleneckController],
  providers: [BottleneckService],
  exports: [BottleneckService],
})
export class BottleneckModule {}
