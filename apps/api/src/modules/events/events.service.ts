import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { MoreThan, Repository } from 'typeorm';

import { EventStatus } from '@muzgram/types';
import { generateEventSlug } from '@muzgram/utils';
import { TTL } from '@muzgram/constants';

import { EventEntity } from '../../database/entities/event.entity';
import { UserEntity } from '../../database/entities/user.entity';

interface CreateEventInput {
  title: string;
  description: string;
  categoryId: string;
  cityId: string;
  address: string;
  lat: number;
  lng: number;
  startAt: Date;
  endAt?: Date;
  isRecurring?: boolean;
  recurrenceRule?: string;
  isOnline?: boolean;
  onlineUrl?: string;
  isFree?: boolean;
  ticketUrl?: string;
  tags?: string[];
  listingId?: string;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  async findById(id: string): Promise<EventEntity> {
    const event = await this.repo.findOne({
      where: { id, status: EventStatus.ACTIVE },
      relations: ['category', 'organizer', 'listing'],
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async findBySlug(slug: string): Promise<EventEntity> {
    const event = await this.repo.findOne({
      where: { slug, status: EventStatus.ACTIVE },
      relations: ['category'],
    });
    if (!event) throw new NotFoundException(`Event '${slug}' not found`);
    return event;
  }

  async getUpcoming(cityId: string, limit = 20): Promise<EventEntity[]> {
    return this.repo.find({
      where: {
        cityId,
        status: EventStatus.ACTIVE,
        startAt: MoreThan(new Date()),
      },
      relations: ['category'],
      order: { startAt: 'ASC' },
      take: limit,
    });
  }

  async create(input: CreateEventInput, organizer: UserEntity): Promise<EventEntity> {
    const slug = await this.generateUniqueSlug(input.title, input.startAt);
    const location = this.buildPoint(input.lat, input.lng);

    const event = this.repo.create({
      ...input,
      slug,
      location,
      organizerId: organizer.id,
      status: EventStatus.PENDING,
      isFree: input.isFree ?? true,
      tags: input.tags ?? [],
    });

    return this.repo.save(event);
  }

  async cancelEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.repo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    event.status = EventStatus.CANCELLED;
    await this.repo.save(event);
  }

  private buildPoint(lat: number, lng: number): string {
    return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
  }

  private async generateUniqueSlug(title: string, startAt: Date): Promise<string> {
    let slug = generateEventSlug(title, startAt.toISOString());
    const existing = await this.repo.count({ where: { slug } });
    if (existing > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    return slug;
  }
}
