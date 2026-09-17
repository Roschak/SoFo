import { Body, Controller, Get, Patch } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IdentityService } from './identity.service';
import { CurrentUserId } from '../authentication/decorators/current-user.decorator';
import { RequireSession } from '../authentication/decorators/require-session.decorator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;
}

@Controller('users')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('me')
  @RequireSession()
  async getMe(@CurrentUserId() userId: string) {
    return this.identityService.getProfile(userId);
  }

  @Patch('me')
  @RequireSession()
  async updateMe(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return this.identityService.updateProfile(userId, dto);
  }
}
