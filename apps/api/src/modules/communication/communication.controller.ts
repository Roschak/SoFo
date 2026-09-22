import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CreateChannelDto, EditMessageDto, SendMessageDto } from './communication.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Community moderation endpoints (PRD §93): queue listing + approve/remove
 * decisions. Both are permission-gated (`moderation.queue.view` /
 * `message.moderate`) — held by MODERATOR, ADMIN, OWNER.
 */

@Controller('workspaces/:workspaceId')
@RequireSession()
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post('channels')
  @RequirePermission('channel.create')
  async createChannel(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.communicationService.createChannel(userId, workspaceId, dto);
  }

  @Get('channels')
  @RequirePermission('channel.view')
  async listChannels(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.communicationService.listChannels(userId, workspaceId);
  }

  @Post('channels/:channelId/messages')
  @RequirePermission('message.send')
  async sendMessage(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationService.sendMessage(userId, workspaceId, channelId, dto);
  }

  @Get('channels/:channelId/messages')
  @RequirePermission('channel.view')
  async listMessages(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.communicationService.listMessages(userId, workspaceId, channelId, cursor);
  }

  @Patch('messages/:messageId')
  @RequirePermission('message.edit')
  async editMessage(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.communicationService.editMessage(userId, workspaceId, messageId, dto.content);
  }

  @Delete('messages/:messageId')
  @RequirePermission('message.delete')
  async deleteMessage(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.communicationService.deleteMessage(userId, workspaceId, messageId);
  }

  @Get('moderation/queue')
  @RequirePermission('moderation.queue.view')
  async moderationQueue(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.communicationService.listModerationQueue(userId, workspaceId);
  }

  @Post('messages/:messageId/approve')
  @RequirePermission('message.moderate')
  async approveMessage(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.communicationService.approveMessage(userId, workspaceId, messageId);
  }

  @Post('messages/:messageId/remove')
  @RequirePermission('message.moderate')
  async removeMessage(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.communicationService.removeMessage(userId, workspaceId, messageId);
  }
}
