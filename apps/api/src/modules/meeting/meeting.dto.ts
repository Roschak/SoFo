import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpsertNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  content: string;
}
