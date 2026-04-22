import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { BillingInterval, BillingProduct } from '../entities/subscription.entity';

export class RecordManualPaymentDto {
  @IsUUID()
  listingId: string;

  @IsEnum(BillingProduct)
  product: BillingProduct;

  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  amountCents: number;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
