import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DeepPartial, Repository } from 'typeorm';

import { HalalCertification, ListingMainCategory, ListingStatus } from '@muzgram/types';
import { generateListingSlug } from '@muzgram/utils';

import { DailySpecialEntity } from '../../database/entities/daily-special.entity';
import { ListingCategoryEntity } from '../../database/entities/listing-category.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';

interface CreateListingInput {
  name: string;
  description?: string;
  mainCategory: ListingMainCategory;
  categoryId: string;
  cityId: string;
  address: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  instagramHandle?: string;
  halalCertification?: HalalCertification;
  hours?: Record<string, { open: string; close: string; closed?: boolean }>;
}

interface CreateSpecialInput {
  title: string;
  description?: string;
  price?: number;
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ListingEntity)
    private readonly repo: Repository<ListingEntity>,
    @InjectRepository(ListingCategoryEntity)
    private readonly categoryRepo: Repository<ListingCategoryEntity>,
    @InjectRepository(DailySpecialEntity)
    private readonly specialRepo: Repository<DailySpecialEntity>,
  ) {}

  async findById(id: string, userId?: string): Promise<ListingEntity> {
    const listing = await this.repo.findOne({
      where: { id, status: ListingStatus.ACTIVE },
      relations: ['category', 'city'],
    });
    if (!listing) throw new NotFoundException(`Listing ${id} not found`);
    return listing;
  }

  async findBySlug(slug: string): Promise<ListingEntity> {
    const listing = await this.repo.findOne({
      where: { slug, status: ListingStatus.ACTIVE },
      relations: ['category', 'city'],
    });
    if (!listing) throw new NotFoundException(`Listing '${slug}' not found`);
    return listing;
  }

  async create(input: CreateListingInput, submittedBy: UserEntity): Promise<ListingEntity> {
    const category = await this.categoryRepo.findOne({ where: { id: input.categoryId } });
    if (!category) throw new NotFoundException(`Category ${input.categoryId} not found`);

    const slug = await this.generateUniqueSlug(input.name, input.cityId);
    const location = this.buildPoint(input.lat, input.lng);

    const listing = this.repo.create({
      ...input,
      slug,
      location,
      status: ListingStatus.PENDING,
      halalCertification: input.halalCertification ?? HalalCertification.NONE,
    } as DeepPartial<ListingEntity>);

    return this.repo.save(listing);
  }

  async claimListing(listingId: string, userId: string): Promise<ListingEntity> {
    const listing = await this.repo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.isClaimed) throw new ConflictException('This listing has already been claimed');

    listing.isClaimed = true;
    listing.claimedByUserId = userId;
    listing.claimedAt = new Date();

    return this.repo.save(listing);
  }

  async updateListing(
    listingId: string,
    userId: string,
    updates: Partial<CreateListingInput>,
  ): Promise<ListingEntity> {
    const listing = await this.repo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.claimedByUserId !== userId) throw new ForbiddenException('Not the listing owner');

    const updatedLocation =
      updates.lat && updates.lng ? this.buildPoint(updates.lat, updates.lng) : undefined;

    Object.assign(listing, {
      ...updates,
      ...(updatedLocation && { location: updatedLocation }),
    });

    return this.repo.save(listing);
  }

  async getActiveSpecial(listingId: string): Promise<DailySpecialEntity | null> {
    return this.specialRepo.findOne({
      where: { listingId },
      order: { createdAt: 'DESC' },
    });
  }

  async createDailySpecial(
    listingId: string,
    userId: string,
    input: CreateSpecialInput,
  ): Promise<DailySpecialEntity> {
    const listing = await this.repo.findOne({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.claimedByUserId !== userId) throw new ForbiddenException('Not the listing owner');

    // Expire any existing special first
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);

    const special = this.specialRepo.create({
      listingId,
      ...input,
      expiresAt: tomorrow,
    });

    return this.specialRepo.save(special);
  }

  async getCategories(): Promise<ListingCategoryEntity[]> {
    return this.categoryRepo.find({
      order: { mainCategory: 'ASC', sortOrder: 'ASC' },
    });
  }

  async checkIn(listingId: string, userId: string, lat?: number, lng?: number) {
    // Dedup: one check-in per user per listing per UTC day
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.repo.manager.query(
      `SELECT id FROM check_ins WHERE user_id = $1 AND listing_id = $2 AND created_at::date = $3::date`,
      [userId, listingId, today],
    );
    if (existing.length > 0) {
      return { alreadyCheckedIn: true, message: 'Already checked in today' };
    }

    await this.repo.manager.query(
      `INSERT INTO check_ins(user_id, listing_id, lat, lng) VALUES($1,$2,$3,$4)`,
      [userId, listingId, lat ?? null, lng ?? null],
    );

    // Increment counter on the listing
    await this.repo.manager.query(
      `UPDATE listings SET checkins_count = checkins_count + 1 WHERE id = $1`,
      [listingId],
    );

    const row = await this.repo.manager.query(
      `SELECT checkins_count AS "checkinsCount" FROM listings WHERE id = $1`,
      [listingId],
    );

    return { success: true, checkinsCount: row[0]?.checkinsCount ?? 0 };
  }

  private buildPoint(lat: number, lng: number): string {
    return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
  }

  private async generateUniqueSlug(name: string, cityId: string): Promise<string> {
    const city = await this.repo.manager.query(
      `SELECT "slug" FROM "cities" WHERE "id" = $1`,
      [cityId],
    );
    const citySlug = city[0]?.slug ?? 'chicago';
    let slug = generateListingSlug(name, citySlug);

    const existing = await this.repo.count({ where: { slug } });
    if (existing > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return slug;
  }
}
