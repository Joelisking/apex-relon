import { Module } from '@nestjs/common';
import { WorkCodesController } from './work-codes.controller';
import { WorkCodesService } from './work-codes.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkCodesController],
  providers: [WorkCodesService],
  exports: [WorkCodesService],
})
export class WorkCodesModule {}
