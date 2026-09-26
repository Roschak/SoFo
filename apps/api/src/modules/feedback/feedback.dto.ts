import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const FEEDBACK_TYPES = ['BUG', 'UX', 'FEATURE_REQUEST'] as const;
const DECISION_STATUSES = ['REVIEWED', 'ACCEPTED', 'REJECTED'] as const;

/** POST /workspaces/:workspaceId/feedback (PRD §98). */
export class SubmitFeedbackDto {
  @IsIn(FEEDBACK_TYPES)
  type: string;

  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  message: string;
}

/** GET /workspaces/:workspaceId/feedback */
export class ListFeedbackQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'REVIEWED', 'ACCEPTED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1)
  mine?: number;
}

/** POST /workspaces/:workspaceId/feedback/:feedbackId/decision */
export class DecideFeedbackDto {
  @IsIn(DECISION_STATUSES)
  status: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
