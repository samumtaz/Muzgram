import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '@muzgram/types';

import { UserEntity } from '../../database/entities/user.entity';

export const OWNER_PARAM_KEY = 'ownerParam';

// Usage: @SetMetadata(OWNER_PARAM_KEY, 'userId') on routes where :userId must match auth user
// Admins and moderators bypass this check automatically.
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const paramName = this.reflector.getAllAndOverride<string>(OWNER_PARAM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!paramName) return true;

    const request = context.switchToHttp().getRequest<{
      user?: UserEntity;
      params?: Record<string, string>;
    }>();

    const user = request.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    // Admins and moderators bypass ownership check
    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) return true;

    const resourceOwnerId = request.params?.[paramName];
    if (!resourceOwnerId) return true;

    if (user.id !== resourceOwnerId) {
      throw new ForbiddenException('You do not own this resource');
    }

    return true;
  }
}
