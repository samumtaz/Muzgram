import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ListingEntity } from './listing.entity';

@Entity('daily_specials')
@Index(['listingId', 'expiresAt'])
export class DailySpecialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  listingId: string;

  @ManyToOne(() => ListingEntity, (listing) => listing.dailySpecials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: ListingEntity;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  price: number | null;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
