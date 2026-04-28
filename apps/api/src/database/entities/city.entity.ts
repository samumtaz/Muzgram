import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ListingEntity } from './listing.entity';
import { EventEntity } from './event.entity';

@Entity('cities')
export class CityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 2 })
  state: string;

  @Column({ length: 2, default: 'US' })
  country: string;

  // PostGIS geography point: SRID 4326
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  center: object | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  centerLat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  centerLng: number;

  @Column({ default: false })
  isActive: boolean;

  @Column({ name: 'listing_count', default: 0 })
  listingsCount: number;

  @OneToMany(() => ListingEntity, (listing) => listing.city)
  listings: ListingEntity[];

  @OneToMany(() => EventEntity, (event) => event.city)
  events: EventEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
