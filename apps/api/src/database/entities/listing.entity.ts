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

import { HalalCertification, ListingMainCategory, ListingStatus } from '@muzgram/types';

import { CityEntity } from './city.entity';
import { DailySpecialEntity } from './daily-special.entity';
import { ListingCategoryEntity } from './listing-category.entity';
import { SaveEntity } from './save.entity';

@Entity('listings')
@Index('idx_listings_location', { synchronize: false }) // created via raw SQL in migration
@Index(['cityId', 'status'])
@Index(['isFeatured', 'featuredUntil'])
export class ListingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  slug: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ListingMainCategory })
  mainCategory: ListingMainCategory;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => ListingCategoryEntity, (cat) => cat.listings)
  @JoinColumn({ name: 'category_id' })
  category: ListingCategoryEntity;

  @Column({ name: 'city_id' })
  cityId: string;

  @ManyToOne(() => CityEntity, (city) => city.listings)
  @JoinColumn({ name: 'city_id' })
  city: CityEntity;

  @Column({ length: 500 })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  neighborhood: string | null;

  // PostGIS geography point
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: { type: string; coordinates: [number, number] };

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  instagramHandle: string | null;

  @Column({ type: 'enum', enum: HalalCertification, default: HalalCertification.NONE })
  halalCertification: HalalCertification;

  @Column({ type: 'varchar', length: 100, nullable: true })
  certificationBody: string | null;

  @Column({ default: false })
  isHalalVerified: boolean;

  // Business hours stored as JSONB: { monday: { open: "09:00", close: "22:00" }, ... }
  @Column({ type: 'jsonb', nullable: true })
  hours: Record<string, { open: string; close: string; closed?: boolean }> | null;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.PENDING })
  status: ListingStatus;

  @Column({ default: false })
  isClaimed: boolean;

  @Column({ type: 'uuid', nullable: true })
  claimedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  claimedAt: Date | null;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  featuredUntil: Date | null;

  @Column({ default: false })
  isFoundingMember: boolean;

  // Weighted trust score for feed ranking
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  trustScore: number;

  @Column({ type: 'simple-array', default: '' })
  mediaUrls: string[];

  @Column({ name: 'primary_photo_url', type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'save_count', default: 0 })
  savesCount: number;

  @Column({ name: 'view_count', default: 0 })
  viewsCount: number;

  @Column({ name: 'share_count', default: 0 })
  sharesCount: number;

  @Column({ default: 0 })
  leadsCount: number;

  @Column({ type: 'varchar', nullable: true })
  importedFrom: string | null;

  @Index({ unique: true, where: 'external_id IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'manual' })
  source: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'int', nullable: true })
  ratingCount: number | null;

  @OneToMany(() => DailySpecialEntity, (special) => special.listing)
  dailySpecials: DailySpecialEntity[];

  @OneToMany(() => SaveEntity, (save) => save.listing)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
