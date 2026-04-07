import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsCostService } from './projects-cost.service';
import { ProjectsAssignmentService } from './projects-assignment.service';
import { ProjectsBulkService } from './projects-bulk.service';
import { ProjectsServiceItemsService } from './projects-service-items.service';
import { ProjectsController } from './projects.controller';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectsCostService,
    ProjectsAssignmentService,
    ProjectsBulkService,
    ProjectsServiceItemsService,
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
