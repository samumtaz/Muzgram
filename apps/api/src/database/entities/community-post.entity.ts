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

import { PostStatus } from '@muzgram/types';

import { EventEntity } from './event.entity';
import { ListingEntity } from './listing.entity';
import { SaveEntity } from './save.entity';
import { UserEntity } from './user.entity';

@Entity('community_posts')
@Index('idx_posts_location', { synchronize: false })
@Index(['cityId', 'status', 'expiresAt'])
export class CommunityPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  authorId: string;

  @ManyToOne(() => UserEntity, (user) => user.posts)
  @JoinColumn({ name: 'authorId' })
  author: UserEntity;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'simple-array', default: '' })
  mediaUrls: string[];

  @Column({ nullable: true })
  linkedListingId: string | null;

  @ManyToOne(() => ListingEntity, { nullable: true })
  @JoinColumn({ name: 'linkedListingId' })
  linkedListing: ListingEntity | null;

  @Column({ nullable: true })
  linkedEventId: string | null;

  @ManyToOne(() => EventEntity, { nullable: true })
  @JoinColumn({ name: 'linkedEventId' })
  linkedEvent: EventEntity | null;

  @Column({ length: 100 })
  cityId: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: object | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng: number | null;

  @Column({ length: 100, nullable: true })
  neighborhood: string | null;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.PENDING })
  status: PostStatus;

  // Weighted sum of report weights that have been submitted
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  reportWeight: number;

  @Column({ default: 0 })
  savesCount: number;

  @Column({ default: 0 })
  sharesCount: number;

  // Posts auto-expire after 7 days (managed by worker job)
  @Column()
  expiresAt: Date;

  @OneToMany(() => SaveEntity, (save) => save.post)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
