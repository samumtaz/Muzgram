import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserRole, UserTrustTier } from '@muzgram/types';

import { CommunityPostEntity } from './community-post.entity';
import { SaveEntity } from './save.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  clerkUserId: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone: string;

  @Column({ length: 100, nullable: true })
  displayName: string | null;

  @Column({ nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'smallint', default: UserTrustTier.UNVERIFIED })
  trustTier: UserTrustTier;

  @Column({ length: 100, nullable: true })
  neighborhood: string | null;

  @Column({ length: 100, nullable: true })
  citySlug: string | null;

  // Last known location for proximity-based notifications
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastKnownLat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastKnownLng: number | null;

  @Column({ nullable: true })
  lastKnownAt: Date | null;

  // Push notification token (Expo Push Token)
  @Column({ nullable: true })
  expoPushToken: string | null;

  // Notification preferences stored as JSONB
  @Column({ type: 'jsonb', default: {} })
  notificationPrefs: Record<string, boolean>;

  @Column({ default: true })
  isActive: boolean;

  // Tracks daily notification count to enforce MAX_PER_USER_PER_DAY
  @Column({ default: 0 })
  notificationsSentToday: number;

  @Column({ nullable: true })
  notificationsResetAt: Date | null;

  @Column({ default: 0 })
  reportsSubmittedCount: number;

  @Column({ default: 0 })
  reportsReceivedCount: number;

  @OneToMany(() => CommunityPostEntity, (post) => post.author)
  posts: CommunityPostEntity[];

  @OneToMany(() => SaveEntity, (save) => save.user)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
