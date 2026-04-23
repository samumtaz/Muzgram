import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { Cache } from 'cache-manager';
import { DataSource, Repository } from 'typeorm';

import { AuditLogEntity } from '../../database/entities/audit-log.entity';
import { CityEntity } from '../../database/entities/city.entity';
import { ListingEntity } from '../../database/entities/listing.entity';
import { NotificationLogEntity } from '../../database/entities/notification-log.entity';
import { BillingService } from '../billing/billing.service';
import { SupportService } from '../support/support.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(ListingEntity)
    private readonly listingRepo: Repository<ListingEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(NotificationLogEntity)
    private readonly notifLogRepo: Repository<NotificationLogEntity>,
    private readonly billingService: BillingService,
    private readonly supportService: SupportService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getStats() {
    const cacheKey = 'admin:stats';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [users, content, moderation, notifications, leads] = await Promise.all([
      this.getUserStats(),
      this.getContentStats(),
      this.getModerationStats(),
      this.getNotificationStats(),
      this.getLeadStats(),
    ]);

    const stats = { users, content, moderation, notifications, leads };
    await this.cache.set(cacheKey, stats, 60 * 1000);
    return stats;
  }

  async flushCache() {
    await this.cache.del('admin:stats');
    return { flushed: true };
  }

  // ─── Revenue ──────────────────────────────────────────────────────────────

  async getRevenue() {
    const mrr = await this.billingService.getMrrSnapshot();

    const [newThisMonth, churnedThisMonth] = await Promise.all([
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND created_at >= date_trunc('month', NOW())`,
      ),
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM subscriptions WHERE status = 'canceled' AND canceled_at >= date_trunc('month', NOW())`,
      ),
    ]);

    return {
      mrr: parseFloat(mrr.mrrUsd),
      arr: parseFloat(mrr.mrrUsd) * 12,
      active_subscriptions: mrr.activeSubscriptions,
      new_this_month: parseInt(newThisMonth[0]?.count ?? '0', 10),
      churned_this_month: parseInt(churnedThisMonth[0]?.count ?? '0', 10),
    };
  }

  async getRevenuePayments() {
    return this.db.query<Array<{
      id: string; business_name: string; amount_cents: number;
      product_key: string; status: string; created_at: string;
    }>>(
      `SELECT p.id, l.name AS business_name, p.amount_cents, p.product_key, p.status, p.created_at
       FROM payments p
       LEFT JOIN listings l ON p.listing_id = l.id
       ORDER BY p.created_at DESC LIMIT 100`,
    );
  }

  // ─── Cities ───────────────────────────────────────────────────────────────

  async getCities() {
    const cities = await this.cityRepo.find({ order: { name: 'ASC' } });
    return cities.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      state: c.state,
      launch_status: c.isActive ? 'active' : 'planned',
      listing_count: c.listingsCount,
      event_count: 0,
      is_active: c.isActive,
    }));
  }

  async createCity(data: { slug: string; name: string; state: string; centerLat: number; centerLng: number }) {
    const city = this.cityRepo.create({
      slug: data.slug,
      name: data.name,
      state: data.state,
      centerLat: data.centerLat,
      centerLng: data.centerLng,
      isActive: false,
    });
    return this.cityRepo.save(city);
  }

  async updateCity(id: string, data: Partial<{ name: string; is_active: boolean; launch_status: string }>) {
    const patch: Partial<CityEntity> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.is_active !== undefined) patch.isActive = data.is_active;
    if (data.launch_status !== undefined) patch.isActive = data.launch_status === 'active';
    await this.cityRepo.update(id, patch);
    return this.cityRepo.findOneOrFail({ where: { id } });
  }

  // ─── Verifications ────────────────────────────────────────────────────────

  async getVerifications(status?: string) {
    let sql = `
      SELECT l.id, l.name AS business_name,
             u.display_name AS contact_name, u.phone AS contact_phone,
             l.claimed_at AS submission_date, l.status,
             COALESCE(l.media_urls, '[]'::jsonb) AS doc_urls
      FROM listings l
      LEFT JOIN users u ON u.id = l.claimed_by_user_id
      WHERE l.claimed_by_user_id IS NOT NULL
    `;
    const params: string[] = [];

    if (status === 'pending') {
      sql += ` AND l.status = 'pending'`;
    } else if (status === 'approved') {
      sql += ` AND l.status = 'active'`;
    } else if (status === 'rejected') {
      sql += ` AND l.status = 'rejected'`;
    }

    sql += ` ORDER BY l.claimed_at DESC LIMIT 100`;

    const rows = await this.db.query<Array<Record<string, any>>>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      business_name: r.business_name,
      contact_name: r.contact_name ?? '',
      contact_phone: r.contact_phone ?? '',
      submission_date: r.submission_date,
      status: r.status === 'active' ? 'approved' : r.status,
      doc_urls: Array.isArray(r.doc_urls) ? r.doc_urls : [],
      notes: null,
    }));
  }

  async reviewVerification(id: string, status: 'approved' | 'rejected', notes?: string) {
    const dbStatus = status === 'approved' ? 'active' : 'rejected';
    await this.listingRepo.update(id, { status: dbStatus as any });
    return { id, status, notes };
  }

  // ─── Platform Settings ────────────────────────────────────────────────────

  private readonly SETTINGS_CACHE_KEY = 'admin:settings';
  private readonly DEFAULT_SETTINGS = {
    founding_member_slots: 50,
    founding_member_price_usd: 149,
    feed_default_radius_km: 25,
    rate_limit_max: 120,
    moderation_auto_approve: false,
  };

  async getSettings() {
    const cached = await this.cache.get<Record<string, unknown>>(this.SETTINGS_CACHE_KEY);
    return cached ?? this.DEFAULT_SETTINGS;
  }

  async updateSettings(data: Record<string, unknown>) {
    const current = await this.getSettings();
    const updated = { ...current, ...data };
    await this.cache.set(this.SETTINGS_CACHE_KEY, updated, 0);
    return updated;
  }

  // ─── Notification Log ─────────────────────────────────────────────────────

  async getNotificationLogStats() {
    const [sentToday, deliveryRate] = await Promise.all([
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM notification_logs WHERE created_at >= date_trunc('day', NOW())`,
      ),
      this.db.query<[{ rate: string }]>(
        `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status = 'ok') / NULLIF(COUNT(*), 0), 1) AS rate
         FROM notification_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
    ]);

    return {
      sent_today: parseInt(sentToday[0]?.count ?? '0', 10),
      delivery_rate: parseFloat(deliveryRate[0]?.rate ?? '0'),
    };
  }

  async getNotificationLogs(limit = 100) {
    return this.notifLogRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  async getAuditLogs(cursor?: string, limit = 50) {
    const take = Math.min(limit, 100);
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .take(take + 1);

    if (cursor) {
      const decoded = Buffer.from(cursor, 'base64').toString('utf8');
      const { createdAt } = JSON.parse(decoded) as { createdAt: string };
      qb.where('a.createdAt < :createdAt', { createdAt });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > take;
    const data = rows.slice(0, take);
    const nextCursor =
      hasMore && data.length > 0
        ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1].createdAt })).toString('base64')
        : null;

    return { items: data, meta: { cursor: nextCursor, hasMore } };
  }

  // ─── Support Tickets ──────────────────────────────────────────────────────

  async getSupportTickets(status?: string) {
    return this.supportService.getAdminTickets(status);
  }

  async resolveSupportTicket(id: string) {
    return this.supportService.resolveTicket(id);
  }

  // ─── Private stat helpers ─────────────────────────────────────────────────

  private async getUserStats() {
    const [total, newToday, activeThisWeek] = await Promise.all([
      this.db.query<[{ count: string }]>('SELECT COUNT(*) FROM users WHERE is_active = true'),
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(DISTINCT user_id) FROM activity_logs WHERE occurred_at >= NOW() - INTERVAL '7 days'`,
      ),
    ]);
    return {
      total: parseInt(total[0]?.count ?? '0', 10),
      new_today: parseInt(newToday[0]?.count ?? '0', 10),
      active_this_week: parseInt(activeThisWeek[0]?.count ?? '0', 10),
    };
  }

  private async getContentStats() {
    const [listings, events, posts, pending] = await Promise.all([
      this.db.query<[{ count: string }]>(`SELECT COUNT(*) FROM listings WHERE status = 'active'`),
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM events WHERE status = 'active' AND start_at > NOW()`,
      ),
      this.db.query<[{ count: string }]>(`SELECT COUNT(*) FROM community_posts WHERE status = 'active'`),
      this.db.query<Array<{ count: string }>>(
        `SELECT COUNT(*) FROM listings WHERE status = 'pending'
         UNION ALL SELECT COUNT(*) FROM events WHERE status = 'pending'
         UNION ALL SELECT COUNT(*) FROM community_posts WHERE status = 'pending'`,
      ),
    ]);
    const pendingCount = pending.reduce((sum, r) => sum + parseInt(r.count ?? '0', 10), 0);
    return {
      active_listings: parseInt(listings[0]?.count ?? '0', 10),
      upcoming_events: parseInt(events[0]?.count ?? '0', 10),
      active_posts: parseInt(posts[0]?.count ?? '0', 10),
      pending_moderation: pendingCount,
    };
  }

  private async getModerationStats() {
    const [queueDepth] = await this.db.query<[{ count: string }]>(
      `SELECT COUNT(*) FROM (
         SELECT id FROM listings WHERE status = 'pending'
         UNION ALL SELECT id FROM events WHERE status = 'pending'
         UNION ALL SELECT id FROM community_posts WHERE status = 'pending'
       ) sub`,
    );
    return { queue_depth: parseInt(queueDepth?.count ?? '0', 10) };
  }

  private async getNotificationStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [sentToday, deliveryRate] = await Promise.all([
      this.db.query<[{ count: string }]>(
        `SELECT COUNT(*) FROM notification_logs WHERE created_at >= $1`,
        [today],
      ),
      this.db.query<[{ rate: string }]>(
        `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE delivery_status = 'ok') / NULLIF(COUNT(*), 0), 1) AS rate
         FROM notification_logs WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      ),
    ]);
    return {
      sent_today: parseInt(sentToday[0]?.count ?? '0', 10),
      delivery_rate: parseFloat(deliveryRate[0]?.rate ?? '0'),
    };
  }

  private async getLeadStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalToday] = await this.db.query<[{ count: string }]>(
      `SELECT COUNT(*) FROM leads WHERE created_at >= $1`,
      [today],
    );
    return { total_today: parseInt(totalToday?.count ?? '0', 10) };
  }
}
