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

import { ListingEntity } from '../../../database/entities/listing.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { PaymentEntity } from './payment.entity';

export enum BillingProduct {
  FOUNDING_MEMBER = 'founding_member',
  FEATURED_PLACEMENT = 'featured_placement',
  EVENT_BOOST = 'event_boost',
  LEAD_PACKAGE = 'lead_package',
}

export enum BillingInterval {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ONE_TIME = 'one_time',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
  PAUSED = 'paused',
}

@Entity('subscriptions')
@Index(['listingId', 'status'])
@Index(['status', 'currentPeriodEnd'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: ListingEntity;

  @Column({ length: 255, nullable: true })
  stripeCustomerId: string | null;

  @Index({ unique: true })
  @Column({ length: 255, nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ length: 255, nullable: true })
  stripePriceId: string | null;

  @Column({ type: 'enum', enum: BillingProduct })
  product: BillingProduct;

  @Column({ type: 'enum', enum: BillingInterval, default: BillingInterval.MONTH })
  interval: BillingInterval;

  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  // Amount in cents (e.g. 27500 = $275.00)
  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ length: 3, default: 'usd' })
  currency: string;

  @Column({ nullable: true })
  currentPeriodStart: Date | null;

  @Column({ nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ nullable: true })
  canceledAt: Date | null;

  @Column({ nullable: true })
  trialEnd: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: UserEntity | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => PaymentEntity, (p) => p.subscription)
  payments: PaymentEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
