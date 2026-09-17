import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { SofoExceptionFilter } from './shared/api.exception.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  providers: [{ provide: APP_FILTER, useClass: SofoExceptionFilter }],
})
export class AppModule {}
