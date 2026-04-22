import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ListingMainCategory } from '@muzgram/types';

import { ListingEntity } from './listing.entity';

@Entity('listing_categories')
export class ListingCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  slug: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ListingMainCategory })
  mainCategory: ListingMainCategory;

  @Column({ nullable: true })
  parentId: string | null;

  @ManyToOne(() => ListingCategoryEntity, (cat) => cat.children, { nullable: true })
  parent: ListingCategoryEntity | null;

  @OneToMany(() => ListingCategoryEntity, (cat) => cat.parent)
  children: ListingCategoryEntity[];

  @Column({ length: 50, default: 'circle' })
  iconName: string;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => ListingEntity, (listing) => listing.category)
  listings: ListingEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
