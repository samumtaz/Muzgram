import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ContentType } from '@muzgram/types';

import { CommunityPostEntity } from './community-post.entity';
import { EventEntity } from './event.entity';
import { ListingEntity } from './listing.entity';
import { UserEntity } from './user.entity';

@Entity('saves')
@Index(['userId', 'contentType', 'contentId'], { unique: true })
@Index(['contentType', 'contentId'])
export class SaveEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.saves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column({ name: 'content_id' })
  contentId: string;

  // Nullable FK references — only one is populated based on contentType
  @Column({ type: 'uuid', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, (l) => l.saves, { nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing: ListingEntity | null;

  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => EventEntity, (e) => e.saves, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: EventEntity | null;

  @Column({ type: 'uuid', nullable: true })
  postId: string | null;

  @ManyToOne(() => CommunityPostEntity, (p) => p.saves, { nullable: true })
  @JoinColumn({ name: 'post_id' })
  post: CommunityPostEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
