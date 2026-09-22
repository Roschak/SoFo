import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';

/**
 * Notification endpoints (PRD §89). Every read/write is scoped to the
 * authenticated user — no workspace param: a user's notification inbox
 * spans all their workspaces.
 */
@Controller('notifications')
@RequireSession()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return { items: await this.notificationService.listMine(userId) };
  }

  @Get('unread-count')
  async unreadCount(@CurrentUserId() userId: string) {
    return this.notificationService.unreadCount(userId);
  }

  @Post(':notificationId/read')
  async markRead(
    @CurrentUserId() userId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationService.markRead(userId, notificationId);
  }

  @Post('read-all')
  async markAllRead(@CurrentUserId() userId: string) {
    return this.notificationService.markAllRead(userId);
  }
}
