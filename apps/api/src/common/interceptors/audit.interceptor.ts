import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import { UserEntity } from '../../database/entities/user.entity';
import { AuditService } from '../../modules/audit/audit.service';

export const AUDIT_ACTION_KEY = 'auditAction';

// Usage: @SetMetadata(AUDIT_ACTION_KEY, 'listing.approve') on admin mutation routes
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
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
      headers?: Record<string, string>;
    }>();

    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          if (!user) return;
          const targetId =
            request.params?.['id'] ??
            request.params?.['listingId'] ??
            request.params?.['userId'] ??
            null;

          this.auditService
            .log({
              actorId: user.id,
              actorRole: user.role,
              action,
              targetType: action.split('.')[0] ?? 'unknown',
              targetId,
              afterState: request.body ?? null,
              ipAddress: request.ip ?? null,
              userAgent: request.headers?.['user-agent'] ?? null,
            })
            .catch((err: Error) => {
              this.logger.error(`Audit interceptor error: ${err.message}`);
            });
        },
      }),
    );
  }
}
