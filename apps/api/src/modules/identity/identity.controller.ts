import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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

class LookupQueryDto {
  @IsEmail()
  email: string;
}

@Controller('users')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('lookup')
  @RequireSession()
  async lookup(@Query() query: LookupQueryDto) {
    return this.identityService.lookupByEmail(query.email);
  }

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
