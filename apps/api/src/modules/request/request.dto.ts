import { Type } from 'class-transformer';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const REQUEST_TYPES = ['LEAVE', 'REIMBURSEMENT', 'OPERATIONAL', 'DOCUMENT', 'PERMISSION'] as const;

export class CreateRequestDto {
  @IsIn(REQUEST_TYPES)
  type: (typeof REQUEST_TYPES)[number];

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class ListRequestsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

  @IsOptional()
  @Type(() => Number)
  @IsIn([1])
  mine?: number; // presence (any value) scopes the list to own requests
}

export class DecideRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
