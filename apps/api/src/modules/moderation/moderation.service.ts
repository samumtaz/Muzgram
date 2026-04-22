import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { ContentType, EventStatus, ListingStatus, PostStatus, ReportReason } from '@muzgram/types';
import { TRUST_TIER } from '@muzgram/constants';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { ReportEntity } from '../../database/entities/report.entity';
import { UserEntity } from '../../database/entities/user.entity';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(ReportEntity)
    private readonly reportRepo: Repository<ReportEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(CommunityPostEntity)
    private readonly postRepo: Repository<CommunityPostEntity>,
  ) {}

  async submitReport(
    reporter: UserEntity,
    contentType: ContentType,
    contentId: string,
    reason: ReportReason,
    notes?: string,
  ): Promise<ReportEntity> {
    const existingReport = await this.reportRepo.findOne({
      where: { reporterId: reporter.id, contentType, contentId },
    });
    if (existingReport) {
      throw new ConflictException('You have already reported this content');
    }

    // Blocked users' reports have no weight
    const weight = TRUST_TIER.REPORT_WEIGHT[reporter.trustTier as keyof typeof TRUST_TIER.REPORT_WEIGHT] ?? 0;

    const report = this.reportRepo.create({
      reporterId: reporter.id,
      contentType,
      contentId,
      reason,
      notes,
      weight,
    });
    await this.reportRepo.save(report);

    // Check if weighted sum exceeds auto-hide threshold
    await this.evaluateAutoHide(contentType, contentId);

    return report;
  }

  async approveContent(contentType: ContentType, contentId: string, adminId: string): Promise<void> {
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
    this.logger.log(`Content ${contentId} approved by admin ${adminId}`);
  }

  async rejectContent(
    contentType: ContentType,
    contentId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    switch (contentType) {
      case ContentType.LISTING:
        await this.listingRepo.update(contentId, { status: ListingStatus.REJECTED });
        break;
      case ContentType.EVENT:
        await this.eventRepo.update(contentId, { status: EventStatus.CANCELLED });
        break;
      case ContentType.POST:
        await this.postRepo.update(contentId, { status: PostStatus.REMOVED });
        break;
    }
    this.logger.log(`Content ${contentId} rejected by admin ${adminId}: ${reason}`);
  }

  async getPendingContent() {
    const [listings, events, posts] = await Promise.all([
      this.listingRepo.find({ where: { status: ListingStatus.PENDING }, order: { createdAt: 'ASC' }, take: 50 }),
      this.eventRepo.find({ where: { status: EventStatus.PENDING }, order: { createdAt: 'ASC' }, take: 50 }),
      this.postRepo.find({ where: { status: PostStatus.PENDING }, order: { createdAt: 'ASC' }, take: 50 }),
    ]);

    return { listings, events, posts };
  }

  private async evaluateAutoHide(contentType: ContentType, contentId: string): Promise<void> {
    const result = await this.reportRepo
      .createQueryBuilder('r')
      .select('SUM(r.weight)', 'totalWeight')
      .where('r.contentType = :type AND r.contentId = :id AND r.resolvedAt IS NULL', {
        type: contentType,
        id: contentId,
      })
      .getRawOne<{ totalWeight: string }>();

    const totalWeight = parseFloat(result?.totalWeight ?? '0');

    if (totalWeight >= TRUST_TIER.AUTO_HIDE_THRESHOLD) {
      this.logger.warn(`Auto-hiding ${contentType} ${contentId} (report weight: ${totalWeight})`);
      switch (contentType) {
        case ContentType.POST:
          await this.postRepo.update(contentId, { status: PostStatus.HIDDEN });
          break;
        case ContentType.LISTING:
          // Listings don't auto-hide — flag for admin review instead
          break;
      }
    }
  }
}
