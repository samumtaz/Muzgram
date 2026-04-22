import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { BillingInterval, BillingProduct } from '../entities/subscription.entity';

export class CreateCheckoutSessionDto {
  @IsUUID()
  listingId: string;

  @IsEnum(BillingProduct)
  product: BillingProduct;

  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  successUrl?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cancelUrl?: string;
}
