import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EventStatus } from '@muzgram/types';

import { CityEntity } from './city.entity';
import { ListingCategoryEntity } from './listing-category.entity';
import { ListingEntity } from './listing.entity';
import { SaveEntity } from './save.entity';
import { UserEntity } from './user.entity';

@Entity('events')
@Index('idx_events_location', { synchronize: false })
@Index(['cityId', 'status', 'startAt'])
@Index(['isFeatured', 'startAt'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  slug: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => ListingCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category: ListingCategoryEntity;

  @Column({ name: 'organizer_id', nullable: true })
  organizerId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'organizer_id' })
  organizer: UserEntity | null;

  @Column({ name: 'organizer_name', type: 'varchar', length: 255, nullable: true })
  organizerName: string | null;

  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, { nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity | null;

  @Column({ name: 'city_id' })
  cityId: string;

  @ManyToOne(() => CityEntity, (city) => city.events)
  @JoinColumn({ name: 'city_id' })
  city: CityEntity;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: [number, number] };

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column()
  startAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ default: false })
  isRecurring: boolean;

  // iCal RRULE string (e.g., "FREQ=WEEKLY;BYDAY=FR")
  @Column({ type: 'varchar', length: 500, nullable: true })
  recurrenceRule: string | null;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'varchar', nullable: true })
  onlineUrl: string | null;

  @Column({ default: true })
  isFree: boolean;

  @Column({ type: 'varchar', nullable: true })
  ticketUrl: string | null;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.PENDING })
  status: EventStatus;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  featuredUntil: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  mediaUrls: string[];

  @Column({ name: 'cover_photo_url', type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ name: 'save_count', default: 0 })
  savesCount: number;

  @Column({ name: 'share_count', default: 0 })
  sharesCount: number;

  @Index({ unique: true })
  @Column({ name: 'external_id', type: 'varchar', nullable: true })
  externalId: string | null;

  @Column({ name: 'source', type: 'varchar', length: 50, default: 'manual' })
  source: string;

  @OneToMany(() => SaveEntity, (save) => save.event)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
