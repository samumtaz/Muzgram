import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
  ) {}

  @Get()
  async check() {
    const dbOk = await this.db.query('SELECT 1').then(() => true).catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
