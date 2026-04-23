import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { AdminGuard } from '../../common/guards/admin.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { SupportService } from './support.service';

class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}

class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}

@ApiTags('support')
@Controller('v1/support')
@UseGuards(ClerkAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket' })
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: UserEntity) {
    return this.supportService.createTicket(user.id, user.phone, dto.subject, dto.body);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get the authenticated user support tickets' })
  getUserTickets(@CurrentUser() user: UserEntity) {
    return this.supportService.getUserTickets(user.id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message to a support ticket' })
  addMessage(
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.supportService.addMessage(id, user.id, 'user', dto.body);
  }

  // Admin routes
  @Get('admin/tickets')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[ADMIN] Get all support tickets' })
  getAdminTickets(@Query('status') status?: string) {
    return this.supportService.getAdminTickets(status);
  }

  @Patch('admin/tickets/:id/resolve')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '[ADMIN] Resolve a support ticket' })
  resolveTicket(@Param('id') id: string) {
    return this.supportService.resolveTicket(id);
  }
}
