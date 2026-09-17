import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CreateChannelDto, EditMessageDto, SendMessageDto } from './communication.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

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
}
