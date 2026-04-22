import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { HalalCertification, ListingMainCategory } from '@muzgram/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { ListingsService } from './listings.service';

class CreateListingDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ListingMainCategory)
  mainCategory: ListingMainCategory;

  @IsString()
  categoryId: string;

  @IsString()
  cityId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  address: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsNumber()
  @Min(-90)
  lat: number;

  @IsNumber()
  @Min(-180)
  lng: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  instagramHandle?: string;

  @IsOptional()
  @IsEnum(HalalCertification)
  halalCertification?: HalalCertification;
}

class CreateDailySpecialDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;
}

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all listing categories' })
  getCategories() {
    return this.listingsService.getCategories();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: UserEntity) {
    return this.listingsService.findById(id, user?.id);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get listing by slug (for SEO pages)' })
  getBySlug(@Param('slug') slug: string) {
    return this.listingsService.findBySlug(slug);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a new listing (goes to moderation queue)' })
  create(@Body() dto: CreateListingDto, @CurrentUser() user: UserEntity) {
    return this.listingsService.create(dto, user);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim an unclaimed listing as the business owner' })
  claim(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.listingsService.claimListing(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update listing details (claimed owners only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateListingDto>,
    @CurrentUser() user: UserEntity,
  ) {
    return this.listingsService.updateListing(id, user.id, dto);
  }

  @Put(':id/special')
  @ApiOperation({ summary: "Post today's special (resets at midnight)" })
  createSpecial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDailySpecialDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.listingsService.createDailySpecial(id, user.id, dto);
  }
}
