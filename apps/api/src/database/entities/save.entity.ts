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

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, (user) => user.saves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column()
  contentId: string;

  // Nullable FK references — only one is populated based on contentType
  @Column({ type: 'uuid', nullable: true })
  listingId: string | null;

  @ManyToOne(() => ListingEntity, (l) => l.saves, { nullable: true })
  @JoinColumn({ name: 'listingId' })
  listing: ListingEntity | null;

  @Column({ type: 'uuid', nullable: true })
  eventId: string | null;

  @ManyToOne(() => EventEntity, (e) => e.saves, { nullable: true })
  @JoinColumn({ name: 'eventId' })
  event: EventEntity | null;

  @Column({ type: 'uuid', nullable: true })
  postId: string | null;

  @ManyToOne(() => CommunityPostEntity, (p) => p.saves, { nullable: true })
  @JoinColumn({ name: 'postId' })
  post: CommunityPostEntity | null;

  @CreateDateColumn()
  createdAt: Date;
}
