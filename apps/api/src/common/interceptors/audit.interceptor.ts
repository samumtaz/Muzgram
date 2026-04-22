import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import { DataSource } from 'typeorm';

import { UserEntity } from '../../database/entities/user.entity';

export const AUDIT_ACTION_KEY = 'auditAction';

// Usage: @SetMetadata(AUDIT_ACTION_KEY, 'listing.approve') on admin mutation routes
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly db: DataSource,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<{
      user?: UserEntity;
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      ip?: string;
    }>();

    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          if (!user) return;
          this.writeAuditLog(
            user.id,
            action,
            request.params ?? {},
            request.body ?? {},
            request.ip ?? 'unknown',
          ).catch((err: Error) => {
            this.logger.error(`Audit log write failed: ${err.message}`);
          });
        },
      }),
    );
  }

  private async writeAuditLog(
    userId: string,
    action: string,
    params: Record<string, unknown>,
    body: Record<string, unknown>,
    ip: string,
  ) {
    await this.db.query(
      `INSERT INTO moderation_actions (actor_id, action, target_id, target_type, metadata, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
      [
        userId,
        action,
        params['id'] ?? params['listingId'] ?? params['userId'] ?? null,
        action.split('.')[0] ?? 'unknown',
        JSON.stringify({ params, body }),
        ip,
      ],
    ).catch((err: Error) => {
      // moderation_actions table may not exist yet — fail silently in dev
      this.logger.warn(`Audit table write: ${err.message}`);
    });
  }
}
