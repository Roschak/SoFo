import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminTrendQueryDto } from './admin.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Admin dashboard endpoints (PRD §92). Every route requires
 * `workspace.settings.manage` — only OWNER/ADMIN default roles hold it.
 * The workspace mode is irrelevant here: both COMMUNITY and ENTERPRISE
 * workspaces get the same aggregate view, scoped to their own tenant.
 */
@Controller('workspaces/:workspaceId/admin')
@RequireSession()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @RequirePermission('workspace.settings.manage')
  async stats(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: AdminTrendQueryDto,
  ) {
    return this.adminService.getOverview(userId, workspaceId, query.days ?? 14);
  }

  @Get('suspended')
  @RequirePermission('workspace.settings.manage')
  async suspended(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    const items = await this.adminService.listSuspendedUsers(userId, workspaceId);
    return { items };
  }
}
