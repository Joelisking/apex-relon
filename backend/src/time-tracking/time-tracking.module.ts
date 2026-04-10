import { Module } from '@nestjs/common';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';
import { DatabaseModule } from '../database/database.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [DatabaseModule, ProjectsModule],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
