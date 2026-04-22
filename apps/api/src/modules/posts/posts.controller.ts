import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { PostsService } from './posts.service';

class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  body: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsString()
  linkedListingId?: string;

  @IsOptional()
  @IsString()
  linkedEventId?: string;

  @IsNotEmpty()
  @IsString()
  cityId: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a community post by ID' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a community post' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: UserEntity) {
    return this.postsService.create(dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete own community post' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserEntity) {
    return this.postsService.deletePost(id, user.id);
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get current user community posts' })
  getMyPosts(@CurrentUser() user: UserEntity) {
    return this.postsService.getUserPosts(user.id);
  }
}
