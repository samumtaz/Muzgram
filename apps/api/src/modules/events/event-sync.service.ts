import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventStatus } from '@muzgram/types';

import { CityEntity } from '../../database/entities/city.entity';
import { EventEntity } from '../../database/entities/event.entity';
import { ListingCategoryEntity } from '../../database/entities/listing-category.entity';

// Cities with significant Muslim / South-Asian populations
// region: 'midwest' | 'east' | 'south' | 'west' | 'canada'
const SYNC_CITIES = [
  // ── Midwest (launch region) ───────────────────────────────────────────────
  { name: 'Chicago',          lat: 41.9977,  lng: -87.6936,  radiusKm: 40, region: 'midwest' },
  { name: 'Dearborn',         lat: 42.3222,  lng: -83.1763,  radiusKm: 30, region: 'midwest' },
  { name: 'Minneapolis',      lat: 44.9778,  lng: -93.2650,  radiusKm: 30, region: 'midwest' },
  { name: 'Columbus',         lat: 39.9612,  lng: -82.9988,  radiusKm: 30, region: 'midwest' },
  { name: 'Indianapolis',     lat: 39.7684,  lng: -86.1581,  radiusKm: 30, region: 'midwest' },
  // ── East ─────────────────────────────────────────────────────────────────
  { name: 'New York',         lat: 40.7128,  lng: -74.0060,  radiusKm: 40, region: 'east' },
  { name: 'Washington DC',    lat: 38.9072,  lng: -77.0369,  radiusKm: 35, region: 'east' },
  { name: 'Northern Virginia', lat: 38.8462, lng: -77.3064,  radiusKm: 30, region: 'east' },
  { name: 'Boston',           lat: 42.3601,  lng: -71.0589,  radiusKm: 30, region: 'east' },
  { name: 'Philadelphia',     lat: 39.9526,  lng: -75.1652,  radiusKm: 30, region: 'east' },
  // ── South ────────────────────────────────────────────────────────────────
  { name: 'Dallas',           lat: 32.8577,  lng: -97.0075,  radiusKm: 40, region: 'south' },
  { name: 'Houston',          lat: 29.7604,  lng: -95.3698,  radiusKm: 40, region: 'south' },
  { name: 'Atlanta',          lat: 33.7490,  lng: -84.3880,  radiusKm: 40, region: 'south' },
  { name: 'Charlotte',        lat: 35.2271,  lng: -80.8431,  radiusKm: 30, region: 'south' },
  // ── West ─────────────────────────────────────────────────────────────────
  { name: 'Los Angeles',      lat: 34.0522,  lng: -118.2437, radiusKm: 40, region: 'west' },
  { name: 'San Francisco',    lat: 37.7749,  lng: -122.4194, radiusKm: 35, region: 'west' },
  { name: 'San Jose',         lat: 37.3382,  lng: -121.8863, radiusKm: 30, region: 'west' },
  { name: 'Seattle',          lat: 47.6062,  lng: -122.3321, radiusKm: 30, region: 'west' },
  // ── Canada ───────────────────────────────────────────────────────────────
  { name: 'Toronto',          lat: 43.6532,  lng: -79.3832,  radiusKm: 35, region: 'canada' },
  { name: 'Mississauga',      lat: 43.5890,  lng: -79.6441,  radiusKm: 25, region: 'canada' },
] as const;

const KEYWORDS = [
  'Muslim', 'Islamic', 'Halal',
  'Bollywood', 'Diljit',
  'South Asian', 'Desi',
  'Eid', 'Ramadan',
  'Pakistani',
] as const;

const KEYWORD_TAGS: Record<string, string[]> = {
  Muslim:         ['islamic'],
  Islamic:        ['islamic'],
  Halal:          ['islamic'],
  Bollywood:      ['entertainment'],
  Diljit:         ['entertainment'],
  'South Asian':  ['entertainment', 'community'],
  Desi:           ['entertainment'],
  Eid:            ['eid', 'islamic'],
  Ramadan:        ['ramadan', 'islamic'],
  Pakistani:      ['community'],
};

interface NormalizedEvent {
  externalId: string;
  source: 'ticketmaster' | 'eventbrite';
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  startAt: Date;
  endAt: Date | null;
  isFree: boolean;
  ticketUrl: string | null;
  thumbnailUrl: string | null;
  organizerName: string | null;
  tags: string[];
}

@Injectable()
export class EventSyncService implements OnModuleInit {
  private readonly logger = new Logger(EventSyncService.name);
  private fallbackCategoryId: string | null = null;
  private readonly cityCache = new Map<string, string | null>();

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(CityEntity)
    private readonly cityRepo: Repository<CityEntity>,
    @InjectRepository(ListingCategoryEntity)
    private readonly categoryRepo: Repository<ListingCategoryEntity>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const cat = await this.categoryRepo.findOne({ where: {}, order: { createdAt: 'ASC' } } as any);
    if (cat) this.fallbackCategoryId = cat.id;
  }

  async syncAll(): Promise<{ synced: number; skipped: number }> {
    const tmKey = this.config.get<string>('TICKETMASTER_API_KEY');
    const ebKey = this.config.get<string>('EVENTBRITE_API_KEY');

    if (!tmKey && !ebKey) {
      this.logger.warn('No event API keys — set TICKETMASTER_API_KEY or EVENTBRITE_API_KEY');
      return { synced: 0, skipped: 0 };
    }

    // SYNC_REGIONS=midwest  → only midwest cities
    // SYNC_REGIONS=all      → every city
    // SYNC_REGIONS=midwest,east → comma-separated list
    const regionsEnv = this.config.get<string>('SYNC_REGIONS', 'midwest');
    const regions = regionsEnv === 'all' ? null : regionsEnv.split(',').map((r) => r.trim());
    const cities = regions ? SYNC_CITIES.filter((c) => regions.includes(c.region)) : SYNC_CITIES;

    this.logger.log(`Syncing ${cities.length} cities (regions: ${regionsEnv})`);

    let synced = 0;
    let skipped = 0;

    for (const city of cities) {
      for (const keyword of KEYWORDS) {
        if (tmKey) {
          const events = await this.fetchTicketmaster(city, keyword, tmKey);
          for (const ev of events) {
            (await this.upsertEvent(ev)) ? synced++ : skipped++;
          }
          await sleep(300);
        }
      }
    }

    this.logger.log(`Event sync complete — ${synced} upserted, ${skipped} skipped`);
    return { synced, skipped };
  }

  // ── Ticketmaster ─────────────────────────────────────────────────────────────

  private async fetchTicketmaster(
    city: (typeof SYNC_CITIES)[number],
    keyword: string,
    apiKey: string,
  ): Promise<NormalizedEvent[]> {
    try {
      const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
      url.searchParams.set('apikey', apiKey);
      url.searchParams.set('keyword', keyword);
      url.searchParams.set('latlong', `${city.lat},${city.lng}`);
      url.searchParams.set('radius', String(city.radiusKm));
      url.searchParams.set('unit', 'km');
      url.searchParams.set('startDateTime', new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
      url.searchParams.set('size', '50');
      url.searchParams.set('sort', 'date,asc');

      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status !== 429) {
          this.logger.warn(`TM ${keyword}@${city.name}: HTTP ${res.status}`);
        }
        return [];
      }

      const json: any = await res.json();
      const events: any[] = json?._embedded?.events ?? [];

      return events
        .map((e): NormalizedEvent | null => {
          const venue = e._embedded?.venues?.[0];
          if (!venue?.location?.latitude || !venue?.location?.longitude) return null;

          const lat = parseFloat(venue.location.latitude);
          const lng = parseFloat(venue.location.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const startAt = e.dates?.start?.dateTime
            ? new Date(e.dates.start.dateTime)
            : new Date(`${e.dates.start.localDate}T${e.dates.start.localTime ?? '00:00:00'}`);
          if (isNaN(startAt.getTime())) return null;

          const endAt = e.dates?.end?.dateTime ? new Date(e.dates.end.dateTime) : null;
          const img = (e.images as any[] | undefined)
            ?.sort((a, b) => b.width - a.width)[0];
          const addressParts = [
            venue.address?.line1,
            venue.city?.name,
            venue.state?.stateCode,
          ].filter(Boolean);

          return {
            externalId: `tm:${e.id}`,
            source: 'ticketmaster',
            title: (e.name as string).trim(),
            description: [e.info, e.pleaseNote].filter(Boolean).join('\n') || (e.name as string),
            address: addressParts.join(', ') || venue.name || city.name,
            lat,
            lng,
            startAt,
            endAt,
            isFree: !!(e.priceRanges as any[] | undefined)?.some((p: any) => p.min === 0),
            ticketUrl: e.url ?? null,
            thumbnailUrl: img?.url ?? null,
            organizerName: (e as any).promoter?.name ?? null,
            tags: KEYWORD_TAGS[keyword] ?? ['community'],
          };
        })
        .filter((e): e is NormalizedEvent => e !== null);
    } catch (err) {
      this.logger.error(`TM fetch error [${keyword}@${city.name}]: ${(err as Error).message}`);
      return [];
    }
  }

  // ── Eventbrite ───────────────────────────────────────────────────────────────

  private async fetchEventbrite(
    city: (typeof SYNC_CITIES)[number],
    keyword: string,
    token: string,
  ): Promise<NormalizedEvent[]> {
    try {
      const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
      url.searchParams.set('q', keyword);
      url.searchParams.set('location.latitude', String(city.lat));
      url.searchParams.set('location.longitude', String(city.lng));
      url.searchParams.set('location.within', `${city.radiusKm}km`);
      url.searchParams.set('start_date.range_start', new Date().toISOString());
      url.searchParams.set('expand', 'venue,organizer');
      url.searchParams.set('page_size', '50');

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status !== 429) {
          this.logger.warn(`EB ${keyword}@${city.name}: HTTP ${res.status}`);
        }
        return [];
      }

      const json: any = await res.json();
      const events: any[] = json?.events ?? [];

      return events
        .map((e): NormalizedEvent | null => {
          const venue = e.venue;
          if (!venue?.latitude || !venue?.longitude) return null;

          const lat = parseFloat(venue.latitude);
          const lng = parseFloat(venue.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          const startAt = new Date(e.start.utc);
          if (isNaN(startAt.getTime())) return null;

          const endAt = e.end?.utc ? new Date(e.end.utc) : null;

          return {
            externalId: `eb:${e.id}`,
            source: 'eventbrite',
            title: (e.name.text as string).trim(),
            description: e.description?.text || e.name.text,
            address: venue.address?.localized_address_display ?? venue.name ?? city.name,
            lat,
            lng,
            startAt,
            endAt,
            isFree: !!e.is_free,
            ticketUrl: e.url ?? null,
            thumbnailUrl: e.logo?.url ?? null,
            organizerName: e.organizer?.name ?? null,
            tags: KEYWORD_TAGS[keyword] ?? ['community'],
          };
        })
        .filter((e): e is NormalizedEvent => e !== null);
    } catch (err) {
      this.logger.error(`EB fetch error [${keyword}@${city.name}]: ${(err as Error).message}`);
      return [];
    }
  }

  // ── Upsert ───────────────────────────────────────────────────────────────────

  private async upsertEvent(ev: NormalizedEvent): Promise<boolean> {
    try {
      if (ev.startAt <= new Date()) return false;

      if (!this.fallbackCategoryId) {
        const cat = await this.categoryRepo.findOne({ where: {}, order: { createdAt: 'ASC' } } as any);
        if (!cat) return false;
        this.fallbackCategoryId = cat.id;
      }

      const cityId = await this.findNearestCityId(ev.lat, ev.lng);
      if (!cityId) return false;

      const existing = await this.eventRepo.findOne({ where: { externalId: ev.externalId } });

      if (existing) {
        await this.eventRepo.update(existing.id, {
          title: ev.title,
          startAt: ev.startAt,
          endAt: ev.endAt,
          isFree: ev.isFree,
          ticketUrl: ev.ticketUrl,
          organizerName: ev.organizerName,
          ...(ev.thumbnailUrl && { thumbnailUrl: ev.thumbnailUrl }),
        });
      } else {
        const slug = await this.generateSlug(ev.title, ev.startAt);
        const entity = this.eventRepo.create({
          slug,
          title: ev.title,
          description: ev.description,
          categoryId: this.fallbackCategoryId,
          organizerId: null,
          organizerName: ev.organizerName,
          cityId,
          address: ev.address,
          lat: ev.lat,
          lng: ev.lng,
          location: (() => `ST_SetSRID(ST_MakePoint(${ev.lng}, ${ev.lat}), 4326)`) as any,
          startAt: ev.startAt,
          endAt: ev.endAt,
          isFree: ev.isFree,
          ticketUrl: ev.ticketUrl,
          thumbnailUrl: ev.thumbnailUrl,
          tags: ev.tags,
          status: EventStatus.ACTIVE,
          source: ev.source,
          externalId: ev.externalId,
          isFeatured: false,
          isRecurring: false,
          isOnline: false,
        } as any);
        await this.eventRepo.save(entity);
      }

      return true;
    } catch (err) {
      this.logger.warn(`upsert failed [${ev.externalId}]: ${(err as Error).message}`);
      return false;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async findNearestCityId(lat: number, lng: number): Promise<string | null> {
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    if (this.cityCache.has(key)) return this.cityCache.get(key)!;

    // Use centerLat/centerLng columns (always populated) rather than the nullable geometry column
    const rows: any[] = await this.cityRepo.query(
      `SELECT id FROM cities
       WHERE ABS(center_lat - $1) < 2.0
         AND ABS(center_lng - $2) < 2.0
       ORDER BY ((center_lat - $1)^2 + (center_lng - $2)^2)
       LIMIT 1`,
      [lat, lng],
    );

    const id: string | null = rows[0]?.id ?? null;
    this.cityCache.set(key, id);
    return id;
  }

  private async generateSlug(title: string, startAt: Date): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
    const date = startAt.toISOString().slice(0, 10).replace(/-/g, '');
    let slug = `${base}-${date}`;

    const exists = await this.eventRepo.findOne({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;
    return slug;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
