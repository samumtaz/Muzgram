import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';

import { ListingMainCategory, ListingStatus } from '@muzgram/types';

import { LeadEntity, LeadStatus } from '../../database/entities/lead.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { SubmitLeadDto } from './dto/submit-lead.dto';

const LEAD_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_LEADS_PER_WINDOW = 3;

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepo: Repository<LeadEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ─── Submit a Lead ────────────────────────────────────────────────────────

  async submit(dto: SubmitLeadDto, user: UserEntity) {
    const listing = await this.listingRepo.findOne({
      where: { id: dto.businessId, status: ListingStatus.ACTIVE },
    });

    if (!listing) throw new NotFoundException('Business not found');

    // Only CONNECT (service providers) can receive leads per docs/13
    if (listing.mainCategory !== ListingMainCategory.CONNECT) {
      throw new ConflictException({
        type: '/errors/conflict',
        title: 'Not a service provider',
        status: 409,
        detail: 'This business does not accept leads.',
      });
    }

    // Rate limit: 3 leads per user per business per 7 days (Redis-backed)
    await this.enforceRateLimit(user.id, listing.id);

    const lead = this.leadRepo.create({
      listingId: listing.id,
      senderId: user.id,
      senderPhone: user.phone,
      message: dto.message ?? null,
      status: LeadStatus.NEW,
    });

    await this.leadRepo.save(lead);

    // Increment leads_count on listing
    await this.listingRepo.increment({ id: listing.id }, 'leadsCount', 1);

    return {
      leadId: lead.id,
      status: 'submitted',
      message: `Your enquiry was sent. ${listing.name} will contact you directly.`,
    };
  }

  // ─── Business Owner Inbox ─────────────────────────────────────────────────

  async getInbox(
    listingId: string,
    ownerId: string,
    query: { status?: string; cursor?: string; limit?: number },
  ) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, claimedByUserId: ownerId },
    });
    if (!listing) throw new NotFoundException('Business not found or not owned by you');

    const limit = Math.min(query.limit ?? 20, 50);
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.sender', 'sender')
      .where('lead.listingId = :listingId', { listingId })
      .orderBy('lead.createdAt', 'DESC')
      .take(limit + 1);

    if (query.status && query.status !== 'all') {
      qb.andWhere('lead.status = :status', { status: query.status });
    }

    if (query.cursor) {
      const decoded = Buffer.from(query.cursor, 'base64').toString('utf8');
      const { createdAt } = JSON.parse(decoded) as { createdAt: string };
      qb.andWhere('lead.createdAt < :createdAt', { createdAt });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);

    const cursor =
      hasMore && data.length > 0
        ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1].createdAt })).toString('base64')
        : null;

    // Mark NEW leads as VIEWED
    const newIds = data.filter((l) => l.status === LeadStatus.NEW).map((l) => l.id);
    if (newIds.length > 0) {
      await this.leadRepo
        .createQueryBuilder()
        .update()
        .set({ status: LeadStatus.VIEWED, viewedAt: new Date() })
        .whereInIds(newIds)
        .execute();
    }

    return {
      data: data.map((l) => ({
        id: l.id,
        sender: {
          displayName: l.sender?.displayName ?? null,
          phone: l.senderPhone,
        },
        message: l.message,
        status: l.status,
        createdAt: l.createdAt,
      })),
      meta: { cursor, hasMore },
    };
  }

  // ─── Mark Lead Status ─────────────────────────────────────────────────────

  async updateStatus(leadId: string, status: LeadStatus, ownerId: string) {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
      relations: ['listing'],
    });

    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.listing.claimedByUserId !== ownerId) {
      throw new ConflictException('Not your lead');
    }

    lead.status = status;
    if (status === LeadStatus.RESPONDED) lead.respondedAt = new Date();
    await this.leadRepo.save(lead);

    return { success: true };
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async adminGetLeads(query: { cursor?: string; limit?: number; listingId?: string }) {
    const limit = Math.min(query.limit ?? 20, 50);
    const qb = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.listing', 'listing')
      .leftJoinAndSelect('lead.sender', 'sender')
      .orderBy('lead.createdAt', 'DESC')
      .take(limit + 1);

    if (query.listingId) {
      qb.where('lead.listingId = :listingId', { listingId: query.listingId });
    }

    if (query.cursor) {
      const decoded = Buffer.from(query.cursor, 'base64').toString('utf8');
      const { createdAt } = JSON.parse(decoded) as { createdAt: string };
      qb.andWhere('lead.createdAt < :createdAt', { createdAt });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit);

    const cursor =
      hasMore && data.length > 0
        ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1].createdAt })).toString('base64')
        : null;

    return { data, meta: { cursor, hasMore } };
  }

  // ─── Rate Limit ───────────────────────────────────────────────────────────

  private async enforceRateLimit(userId: string, listingId: string) {
    const key = `lead_limit:${userId}:${listingId}`;
    const count = await this.cache.get<number>(key) ?? 0;

    if (count >= MAX_LEADS_PER_WINDOW) {
      throw new HttpException(
        `Maximum ${MAX_LEADS_PER_WINDOW} leads to the same business per 7 days.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.cache.set(key, count + 1, LEAD_WINDOW_SECONDS * 1000);
  }
}
