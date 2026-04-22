import * as Sentry from '@sentry/nestjs';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { ProblemDetail } from '@muzgram/types';

// RFC 9457 Problem Details error format
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const { status, problem } = this.resolveProblem(exception, request);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      Sentry.captureException(exception);
    }

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .send(problem);
  }

  private resolveProblem(
    exception: unknown,
    request: { method: string; url: string },
  ): { status: number; problem: ProblemDetail } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const detail =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message: string | string[] }).message;

      const messages = Array.isArray(detail) ? detail : [detail];

      return {
        status,
        problem: {
          type: `https://muzgram.com/errors/${this.statusToSlug(status)}`,
          title: exception.message,
          status,
          detail: messages[0] ?? exception.message,
          instance: request.url,
          errors:
            messages.length > 1
              ? messages.map((m) => ({ field: 'unknown', message: m }))
              : undefined,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      problem: {
        type: 'https://muzgram.com/errors/internal-server-error',
        title: 'Internal Server Error',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: 'An unexpected error occurred.',
        instance: request.url,
      },
    };
  }

  private statusToSlug(status: number): string {
    const map: Record<number, string> = {
      400: 'bad-request',
      401: 'unauthorized',
      403: 'forbidden',
      404: 'not-found',
      409: 'conflict',
      422: 'unprocessable-entity',
      429: 'too-many-requests',
      500: 'internal-server-error',
    };
    return map[status] ?? 'error';
  }
}
