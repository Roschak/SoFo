import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthenticationService } from './authentication.service';
import { IdentityService } from '../identity/identity.service';
import {
  CurrentSessionToken,
  CurrentUserId,
} from './decorators/current-user.decorator';
import { RequireSession } from './decorators/require-session.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly identityService: IdentityService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authenticationService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authenticationService.login(dto.email, dto.password);
  }

  @Delete('session')
  @RequireSession()
  async logout(@CurrentSessionToken() token: string) {
    await this.authenticationService.logout(token);
    return { success: true };
  }

  @Get('session')
  @RequireSession()
  async session(@CurrentUserId() userId: string) {
    return this.identityService.getProfile(userId);
  }
}
