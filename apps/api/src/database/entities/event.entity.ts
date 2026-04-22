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

  @Column()
  categoryId: string;

  @ManyToOne(() => ListingCategoryEntity)
  @JoinColumn({ name: 'categoryId' })
  category: ListingCategoryEntity;

  @Column()
  organizerId: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'organizerId' })
  organizer: UserEntity;

  // Null if organizer is a user directly; set if a business is hosting
  @Column({ type: 'uuid', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: ListingEntity | null;

  @Column()
  cityId: string;

  @ManyToOne(() => CityEntity, (city) => city.events)
  @JoinColumn({ name: 'cityId' })
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

  @Column({ type: 'simple-array', default: '' })
  mediaUrls: string[];

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ default: 0 })
  savesCount: number;

  @Column({ default: 0 })
  sharesCount: number;

  @OneToMany(() => SaveEntity, (save) => save.event)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
