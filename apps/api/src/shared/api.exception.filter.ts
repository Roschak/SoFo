import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { SofoError, type SofoErrorBody } from '@sofo/shared';

const STATUS_BY_CODE: Record<SofoError['code'], number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

@Catch()
export class SofoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let body: SofoErrorBody;
    if (exception instanceof SofoError) {
      body = exception.toBody();
    } else {
      // Never leak stack traces or internals (PRD §56).
      body = { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
    }

    const status = exception instanceof SofoError ? STATUS_BY_CODE[exception.code] : HttpStatus.INTERNAL_SERVER_ERROR;
    response.status(status).json(body);
  }
}
