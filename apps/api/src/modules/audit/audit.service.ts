import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { AuditLogEntity } from '../../database/entities/audit-log.entity';

export interface AuditLogEntry {
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.auditRepo
        .createQueryBuilder()
        .insert()
        .into(AuditLogEntity)
        .values({
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ?? null,
          beforeState: () => `'${JSON.stringify(entry.beforeState ?? null)}'::jsonb`,
          afterState: () => `'${JSON.stringify(entry.afterState ?? null)}'::jsonb`,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        })
        .execute();
    } catch (err) {
      // Never throw — audit failure must never block business logic
      this.logger.error(`Audit log write failed: ${(err as Error).message}`);
    }
  }
}
