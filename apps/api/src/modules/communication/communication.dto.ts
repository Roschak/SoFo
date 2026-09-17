import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsIn(['TEXT', 'VOICE', 'ANNOUNCEMENT'])
  type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT';

  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility: 'PUBLIC' | 'PRIVATE';

  @IsOptional()
  @IsString()
  @MaxLength(280)
  topic?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;
}
