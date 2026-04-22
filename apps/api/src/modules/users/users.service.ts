import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserTrustTier } from '@muzgram/types';

import { UserEntity } from '../../database/entities/user.entity';

interface CreateFromClerkInput {
  clerkUserId: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface UpdateFromClerkInput {
  displayName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByClerkId(clerkUserId: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { clerkUserId } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async createFromClerk(input: CreateFromClerkInput): Promise<UserEntity> {
    const existing = await this.findByClerkId(input.clerkUserId);
    if (existing) return existing;

    const user = this.repo.create({
      clerkUserId: input.clerkUserId,
      phone: input.phone,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      trustTier: UserTrustTier.UNVERIFIED,
      isActive: true,
    });

    return this.repo.save(user);
  }

  async updateFromClerk(clerkUserId: string, input: UpdateFromClerkInput): Promise<void> {
    await this.repo.update({ clerkUserId }, {
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
    });
  }

  async updateProfile(
    userId: string,
    updates: { displayName?: string; neighborhood?: string; citySlug?: string },
  ): Promise<UserEntity> {
    await this.repo.update(userId, updates);
    return this.findByIdOrFail(userId);
  }

  async updatePushToken(userId: string, expoPushToken: string | null): Promise<void> {
    await this.repo.update(userId, { expoPushToken });
  }

  async updateLastLocation(userId: string, lat: number, lng: number): Promise<void> {
    await this.repo.update(userId, {
      lastKnownLat: lat,
      lastKnownLng: lng,
      lastKnownAt: new Date(),
    });
  }

  async updateNotificationPrefs(
    userId: string,
    prefs: Record<string, boolean>,
  ): Promise<void> {
    const user = await this.findByIdOrFail(userId);
    await this.repo.update(userId, {
      notificationPrefs: { ...user.notificationPrefs, ...prefs },
    });
  }

  async incrementTrustTier(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ trustTier: () => `LEAST("trustTier" + 1, ${UserTrustTier.VERIFIED_ORGANIZER})` })
      .where({ id: userId })
      .execute();
  }

  async deactivate(clerkUserId: string): Promise<void> {
    await this.repo.update({ clerkUserId }, { isActive: false });
  }
}
