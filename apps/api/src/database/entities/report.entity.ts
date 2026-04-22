import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ContentType, ReportReason } from '@muzgram/types';

@Entity('reports')
@Index(['contentType', 'contentId'])
@Index(['reporterId', 'contentType', 'contentId'], { unique: true })
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reporterId: string;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column()
  contentId: string;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Weight of this report (based on reporter's trust tier at time of report)
  @Column({ type: 'decimal', precision: 3, scale: 1 })
  weight: number;

  @Column({ nullable: true })
  resolvedAt: Date | null;

  @Column({ nullable: true })
  resolvedBy: string | null;

  @Column({ nullable: true })
  resolution: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
