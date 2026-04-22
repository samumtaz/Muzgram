import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ListingEntity } from '../../../database/entities/listing.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { BillingProduct, SubscriptionEntity } from './subscription.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
@Index(['listingId', 'status'])
@Index(['createdAt'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  listingId: string;

  @ManyToOne(() => ListingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: ListingEntity;

  @Column({ nullable: true })
  subscriptionId: string | null;

  @ManyToOne(() => SubscriptionEntity, (s) => s.payments, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: SubscriptionEntity | null;

  @Index({ unique: true })
  @Column({ length: 255, nullable: true })
  stripePaymentIntentId: string | null;

  @Index({ unique: true })
  @Column({ length: 255, nullable: true })
  stripeInvoiceId: string | null;

  @Index({ unique: true })
  @Column({ length: 255, nullable: true })
  stripeCheckoutSessionId: string | null;

  @Column({ type: 'enum', enum: BillingProduct })
  product: BillingProduct;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // Amount in cents
  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ length: 3, default: 'usd' })
  currency: string;

  @Column({ length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  receiptUrl: string | null;

  @Column({ nullable: true })
  refundedAt: Date | null;

  @Column({ length: 255, nullable: true })
  refundReason: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: UserEntity | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
