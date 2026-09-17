import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SESSION_KEY = 'sofo:require-session';
export const REQUIRE_WORKSPACE_KEY = 'sofo:require-workspace';
export const PERMISSION_KEY = 'sofo:permission';

export const RequireSession = () => SetMetadata(REQUIRE_SESSION_KEY, true);

export const RequireWorkspace = () => SetMetadata(REQUIRE_WORKSPACE_KEY, true);
