import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

import { Observable, map } from 'rxjs';

import { ApiResponse } from '@muzgram/types';

// Wraps all non-error responses in { data: T } envelope
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // Already wrapped (e.g., paginated responses that include meta)
        if (value && typeof value === 'object' && 'data' in value && 'meta' in value) {
          return value as ApiResponse<T>;
        }
        return { data: value } as ApiResponse<T>;
      }),
    );
  }
}
