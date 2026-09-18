import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto, GetCalendarQueryDto, ListRemindersQueryDto } from './calendar.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Calendar endpoints (PRD §41, §86). Viewing requires workspace.view
 * (every member sees the shared calendar); mutating manual events
 * requires calendar.event.create (OWNER/ADMIN/MANAGER).
 */
@Controller('workspaces/:workspaceId/calendar')
@RequireSession()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @RequirePermission('workspace.view')
  async getCalendar(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: GetCalendarQueryDto,
  ) {
    return this.calendarService.getCalendar(userId, workspaceId, query);
  }

  @Get('reminders')
  @RequirePermission('workspace.view')
  async listReminders(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListRemindersQueryDto,
  ) {
    return this.calendarService.listReminders(userId, workspaceId, query.horizonDays ?? 7);
  }

  @Post('events')
  @RequirePermission('calendar.event.create')
  async createEvent(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.calendarService.createEvent(userId, workspaceId, dto);
  }

  @Delete('events/:eventId')
  @RequirePermission('calendar.event.create')
  async deleteEvent(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.calendarService.deleteEvent(userId, workspaceId, eventId);
  }
}
