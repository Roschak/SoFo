import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthenticationController } from './modules/authentication/authentication.controller';
import { FileController } from './modules/file/file.controller';
import { RATE_LIMITS } from './infrastructure/rate-limit/rate-limits';
import { HealthModule } from './infrastructure/health/health.module';

import { SofoExceptionFilter } from './shared/api.exception.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { EventBusModule } from './infrastructure/events/events.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { FileModule } from './modules/file/file.module';
import { MeetingModule } from './modules/meeting/meeting.module';
import { ProjectModule } from './modules/project/project.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AuditModule } from './modules/audit/audit.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { RequestModule } from './modules/request/request.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventBusModule,
    PrismaModule,
    IdentityModule,
    AuthenticationModule,
    WorkspaceModule,
    AuthorizationModule,
    OrganizationModule,
    CommunicationModule,
    FileModule,
    MeetingModule,
    ProjectModule,
    RealtimeModule,
    AuditModule,
    CalendarModule,
    RequestModule,
    NotificationModule,
    AttendanceModule,
    SearchModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: SofoExceptionFilter }],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RATE_LIMITS.auth)
      .forRoutes(AuthenticationController)
      .apply(RATE_LIMITS.file)
      .forRoutes(FileController);
  }
}
