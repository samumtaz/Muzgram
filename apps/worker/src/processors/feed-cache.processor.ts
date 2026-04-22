import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import { Job } from 'bull';
import { Cache } from 'cache-manager';

const FEED_QUEUE = 'feed';

interface FeedCacheInvalidateJobData {
  cityId?: string;
  lat?: number;
  lng?: number;
  reason: string;
}

@Processor(FEED_QUEUE)
export class FeedCacheProcessor {
  private readonly logger = new Logger(FeedCacheProcessor.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  @Process('invalidate-feed-cache')
  async handleInvalidateFeedCache(job: Job<FeedCacheInvalidateJobData>): Promise<void> {
    const { reason } = job.data;
    this.logger.log(`Feed cache invalidation: ${reason}`);

    // In production with Redis: scan for keys matching "feed:*" pattern
    // and delete them. Cache-tag based invalidation via Cloudflare is
    // more efficient for the CDN layer (handled in CloudflareService).

    // For Redis pattern deletion:
    // const keys = await this.redis.keys('feed:*');
    // if (keys.length > 0) await this.redis.del(...keys);
  }
}
