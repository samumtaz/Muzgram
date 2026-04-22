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

  @Column()
  categoryId: string;

  @ManyToOne(() => ListingCategoryEntity, (cat) => cat.listings)
  @JoinColumn({ name: 'categoryId' })
  category: ListingCategoryEntity;

  @Column()
  cityId: string;

  @ManyToOne(() => CityEntity, (city) => city.listings)
  @JoinColumn({ name: 'cityId' })
  city: CityEntity;

  @Column({ length: 500 })
  address: string;

  @Column({ length: 100, nullable: true })
  neighborhood: string | null;

  // PostGIS geography point
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  location: object;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  website: string | null;

  @Column({ length: 50, nullable: true })
  instagramHandle: string | null;

  @Column({ type: 'enum', enum: HalalCertification, default: HalalCertification.NONE })
  halalCertification: HalalCertification;

  @Column({ length: 100, nullable: true })
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

  @Column({ nullable: true })
  claimedByUserId: string | null;

  @Column({ nullable: true })
  claimedAt: Date | null;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ nullable: true })
  featuredUntil: Date | null;

  @Column({ default: false })
  isFoundingMember: boolean;

  // Weighted trust score for feed ranking
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  trustScore: number;

  @Column({ type: 'simple-array', default: '' })
  mediaUrls: string[];

  @Column({ nullable: true })
  thumbnailUrl: string | null;

  @Column({ default: 0 })
  savesCount: number;

  @Column({ default: 0 })
  viewsCount: number;

  @Column({ default: 0 })
  sharesCount: number;

  @Column({ default: 0 })
  leadsCount: number;

  @Column({ nullable: true })
  importedFrom: string | null;

  @OneToMany(() => DailySpecialEntity, (special) => special.listing)
  dailySpecials: DailySpecialEntity[];

  @OneToMany(() => SaveEntity, (save) => save.listing)
  saves: SaveEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
