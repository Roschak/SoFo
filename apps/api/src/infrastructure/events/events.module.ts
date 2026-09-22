import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * In-process event bus (ADR-005): domain services emit
 * `notification.*` events after their DB commit; NotificationService
 * is the single handler that builds, stores, and pushes notifications.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Wildcard must be ON: NotificationService subscribes via 'notification.%'.
      // Listeners run in order; a slow/throwing handler must not break others.
      wildcard: true,
      ignoreErrors: true,
    }),
  ],
})
export class EventBusModule {}
