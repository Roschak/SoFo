import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { CreateMeetingDto, UpsertNoteDto } from './meeting.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

@Controller('workspaces/:workspaceId/meetings')
@RequireSession()
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @RequirePermission('meeting.create')
  async create(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetingService.createMeeting(userId, workspaceId, dto);
  }

  @Get()
  @RequirePermission('meeting.join')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.meetingService.listMeetings(userId, workspaceId);
  }

  @Post(':meetingId/start')
  @RequirePermission('meeting.manage')
  async start(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingService.startMeeting(userId, workspaceId, meetingId);
  }

  @Post(':meetingId/end')
  @RequirePermission('meeting.manage')
  async end(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingService.endMeeting(userId, workspaceId, meetingId);
  }

  @Post(':meetingId/archive')
  @RequirePermission('meeting.manage')
  async archive(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingService.archiveMeeting(userId, workspaceId, meetingId);
  }

  @Post(':meetingId/join')
  @RequirePermission('meeting.join')
  async join(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingService.joinMeeting(userId, workspaceId, meetingId);
  }

  @Put(':meetingId/notes')
  @RequirePermission('meeting.join')
  async upsertNote(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.meetingService.upsertNote(userId, workspaceId, meetingId, dto.content);
  }

  @Get(':meetingId/notes')
  @RequirePermission('meeting.join')
  async listNotes(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.meetingService.listNotes(userId, workspaceId, meetingId);
  }
}
