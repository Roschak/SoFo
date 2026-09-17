import { ValidationPipe, BadRequestException } from '@nestjs/common';

/**
 * Global input validation pipe.
 * Maps class-validator failures to the standard SOFO VALIDATION_ERROR contract
 * (PRD §55: validate input first; PRD §56: standardized error body).
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const details = errors.flatMap((error) =>
        error.constraints ? Object.values(error.constraints) : [],
      );
      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details,
      });
    },
  });
}
