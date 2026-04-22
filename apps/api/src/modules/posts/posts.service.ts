import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { PostStatus } from '@muzgram/types';
import { TRUST_TIER, TTL } from '@muzgram/constants';

import { CommunityPostEntity } from '../../database/entities/community-post.entity';
import { UserEntity } from '../../database/entities/user.entity';

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

    return this.repo.save(post);
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
