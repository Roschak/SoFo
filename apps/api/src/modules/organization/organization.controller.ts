import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { OrganizationService } from './organization.service';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';

export class CreateOrgUnitDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsIn(['DEPARTMENT', 'DIVISION', 'TEAM'])
  kind: 'DEPARTMENT' | 'DIVISION' | 'TEAM';

  @IsOptional()
  @IsString()
  @MinLength(24)
  parentId?: string;
}

@Controller('workspaces/:workspaceId/organization')
@RequireSession()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @RequirePermission('organization.manage')
  async create(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateOrgUnitDto,
  ) {
    return this.organizationService.createUnit(userId, workspaceId, dto);
  }

  @Get()
  @RequirePermission('workspace.view')
  async list(
    @CurrentUserId() userId: string,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.organizationService.listUnits(userId, workspaceId);
  }
}
