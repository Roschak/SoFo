import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SofoError, type SofoErrorBody, type SofoErrorCode } from '@sofo/shared';

const STATUS_BY_CODE: Record<SofoErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const CODE_BY_STATUS: Record<number, SofoErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

@Catch()
export class SofoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let body: SofoErrorBody;
    let status: number;

    if (exception instanceof SofoError) {
      body = exception.toBody();
      status = STATUS_BY_CODE[exception.code];
    } else if (exception instanceof HttpException) {
      // Framework exceptions (validation pipe, UUID pipe, guards) keep their
      // HTTP status but are normalized into the standard SOFO body (PRD §56).
      status = exception.getStatus();
      const payload = exception.getResponse();
      body =
        typeof payload === 'object' && payload !== null && 'code' in payload
          ? (payload as SofoErrorBody)
          : {
              code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
              message: typeof payload === 'string' ? payload : exception.message,
            };
    } else {
      // Never leak stack traces or internals (PRD §56).
      body = { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
      status = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    response.status(status).json(body);
  }
}
