import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthorizationModule, RealtimeModule],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
