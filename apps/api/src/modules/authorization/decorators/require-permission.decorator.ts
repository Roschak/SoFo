import { SetMetadata, applyDecorators } from '@nestjs/common';
import {
  RequireWorkspace,
  PERMISSION_KEY,
} from '../../authentication/decorators/require-session.decorator';

/** Marks an endpoint as workspace-scoped and permission-checked (PRD §55). */
export function RequirePermission(permission: string) {
  return applyDecorators(RequireWorkspace(), SetMetadata(PERMISSION_KEY, permission));
}
