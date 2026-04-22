import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ListingEntity } from '../../database/entities/listing.entity';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { PaymentEntity, PaymentStatus } from './entities/payment.entity';
import {
  BillingInterval,
  BillingProduct,
  SubscriptionEntity,
  SubscriptionStatus,
} from './entities/subscription.entity';

// Price map: product + interval → amount in cents
// Aligned with docs/13-monetization-model.md pricing
const PRICE_MAP: Partial<Record<BillingProduct, Partial<Record<BillingInterval, number>>>> = {
  [BillingProduct.FOUNDING_MEMBER]: {
    [BillingInterval.ONE_TIME]: 14900, // $149
  },
  [BillingProduct.FEATURED_PLACEMENT]: {
    [BillingInterval.WEEK]: 7500,    // $75/week
    [BillingInterval.MONTH]: 27500,  // $275/month
    [BillingInterval.QUARTER]: 74900, // $749/quarter (~15% discount)
  },
  [BillingProduct.EVENT_BOOST]: {
    [BillingInterval.ONE_TIME]: 2500, // $25 base (admin can override)
  },
  [BillingProduct.LEAD_PACKAGE]: {
    [BillingInterval.MONTH]: 14900,  // $149/month base
    [BillingInterval.QUARTER]: 39900, // $399/quarter
  },
};

// How many days each product activates featured status
const FEATURED_DAYS_MAP: Partial<Record<BillingProduct, Partial<Record<BillingInterval, number>>>> = {
  [BillingProduct.FOUNDING_MEMBER]: { [BillingInterval.ONE_TIME]: 30 },
  [BillingProduct.FEATURED_PLACEMENT]: {
    [BillingInterval.WEEK]: 7,
    [BillingInterval.MONTH]: 31,
    [BillingInterval.QUARTER]: 92,
  },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2025-02-24.acacia' });
    }
  }

  // ─── Checkout Session ─────────────────────────────────────────────────────

  async createCheckoutSession(dto: CreateCheckoutSessionDto, userId: string) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const listing = await this.listingRepo.findOneOrFail({ where: { id: dto.listingId } });

    const amountCents = PRICE_MAP[dto.product]?.[dto.interval];
    if (!amountCents) {
      throw new BadRequestException(`No price defined for ${dto.product}/${dto.interval}`);
    }

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:4200');
    const successUrl = dto.successUrl ?? `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl ?? `${appUrl}/billing/cancel`;

    const isRecurring = dto.interval !== BillingInterval.ONE_TIME;

    const session = await this.stripe.checkout.sessions.create({
      mode: isRecurring ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amountCents,
            product_data: {
              name: this.productLabel(dto.product),
              description: `${listing.name} — ${dto.interval}`,
              metadata: { listingId: listing.id, product: dto.product },
            },
            ...(isRecurring && {
              recurring: { interval: dto.interval as Stripe.Price.Recurring.Interval },
            }),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        listingId: listing.id,
        product: dto.product,
        interval: dto.interval,
        userId,
      },
    });

    // Create pending payment record so we can match the webhook
    await this.paymentRepo.save(
      this.paymentRepo.create({
        listingId: listing.id,
        product: dto.product,
        status: PaymentStatus.PENDING,
        amountCents,
        currency: 'usd',
        stripeCheckoutSessionId: session.id,
        description: this.productLabel(dto.product),
        createdByUserId: userId,
      }),
    );

    return { url: session.url, sessionId: session.id };
  }

  // ─── Manual Payment (MVP — admin records cash/Zelle/etc.) ─────────────────

  async recordManualPayment(dto: RecordManualPaymentDto, adminUserId: string) {
    const listing = await this.listingRepo.findOne({ where: { id: dto.listingId } });
    if (!listing) throw new NotFoundException('Listing not found');

    const amountCents = dto.amountCents;
    const periodStart = dto.periodStart ? new Date(dto.periodStart) : new Date();
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : this.calcPeriodEnd(dto.interval, periodStart);

    await this.dataSource.transaction(async (manager) => {
      // Create or update subscription record
      let sub = await manager.findOne(SubscriptionEntity, {
        where: { listingId: dto.listingId, product: dto.product, status: SubscriptionStatus.ACTIVE },
      });

      if (!sub) {
        sub = manager.create(SubscriptionEntity, {
          listingId: dto.listingId,
          product: dto.product,
          interval: dto.interval,
          status: SubscriptionStatus.ACTIVE,
          amountCents,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          createdByUserId: adminUserId,
          notes: dto.notes ?? null,
        });
      } else {
        sub.currentPeriodEnd = periodEnd;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.notes = dto.notes ?? sub.notes;
      }
      await manager.save(sub);

      // Record the payment
      const payment = manager.create(PaymentEntity, {
        listingId: dto.listingId,
        subscriptionId: sub.id,
        product: dto.product,
        status: PaymentStatus.SUCCEEDED,
        amountCents,
        currency: 'usd',
        description: `Manual — ${this.productLabel(dto.product)} ${dto.interval}`,
        createdByUserId: adminUserId,
        metadata: { manual: true, notes: dto.notes },
      });
      await manager.save(payment);

      // Activate featured status on the listing if applicable
      await this.activateFeaturedStatus(manager, listing, dto.product, dto.interval, periodEnd);
    });

    return { success: true };
  }

  // ─── Stripe Webhook ───────────────────────────────────────────────────────

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret || !this.stripe) return;

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { listingId, product, interval, userId } = session.metadata ?? {};
    if (!listingId || !product || !interval) return;

    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) return;

    const amountCents = session.amount_total ?? 0;

    await this.dataSource.transaction(async (manager) => {
      // Update pending payment record
      const payment = await manager.findOne(PaymentEntity, {
        where: { stripeCheckoutSessionId: session.id },
      });
      if (payment) {
        payment.status = PaymentStatus.SUCCEEDED;
        payment.stripePaymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : null;
        payment.receiptUrl = null;
        await manager.save(payment);
      }

      const periodStart = new Date();
      const periodEnd = this.calcPeriodEnd(interval as BillingInterval, periodStart);

      // Create or update subscription
      let sub = await manager.findOne(SubscriptionEntity, {
        where: { listingId, product: product as BillingProduct, status: SubscriptionStatus.ACTIVE },
      });
      if (!sub) {
        sub = manager.create(SubscriptionEntity, {
          listingId,
          product: product as BillingProduct,
          interval: interval as BillingInterval,
          status: SubscriptionStatus.ACTIVE,
          amountCents,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          createdByUserId: userId ?? null,
        });
      } else {
        sub.currentPeriodEnd = periodEnd;
        sub.status = SubscriptionStatus.ACTIVE;
      }
      await manager.save(sub);

      await this.activateFeaturedStatus(manager, listing, product as BillingProduct, interval as BillingInterval, periodEnd);
    });
  }

  private async handleInvoiceSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const sub = await this.subRepo.findOne({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });
    if (!sub) return;

    // Record the renewal payment
    await this.paymentRepo.save(
      this.paymentRepo.create({
        listingId: sub.listingId,
        subscriptionId: sub.id,
        product: sub.product,
        status: PaymentStatus.SUCCEEDED,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        stripeInvoiceId: invoice.id,
        receiptUrl: invoice.hosted_invoice_url ?? null,
        description: `Renewal — ${this.productLabel(sub.product)}`,
      }),
    );

    // Extend featured status
    if (sub.currentPeriodEnd) {
      const newEnd = this.calcPeriodEnd(sub.interval, sub.currentPeriodEnd);
      await this.dataSource.transaction(async (manager) => {
        const listing = await manager.findOne(ListingEntity, { where: { id: sub.listingId } });
        if (listing) await this.activateFeaturedStatus(manager, listing, sub.product, sub.interval, newEnd);
        sub.currentPeriodEnd = newEnd;
        sub.status = SubscriptionStatus.ACTIVE;
        await manager.save(sub);
      });
    }
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    await this.subRepo.update(
      { stripeSubscriptionId: invoice.subscription as string },
      { status: SubscriptionStatus.PAST_DUE },
    );
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const sub = await this.subRepo.findOne({
      where: { stripeSubscriptionId: stripeSub.id },
    });
    if (!sub) return;

    sub.status = SubscriptionStatus.CANCELED;
    sub.canceledAt = new Date();
    await this.subRepo.save(sub);

    // Only deactivate featured status when period actually ends — grace behavior from docs/13
    const listing = await this.listingRepo.findOne({ where: { id: sub.listingId } });
    if (listing && sub.currentPeriodEnd && sub.currentPeriodEnd <= new Date()) {
      listing.isFeatured = false;
      listing.featuredUntil = null;
      await this.listingRepo.save(listing);
    }
  }

  private async handleSubscriptionUpdated(stripeSub: Stripe.Subscription) {
    await this.subRepo.update(
      { stripeSubscriptionId: stripeSub.id },
      {
        status: stripeSub.status as SubscriptionStatus,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      },
    );
  }

  // ─── Admin Queries ────────────────────────────────────────────────────────

  async getListingBillingStatus(listingId: string) {
    const [subscriptions, payments, revenueResult] = await Promise.all([
      this.subRepo.find({
        where: { listingId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.paymentRepo.find({
        where: { listingId, status: PaymentStatus.SUCCEEDED },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amountCents)', 'total')
        .where('p.listingId = :listingId AND p.status = :status', {
          listingId,
          status: PaymentStatus.SUCCEEDED,
        })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      subscriptions,
      payments,
      totalRevenueCents: parseInt(revenueResult?.total ?? '0', 10),
    };
  }

  async getMrrSnapshot() {
    const result = await this.subRepo
      .createQueryBuilder('s')
      .select('SUM(s.amountCents)', 'totalCents')
      .addSelect('COUNT(s.id)', 'count')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getRawOne<{ totalCents: string; count: string }>();

    const totalMonthlyCents = parseInt(result?.totalCents ?? '0', 10);
    const count = parseInt(result?.count ?? '0', 10);

    return {
      mrrCents: totalMonthlyCents,
      mrrUsd: (totalMonthlyCents / 100).toFixed(2),
      activeSubscriptions: count,
    };
  }

  async cancelSubscription(subscriptionId: string, adminUserId: string) {
    const sub = await this.subRepo.findOneOrFail({ where: { id: subscriptionId } });

    if (sub.stripeSubscriptionId && this.stripe) {
      await this.stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    sub.status = SubscriptionStatus.CANCELED;
    sub.canceledAt = new Date();
    await this.subRepo.save(sub);

    this.logger.log(`Subscription ${subscriptionId} canceled by admin ${adminUserId}`);
    return { success: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async activateFeaturedStatus(
    manager: EntityManager,
    listing: ListingEntity,
    product: BillingProduct,
    interval: BillingInterval,
    periodEnd: Date,
  ) {
    const days = FEATURED_DAYS_MAP[product]?.[interval];
    if (!days) return;

    listing.isFeatured = true;
    listing.featuredUntil = periodEnd;

    if (product === BillingProduct.FOUNDING_MEMBER) {
      listing.isFoundingMember = true;
    }

    await manager.save(ListingEntity, listing);
  }

  private calcPeriodEnd(interval: BillingInterval, from: Date): Date {
    const d = new Date(from);
    switch (interval) {
      case BillingInterval.WEEK:
        d.setDate(d.getDate() + 7);
        break;
      case BillingInterval.MONTH:
        d.setMonth(d.getMonth() + 1);
        break;
      case BillingInterval.QUARTER:
        d.setMonth(d.getMonth() + 3);
        break;
      case BillingInterval.YEAR:
        d.setFullYear(d.getFullYear() + 1);
        break;
      case BillingInterval.ONE_TIME:
        d.setDate(d.getDate() + 30);
        break;
    }
    return d;
  }

  private productLabel(product: BillingProduct): string {
    const labels: Record<BillingProduct, string> = {
      [BillingProduct.FOUNDING_MEMBER]: 'Founding Member',
      [BillingProduct.FEATURED_PLACEMENT]: 'Featured Placement',
      [BillingProduct.EVENT_BOOST]: 'Event Boost',
      [BillingProduct.LEAD_PACKAGE]: 'Lead Package',
    };
    return labels[product] ?? product;
  }
}
