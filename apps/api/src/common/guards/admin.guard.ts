import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { UserRole } from '@muzgram/types';

import { UserEntity } from '../../database/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: UserEntity }>();
    const user = request.user;

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR)) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
