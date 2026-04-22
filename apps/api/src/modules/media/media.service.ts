import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Repository } from 'typeorm';

import { ContentType, MediaType, PresignedUploadUrl } from '@muzgram/types';
import { MEDIA } from '@muzgram/constants';
import { buildMediaKey } from '@muzgram/utils';

import { MediaAssetEntity } from '../../database/entities/media-asset.entity';

interface RequestUploadInput {
  contentType: string;
  contentLength: number;
  context: 'listing' | 'event' | 'post' | 'avatar';
  ownerId: string;
  uploaderId: string;
}

interface ConfirmUploadInput {
  r2Key: string;
  uploaderId: string;
  ownerId: string;
  contentType: ContentType;
  mediaType: MediaType;
  mimeType: string;
  fileSizeBytes: number;
}

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(MediaAssetEntity)
    private readonly repo: Repository<MediaAssetEntity>,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.getOrThrow('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.getOrThrow('R2_BUCKET_NAME');
    this.publicBaseUrl = config.getOrThrow('R2_PUBLIC_URL');
  }

  async requestPresignedUpload(input: RequestUploadInput): Promise<PresignedUploadUrl> {
    const { contentType, contentLength, context, ownerId } = input;

    if (!MEDIA.ALLOWED_IMAGE_TYPES.includes(contentType as any) &&
        !MEDIA.ALLOWED_VIDEO_TYPES.includes(contentType as any)) {
      throw new BadRequestException(`Unsupported file type: ${contentType}`);
    }

    if (contentLength > MEDIA.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File exceeds ${MEDIA.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB limit`);
    }

    const filename = `upload.${contentType.split('/')[1]}`;
    const key = buildMediaKey(context, ownerId, filename);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      // EXIF GPS data stripping happens client-side before upload
      // Server enforces content type, not GPS stripping
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: MEDIA.PRESIGNED_URL_EXPIRY_SECONDS,
    });

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + MEDIA.PRESIGNED_URL_EXPIRY_SECONDS);

    return {
      uploadUrl,
      publicUrl: `${this.publicBaseUrl}/${key}`,
      key,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmUpload(input: ConfirmUploadInput): Promise<MediaAssetEntity> {
    const asset = this.repo.create({
      r2Key: input.r2Key,
      publicUrl: `${this.publicBaseUrl}/${input.r2Key}`,
      uploaderId: input.uploaderId,
      ownerId: input.ownerId,
      contentType: input.contentType,
      mediaType: input.mediaType,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      isModerated: false,
      isPublic: false, // Stays private until moderation passes
    });

    return this.repo.save(asset);
  }

  async markModerated(assetId: string, result: 'approved' | 'rejected'): Promise<void> {
    await this.repo.update(assetId, {
      isModerated: true,
      moderationResult: result,
      isPublic: result === 'approved',
    });
  }
}
