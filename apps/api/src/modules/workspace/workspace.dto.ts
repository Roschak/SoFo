import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsIn(['ENTERPRISE', 'COMMUNITY'])
  mode: 'ENTERPRISE' | 'COMMUNITY';

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;
}

export class InviteMemberDto {
  @IsString()
  @MinLength(24)
  userId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  roleName: string;
}
