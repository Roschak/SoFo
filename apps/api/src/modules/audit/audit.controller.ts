import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ListAuditQueryDto } from './audit.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Audit viewer (PRD §49, §91). Workspace-scoped: only members holding
 * 'audit.view' may read the trail — every other role gets 403 like any
 * missing resource (no probing, PRD §139).
 */
@Controller('workspaces/:workspaceId/audit')
@RequireSession()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('audit.view')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListAuditQueryDto,
  ) {
    return this.auditService.listLogs(userId, workspaceId, query);
  }
}
