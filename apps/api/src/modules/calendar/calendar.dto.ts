import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** GET /workspaces/:workspaceId/calendar query (PRD §86). */
export class GetCalendarQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** GET /workspaces/:workspaceId/calendar/reminders query. */
export class ListRemindersQueryDto {
  @IsOptional()
  @Type(() => Number) // query params arrive as strings (lesson from audit limit bug)
  @IsInt()
  @Min(1)
  @Max(90)
  horizonDays?: number;
}

/** POST /workspaces/:workspaceId/calendar/events */
export class CreateEventDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

/** DELETE /workspaces/:workspaceId/calendar/events/:eventId */
export class DeleteEventParamsDto {
  @IsUUID()
  eventId: string;
}
