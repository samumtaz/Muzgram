import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DataSource, Repository } from 'typeorm';

import { ContentType } from '@muzgram/types';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { SaveEntity } from '../../database/entities/save.entity';

export interface ToggleSaveResult {
  saved: boolean;
  savesCount: number;
}

@Injectable()
export class SavesService {
  constructor(
    @InjectRepository(SaveEntity)
    private readonly saveRepo: Repository<SaveEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(CommunityPostEntity)
    private readonly postRepo: Repository<CommunityPostEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // Idempotent: safe to call multiple times. Returns the current state.
  async toggle(
    userId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<ToggleSaveResult> {
    return this.dataSource.transaction(async (em) => {
      const existing = await em.findOne(SaveEntity, {
        where: { userId, contentType, contentId },
      });

      if (existing) {
        await em.remove(existing);
        await this.decrementCount(em, contentType, contentId);
        const count = await this.getCount(em, contentType, contentId);
        return { saved: false, savesCount: count };
      }

      const save = em.create(SaveEntity, {
        userId,
        contentType,
        contentId,
        listingId: contentType === ContentType.LISTING ? contentId : null,
        eventId: contentType === ContentType.EVENT ? contentId : null,
        postId: contentType === ContentType.POST ? contentId : null,
      });
      await em.save(save);
      await this.incrementCount(em, contentType, contentId);
      const count = await this.getCount(em, contentType, contentId);
      return { saved: true, savesCount: count };
    });
  }

  async getUserSaves(userId: string, contentType?: ContentType): Promise<SaveEntity[]> {
    const where: Record<string, unknown> = { userId };
    if (contentType) where.contentType = contentType;

    return this.saveRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async isSaved(userId: string, contentType: ContentType, contentId: string): Promise<boolean> {
    const count = await this.saveRepo.count({ where: { userId, contentType, contentId } });
    return count > 0;
  }

  private async incrementCount(em: any, type: ContentType, id: string): Promise<void> {
    const repo = this.getRepo(em, type);
    await repo.increment({ id }, 'savesCount', 1);
  }

  private async decrementCount(em: any, type: ContentType, id: string): Promise<void> {
    const repo = this.getRepo(em, type);
    await repo.decrement({ id }, 'savesCount', 1);
  }

  private async getCount(em: any, type: ContentType, id: string): Promise<number> {
    const repo = this.getRepo(em, type);
    const entity = await repo.findOne({ where: { id }, select: ['savesCount'] });
    return entity?.savesCount ?? 0;
  }

  private getRepo(em: any, type: ContentType) {
    switch (type) {
      case ContentType.LISTING: return em.getRepository(ListingEntity);
      case ContentType.EVENT: return em.getRepository(EventEntity);
      case ContentType.POST: return em.getRepository(CommunityPostEntity);
    }
  }
}
