import { Module } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { MeetingController } from './meeting.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [MeetingController],
  providers: [MeetingService],
})
export class MeetingModule {}
