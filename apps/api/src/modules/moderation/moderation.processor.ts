import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Job } from 'bull';
import { Repository } from 'typeorm';

import { ContentType, EventStatus, ListingStatus, PostStatus } from '@muzgram/types';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { MODERATION_QUEUE } from './moderation.constants';

export interface ScanContentJob {
  contentType: ContentType;
  contentId: string;
  photoUrls: string[];
  text?: string;
}

// Vision SafeSearch likelihood thresholds
const UNSAFE_LIKELIHOODS = new Set(['LIKELY', 'VERY_LIKELY']);

@Processor(MODERATION_QUEUE)
@Injectable()
export class ModerationProcessor {
  private readonly logger = new Logger(ModerationProcessor.name);
  private readonly visionApiKey: string | undefined;

  constructor(
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(CommunityPostEntity)
    private readonly postRepo: Repository<CommunityPostEntity>,
    private readonly config: ConfigService,
  ) {
    this.visionApiKey = this.config.get<string>('GOOGLE_VISION_API_KEY');
  }

  @Process('scan-content')
  async handleScanContent(job: Job<ScanContentJob>): Promise<void> {
    const { contentType, contentId, photoUrls } = job.data;
    this.logger.debug(`Scanning ${contentType} ${contentId} (${photoUrls.length} photos)`);

    try {
      const isSafe = await this.runSafeSearch(photoUrls);

      if (isSafe) {
        await this.approveContent(contentType, contentId);
      } else {
        this.logger.warn(`Unsafe content detected: ${contentType} ${contentId}`);
        // Leave as PENDING for human review — don't auto-reject
      }
    } catch (err) {
      this.logger.error(`Scan failed for ${contentType} ${contentId}: ${(err as Error).message}`);
      // On scan error, auto-approve so content isn't silently stuck in pending
      await this.approveContent(contentType, contentId);
    }
  }

  @Process('expire-events')
  async handleExpireEvents(): Promise<void> {
    const result = await this.eventRepo
      .createQueryBuilder()
      .update()
      .set({ status: EventStatus.COMPLETED })
      .where('end_at < NOW() AND status = :status', { status: EventStatus.ACTIVE })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} events`);
    }
  }

  private async runSafeSearch(photoUrls: string[]): Promise<boolean> {
    if (!this.visionApiKey || photoUrls.length === 0) {
      // No Vision API key configured — auto-approve (MVP)
      return true;
    }

    for (const url of photoUrls) {
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.visionApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{
              image: { source: { imageUri: url } },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
            }],
          }),
        },
      );

      const data = await response.json() as {
        responses: Array<{
          safeSearchAnnotation?: {
            adult: string;
            violence: string;
            racy: string;
          };
        }>;
      };

      const annotation = data.responses[0]?.safeSearchAnnotation;
      if (!annotation) continue;

      if (
        UNSAFE_LIKELIHOODS.has(annotation.adult) ||
        UNSAFE_LIKELIHOODS.has(annotation.violence)
      ) {
        return false;
      }
    }

    return true;
  }

  private async approveContent(contentType: ContentType, contentId: string): Promise<void> {
    switch (contentType) {
      case ContentType.LISTING:
        await this.listingRepo.update(contentId, { status: ListingStatus.ACTIVE });
        break;
      case ContentType.EVENT:
        await this.eventRepo.update(contentId, { status: EventStatus.ACTIVE });
        break;
      case ContentType.POST:
        await this.postRepo.update(contentId, { status: PostStatus.ACTIVE });
        break;
    }
    this.logger.debug(`Auto-approved ${contentType} ${contentId}`);
  }
}
