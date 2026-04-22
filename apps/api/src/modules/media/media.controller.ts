import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsEnum, IsNumber, IsString, Max, Min } from 'class-validator';

import { ContentType, MediaType } from '@muzgram/types';
import { MEDIA } from '@muzgram/constants';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { MediaService } from './media.service';

class RequestUploadDto {
  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(MEDIA.MAX_FILE_SIZE_BYTES)
  fileSizeBytes: number;

  @IsEnum(['listing', 'event', 'post', 'avatar'])
  context: 'listing' | 'event' | 'post' | 'avatar';

  @IsString()
  ownerId: string;
}

class ConfirmUploadDto {
  @IsString()
  r2Key: string;

  @IsString()
  ownerId: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsEnum(MediaType)
  mediaType: MediaType;

  @IsString()
  mimeType: string;

  @IsNumber()
  fileSizeBytes: number;
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get presigned R2 upload URL — client uploads directly to R2' })
  requestUpload(@Body() dto: RequestUploadDto, @CurrentUser() user: UserEntity) {
    return this.mediaService.requestPresignedUpload({
      contentType: dto.mimeType,
      contentLength: dto.fileSizeBytes,
      context: dto.context,
      ownerId: dto.ownerId,
      uploaderId: user.id,
    });
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm upload complete — queues for moderation' })
  confirmUpload(@Body() dto: ConfirmUploadDto, @CurrentUser() user: UserEntity) {
    return this.mediaService.confirmUpload({
      ...dto,
      uploaderId: user.id,
    });
  }
}
