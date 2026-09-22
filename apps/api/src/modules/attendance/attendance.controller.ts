import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceHistoryQueryDto, ClockInDto } from './attendance.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Attendance endpoints (PRD §42, §87) — Enterprise Mode workspaces only.
 * The COMMUNITY gate lives in AttendanceService.assertEnterprise so it also
 * covers permission holders; route guards here are the second layer.
 */
@Controller('workspaces/:workspaceId/attendance')
@RequireSession()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @RequirePermission('attendance.clock')
  async today(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.attendanceService.getTodayStatus(userId, workspaceId);
  }

  @Post('clock-in')
  @RequirePermission('attendance.clock')
  async clockIn(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: ClockInDto = {},
  ) {
    return this.attendanceService.clockIn(userId, workspaceId, dto?.note);
  }


  @Post('clock-out')
  @RequirePermission('attendance.clock')
  async clockOut(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.attendanceService.clockOut(userId, workspaceId);
  }

  @Get('history')
  @RequirePermission('attendance.view')
  async history(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: AttendanceHistoryQueryDto,
  ) {
    return this.attendanceService.listHistory(userId, workspaceId, query);
  }
}
