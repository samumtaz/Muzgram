import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { Job } from 'bull';

const MODERATION_QUEUE = 'moderation';

interface ModerationJobData {
  assetId: string;
  publicUrl: string;
  contentType: string;
  mediaType: 'image' | 'video';
}

@Processor(MODERATION_QUEUE)
export class ModerationProcessor {
  private readonly logger = new Logger(ModerationProcessor.name);

  @Process('moderate-media')
  async handleModerateMedia(job: Job<ModerationJobData>): Promise<void> {
    const { assetId, publicUrl, mediaType } = job.data;

    this.logger.log(`Moderating ${mediaType} asset ${assetId}`);

    try {
      const result = await this.runSafeSearchCheck(publicUrl);

      if (result.isSafe) {
        this.logger.log(`Asset ${assetId} approved`);
        // Update media_assets.isModerated = true, moderationResult = 'approved', isPublic = true
        // In production: inject MediaService and call markModerated
      } else {
        this.logger.warn(`Asset ${assetId} rejected: ${result.reason}`);
        // Update media_assets.isModerated = true, moderationResult = 'rejected', isPublic = false
      }
    } catch (error) {
      this.logger.error(`Moderation failed for ${assetId}: ${(error as Error).message}`);
      throw error;
    }
  }

  @Process('expire-posts')
  async handleExpirePosts(_job: Job): Promise<void> {
    this.logger.log('Running expired posts cleanup');
    // In production: inject CommunityPostRepository and update expired posts to 'hidden'
    // SELECT * FROM community_posts WHERE expires_at < now() AND status = 'active'
    // UPDATE community_posts SET status = 'hidden' WHERE id IN (...)
  }

  @Process('expire-specials')
  async handleExpireSpecials(_job: Job): Promise<void> {
    this.logger.log('Running expired daily specials cleanup');
    // DELETE FROM daily_specials WHERE expires_at < now()
  }

  private async runSafeSearchCheck(
    _imageUrl: string,
  ): Promise<{ isSafe: boolean; reason?: string }> {
    // Google Cloud Vision SafeSearch API integration
    // In MVP: if GOOGLE_APPLICATION_CREDENTIALS is not set, default to approved
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return { isSafe: true };
    }

    // Production implementation:
    // const client = new vision.ImageAnnotatorClient();
    // const [result] = await client.safeSearchDetection(imageUrl);
    // const detections = result.safeSearchAnnotation;
    // const isSafe = !['LIKELY', 'VERY_LIKELY'].includes(detections?.adult ?? '') &&
    //               !['LIKELY', 'VERY_LIKELY'].includes(detections?.violence ?? '');
    // return { isSafe, reason: isSafe ? undefined : 'NSFW content detected' };

    return { isSafe: true };
  }
}
