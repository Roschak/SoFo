import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ClockInDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AttendanceHistoryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
