import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { LeadsModule } from './leads/leads.module';
import { ClientsModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { AiModule } from './ai/ai.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { ActivitiesModule } from './activities/activities.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './permissions/permissions.guard';
import { PermissionsModule } from './permissions/permissions.module';
import { TeamsModule } from './teams/teams.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { RolesModule } from './roles/roles.module';
// P1 Feature Modules
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { QuotesModule } from './quotes/quotes.module';
import { ProductsModule } from './products/products.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ForecastModule } from './forecast/forecast.module';
import { ContactsModule } from './contacts/contacts.module';
import { FormsModule } from './forms/forms.module';
import { ServiceItemsModule } from './service-items/service-items.module';
import { QuickBooksModule } from './quickbooks/quickbooks.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { BottleneckModule } from './bottleneck/bottleneck.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    HealthModule,
    AuthModule,
    EmailModule,
    AuditModule,
    ActivitiesModule,
    FilesModule,
    DashboardModule,
    LeadsModule,
    ClientsModule,
    ProjectsModule,
    AiModule,
    AdminModule,
    TeamsModule,
    RolesModule,
    PermissionsModule,
    PipelineModule,
    ReportsModule,
    SettingsModule,
    // P1 Features
    TasksModule,
    NotificationsModule,
    CustomFieldsModule,
    QuotesModule,
    ProductsModule,
    WorkflowsModule,
    ForecastModule,
    ContactsModule,
    FormsModule,
    ServiceItemsModule,
    QuickBooksModule,
    TimeTrackingModule,
    BottleneckModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
