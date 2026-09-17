import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { unauthenticated } from '@sofo/shared';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AuthenticationService } from '../authentication.service';
import {
  REQUIRE_SESSION_KEY,
  REQUIRE_WORKSPACE_KEY,
  PERMISSION_KEY,
} from '../decorators/require-session.decorator';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    sessionToken?: string;
    workspaceId?: string;
  }
}

function extractBearerToken(request: Request): string {
  const header = request.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    throw unauthenticated('Missing bearer token');
  }
  return header.slice('Bearer '.length);
}

/** Session guard — PRD §55 step 2 (authenticate). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authenticationService: AuthenticationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_SESSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const token = extractBearerToken(request);
    const user = await this.authenticationService.validateSession(token);
    request.userId = user.id;
    request.sessionToken = token;
    return true;
  }
}

/** Permission guard — PRD §55 steps 3-4 (resolve tenant, authorize). */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_WORKSPACE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const workspaceId = (request.headers['x-workspace-id'] as string | undefined) ?? '';
    const permission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    const userId = request.userId ?? '';
    await this.authorizationService.assertPermission(userId, workspaceId, permission);
    request.workspaceId = workspaceId;
    return true;
  }
}
