import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { UserEntity } from '../../database/entities/user.entity';

import { AdminGuard } from '../../common/guards/admin.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';

@Controller('v1/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── Stripe Webhook ───────────────────────────────────────────────────────
  // Must be raw body — registered before global JSON parser in main.ts
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req.rawBody as Buffer | undefined) ?? Buffer.alloc(0);
    await this.billingService.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }

  // ─── Checkout Session (business owner self-serve) ─────────────────────────
  @Post('checkout')
  @UseGuards(ClerkAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.billingService.createCheckoutSession(dto, user.id);
  }

  // ─── Admin — record manual payment (Zelle/cash/WhatsApp) ─────────────────
  @Post('admin/manual-payment')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  async recordManualPayment(
    @Body() dto: RecordManualPaymentDto,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.billingService.recordManualPayment(dto, admin.id);
  }

  // ─── Admin — MRR snapshot ─────────────────────────────────────────────────
  @Get('admin/mrr')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  async getMrr() {
    return this.billingService.getMrrSnapshot();
  }

  // ─── Admin — listing billing status ──────────────────────────────────────
  @Get('admin/listings/:listingId')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  async getListingBillingStatus(@Param('listingId') listingId: string) {
    return this.billingService.getListingBillingStatus(listingId);
  }

  // ─── Admin — cancel subscription ──────────────────────────────────────────
  @Patch('admin/subscriptions/:id/cancel')
  @UseGuards(ClerkAuthGuard, AdminGuard)
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser() admin: UserEntity,
  ) {
    return this.billingService.cancelSubscription(subscriptionId, admin.id);
  }
}
