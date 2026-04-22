import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { NotificationType } from '@muzgram/types';

import { UserEntity } from './user.entity';

@Entity('notifications')
@Index(['recipientId', 'isRead', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: UserEntity;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 150 })
  body: string;

  // Deep link for the notification action
  @Column({ nullable: true })
  actionUrl: string | null;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date | null;

  // Null if push delivery not attempted yet
  @Column({ nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
