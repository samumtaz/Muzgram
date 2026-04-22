import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ContentType, MediaType } from '@muzgram/types';

@Entity('media_assets')
@Index(['ownerId', 'contentType'])
@Index(['r2Key'], { unique: true })
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  uploaderId: string;

  @Column()
  ownerId: string;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column({ type: 'enum', enum: MediaType })
  mediaType: MediaType;

  @Column({ length: 500 })
  r2Key: string;

  @Column({ length: 500 })
  publicUrl: string;

  @Column({ length: 50 })
  mimeType: string;

  @Column({ default: 0 })
  fileSizeBytes: number;

  @Column({ default: false })
  isModerated: boolean;

  @Column({ nullable: true })
  moderationResult: string | null;

  @Column({ default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
