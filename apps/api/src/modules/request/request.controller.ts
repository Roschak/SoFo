import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto, DecideRequestDto, ListRequestsQueryDto } from './request.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

/**
 * Request & approval endpoints (PRD §44, §45, §88).
 * Creating/canceling is scoped by request.create; deciding requires
 * request.approve; self-decision is blocked in the service.
 */
@Controller('workspaces/:workspaceId/requests')
@RequireSession()
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post()
  @RequirePermission('request.create')
  async create(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requestService.createRequest(userId, workspaceId, dto);
  }

  @Get()
  @RequirePermission('request.create')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query() query: ListRequestsQueryDto,
  ) {
    return this.requestService.listRequests(userId, workspaceId, {
      status: query.status,
      mine: query.mine !== undefined,
    });
  }

  @Post(':requestId/approve')
  @RequirePermission('request.approve')
  async approve(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.requestService.decideRequest(userId, workspaceId, requestId, 'APPROVED', dto.note);
  }

  @Post(':requestId/reject')
  @RequirePermission('request.approve')
  async reject(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.requestService.decideRequest(userId, workspaceId, requestId, 'REJECTED', dto.note);
  }

  @Delete(':requestId')
  @RequirePermission('request.create')
  async cancel(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.requestService.cancelRequest(userId, workspaceId, requestId);
  }
}
