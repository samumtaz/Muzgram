import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard } from '../../common/guards/admin.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserEntity } from '../../database/entities/user.entity';
import { LeadStatus } from '../../database/entities/lead.entity';
import { LeadsService } from './leads.service';
import { SubmitLeadDto } from './dto/submit-lead.dto';

@Controller('v1/leads')
@UseGuards(ClerkAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // POST /v1/leads — any authenticated user can submit a lead to a service provider
  @Post()
  async submit(@Body() dto: SubmitLeadDto, @CurrentUser() user: UserEntity) {
    return this.leadsService.submit(dto, user);
  }

  // GET /v1/leads/inbox?business_id=&status=&cursor= — business owner inbox
  @Get('inbox')
  async inbox(
    @CurrentUser() user: UserEntity,
    @Query('business_id', ParseUUIDPipe) businessId: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.getInbox(businessId, user.id, {
      status,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // PATCH /v1/leads/:id/status — business owner updates lead status
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body('status') status: LeadStatus,
    @CurrentUser() user: UserEntity,
  ) {
    return this.leadsService.updateStatus(leadId, status, user.id);
  }

  // GET /v1/leads/admin — admin overview
  @Get('admin')
  @UseGuards(AdminGuard)
  async adminList(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('listing_id') listingId?: string,
  ) {
    return this.leadsService.adminGetLeads({
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      listingId,
    });
  }
}
