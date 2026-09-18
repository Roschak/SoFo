import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthorizationModule, AuditModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
