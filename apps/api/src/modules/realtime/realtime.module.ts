import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeBroadcaster } from './realtime.broadcaster';

@Module({
  imports: [AuthenticationModule, AuthorizationModule],
  providers: [RealtimeGateway, RealtimeService, RealtimeBroadcaster],
  exports: [RealtimeBroadcaster, RealtimeService],
})
export class RealtimeModule {}
