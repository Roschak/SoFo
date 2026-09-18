import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { SessionGuard, PermissionGuard } from './guards/session.guard';
import { IdentityModule } from '../identity/identity.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [IdentityModule, AuthorizationModule, AuditModule],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    SessionGuard,
    PermissionGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
