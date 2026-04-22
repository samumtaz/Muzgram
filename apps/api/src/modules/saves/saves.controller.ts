import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { ContentType } from '@muzgram/types';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { SavesService } from './saves.service';

class ToggleSaveDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  @IsString()
  contentId: string;
}

@ApiTags('saves')
@Controller('saves')
export class SavesController {
  constructor(private readonly savesService: SavesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all saved items for current user' })
  getMySaves(
    @CurrentUser() user: UserEntity,
    @Query('type') contentType?: ContentType,
  ) {
    return this.savesService.getUserSaves(user.id, contentType);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Save or unsave an item (idempotent toggle)' })
  toggle(@Body() dto: ToggleSaveDto, @CurrentUser() user: UserEntity) {
    return this.savesService.toggle(user.id, dto.contentType, dto.contentId);
  }
}
