import {
  Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminGuard } from '../../common/guards/admin.guard';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('v1/admin')
@UseGuards(ClerkAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Aggregated platform stats' })
  getStats() {
    return this.adminService.getStats();
  }

  @Post('cache/flush')
  @ApiOperation({ summary: 'Flush admin stats cache' })
  flushCache() {
    return this.adminService.flushCache();
  }

  // ─── Revenue ──────────────────────────────────────────────────────────────

  @Get('revenue')
  @ApiOperation({ summary: 'MRR, ARR, subscription counts' })
  getRevenue() {
    return this.adminService.getRevenue();
  }

  @Get('revenue/payments')
  @ApiOperation({ summary: 'Recent payments list' })
  getRevenuePayments() {
    return this.adminService.getRevenuePayments();
  }

  // ─── Cities ───────────────────────────────────────────────────────────────

  @Get('cities')
  @ApiOperation({ summary: 'List all cities' })
  getCities() {
    return this.adminService.getCities();
  }

  @Post('cities')
  @ApiOperation({ summary: 'Create a new city' })
  createCity(
    @Body() body: { slug: string; name: string; state: string; centerLat: number; centerLng: number },
  ) {
    return this.adminService.createCity(body);
  }

  @Patch('cities/:id')
  @ApiOperation({ summary: 'Update city (name, launch_status, is_active)' })
  updateCity(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; is_active: boolean; launch_status: string }>,
  ) {
    return this.adminService.updateCity(id, body);
  }

  // ─── Verifications ────────────────────────────────────────────────────────

  @Get('verifications')
  @ApiOperation({ summary: 'Business verification queue' })
  getVerifications(@Query('status') status?: string) {
    return this.adminService.getVerifications(status);
  }

  @Patch('verifications/:id')
  @ApiOperation({ summary: 'Approve or reject a business verification' })
  reviewVerification(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected'; notes?: string },
  ) {
    return this.adminService.reviewVerification(id, body.status, body.notes);
  }

  // ─── Platform Settings ────────────────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.adminService.updateSettings(body);
  }

  // ─── Notification Log ─────────────────────────────────────────────────────

  @Get('notification-stats')
  @ApiOperation({ summary: 'Notification delivery stats' })
  getNotificationStats() {
    return this.adminService.getNotificationLogStats();
  }

  @Get('notification-logs')
  @ApiOperation({ summary: 'Recent notification log entries' })
  getNotificationLogs(@Query('limit') limit?: string) {
    return this.adminService.getNotificationLogs(limit ? parseInt(limit, 10) : 100);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Paginated admin audit log' })
  getAuditLogs(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return this.adminService.getAuditLogs(cursor, limit ? parseInt(limit, 10) : 50);
  }

  // ─── Support Tickets ──────────────────────────────────────────────────────

  @Get('support-tickets')
  @ApiOperation({ summary: 'Admin support ticket queue' })
  getSupportTickets(@Query('status') status?: string) {
    return this.adminService.getSupportTickets(status);
  }

  @Patch('support-tickets/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Resolve a support ticket' })
  resolveSupportTicket(@Param('id') id: string) {
    return this.adminService.resolveSupportTicket(id);
  }
}
