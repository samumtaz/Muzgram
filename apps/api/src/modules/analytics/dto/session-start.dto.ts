import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum SessionSource {
  DIRECT = 'direct',
  PUSH_NOTIFICATION = 'push_notification',
  DEEP_LINK = 'deep_link',
  SHARE = 'share',
}

export class SessionStartDto {
  @IsEnum(SessionSource)
  source: SessionSource;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pushType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @IsOptional()
  @IsEnum(['ios', 'android'])
  platform?: 'ios' | 'android';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  sessionId?: string;
}
