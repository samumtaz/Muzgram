import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  citySlug?: string;
}

class UpdatePushTokenDto {
  @IsOptional()
  @IsString()
  expoPushToken: string | null;
}

class UpdateNotificationPrefsDto {
  @IsBoolean()
  @IsOptional()
  newEventNearby?: boolean;

  @IsBoolean()
  @IsOptional()
  listingSpecials?: boolean;

  @IsBoolean()
  @IsOptional()
  jummahReminder?: boolean;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: UserEntity) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update display name, neighborhood, city' })
  updateProfile(@CurrentUser() user: UserEntity, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/push-token')
  @ApiOperation({ summary: 'Register or clear Expo push token' })
  updatePushToken(@CurrentUser() user: UserEntity, @Body() dto: UpdatePushTokenDto) {
    return this.usersService.updatePushToken(user.id, dto.expoPushToken);
  }

  @Patch('me/notification-prefs')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPrefs(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateNotificationPrefsDto,
  ) {
    return this.usersService.updateNotificationPrefs(user.id, dto as Record<string, boolean>);
  }
}
