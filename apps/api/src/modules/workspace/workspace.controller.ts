import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { WorkspaceService } from './workspace.service';
import {
  CreateWorkspaceDto,
  InviteMemberDto,
  UpdateWorkspaceDto,
} from './workspace.dto';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

export class SetMemberRoleDto {
  @IsString()
  @MinLength(2)
  roleName: string;
}

@Controller('workspaces')
@RequireSession()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async create(@CurrentUserId() userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(userId, dto);
  }

  @Get('mine')
  async mine(@CurrentUserId() userId: string) {
    return this.workspaceService.listWorkspacesForUser(userId);
  }

  @Get(':workspaceId')
  async get(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.workspaceService.getWorkspace(userId, workspaceId);
  }

  @Patch(':workspaceId')
  @RequirePermission('workspace.update')
  async update(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.updateWorkspace(userId, workspaceId, dto);
  }

  @Get(':workspaceId/members')
  @RequirePermission('member.view')
  async members(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.workspaceService.listMembers(userId, workspaceId);
  }

  @Post(':workspaceId/members')
  @RequirePermission('member.invite')
  async invite(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.inviteMember(userId, workspaceId, dto);
  }

  @Patch(':workspaceId/members/:memberId')
  @RequirePermission('member.role.set')
  async setRole(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: SetMemberRoleDto,
  ) {
    return this.workspaceService.setMemberRole(userId, workspaceId, memberId, dto.roleName);
  }

  @Delete(':workspaceId/members/:memberId')
  @RequirePermission('member.remove')
  async removeMember(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.workspaceService.removeMember(userId, workspaceId, memberId);
  }
}
