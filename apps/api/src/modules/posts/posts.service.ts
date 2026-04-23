import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';

import { Queue } from 'bull';
import { Repository } from 'typeorm';

import { ContentType, PostStatus } from '@muzgram/types';
import { TRUST_TIER, TTL } from '@muzgram/constants';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { MODERATION_QUEUE } from '../moderation/moderation.constants';

interface CreatePostInput {
  body: string;
  mediaUrls?: string[];
  linkedListingId?: string;
  linkedEventId?: string;
  cityId: string;
  lat?: number;
  lng?: number;
  neighborhood?: string;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(CommunityPostEntity)
    private readonly repo: Repository<CommunityPostEntity>,
    @InjectQueue(MODERATION_QUEUE)
    private readonly moderationQueue: Queue,
  ) {}

  async findById(id: string): Promise<CommunityPostEntity> {
    const post = await this.repo.findOne({
      where: { id, status: PostStatus.ACTIVE },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  async create(input: CreatePostInput, author: UserEntity): Promise<CommunityPostEntity> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TTL.COMMUNITY_POST_DAYS);

    const location =
      input.lat && input.lng
        ? () => `ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)`
        : undefined;

    // CONTRIBUTOR and above are auto-approved; lower tiers go to pending
    const status =
      author.trustTier >= TRUST_TIER.MIN_TIER_TO_AUTO_APPROVE
        ? PostStatus.ACTIVE
        : PostStatus.PENDING;

    const post = this.repo.create({
      body: input.body,
      mediaUrls: input.mediaUrls ?? [],
      linkedListingId: input.linkedListingId,
      linkedEventId: input.linkedEventId,
      cityId: input.cityId,
      lat: input.lat,
      lng: input.lng,
      neighborhood: input.neighborhood,
      authorId: author.id,
      status,
      expiresAt,
    });

    if (location) {
      (post as any).location = location;
    }

    const saved = await this.repo.save(post);

    // Enqueue photo scan if the post has media
    if (saved.mediaUrls.length > 0) {
      await this.moderationQueue.add('scan-content', {
        contentType: ContentType.POST,
        contentId: saved.id,
        photoUrls: saved.mediaUrls,
        text: input.body,
      }, { attempts: 2, backoff: 5000 });
    }

    return saved;
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.repo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not the post author');

    post.status = PostStatus.REMOVED;
    await this.repo.save(post);
  }

  async getUserPosts(userId: string): Promise<CommunityPostEntity[]> {
    return this.repo.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }
}
