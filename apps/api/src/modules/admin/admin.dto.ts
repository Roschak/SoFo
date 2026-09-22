import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Trend query params for GET /workspaces/:workspaceId/admin/stats.
 */
export class AdminTrendQueryDto {
  @IsOptional()
  @Type(() => Number) // query params arrive as strings — coerce before IsInt
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number;
}
