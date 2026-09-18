import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
