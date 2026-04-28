import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { EventSyncService } from './event-sync.service';
import { EventsService } from './events.service';

class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsString()
  categoryId: string;

  @IsString()
  cityId: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsUrl()
  onlineUrl?: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @IsOptional()
  @IsUrl()
  ticketUrl?: string;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  listingId?: string;
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventSync: EventSyncService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findById(id);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get event by slug (for SEO pages)' })
  getBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get upcoming events for a city' })
  getUpcoming(@Query('cityId') cityId: string, @Query('limit') limit?: string) {
    return this.eventsService.getUpcoming(cityId, limit ? parseInt(limit) : 20);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a new event (goes to moderation queue)' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: UserEntity) {
    return this.eventsService.create(
      {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
      user,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an event' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.eventsService.cancelEvent(id, user.id);
  }

  @Public()
  @Post('sync')
  @ApiOperation({ summary: 'Manually trigger external event sync (admin only)' })
  triggerSync(@Headers('x-admin-token') token: string) {
    const expected = this.config.get<string>('ADMIN_TOKEN');
    if (!expected || token !== expected) throw new UnauthorizedException();
    // Run in background — sync takes ~60s, don't hold the HTTP connection
    this.eventSync.syncAll().catch((err) => console.error('[EventSync] error:', err));
    return { started: true, message: 'Sync running in background — watch server logs for progress' };
  }
}
