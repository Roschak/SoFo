/**
 * Standard SOFO error contract (PRD §56).
 * Every module throws SofoError; the API layer maps it to a standardized response.
 * Never expose stack traces or database details (PRD §56).
 */

export const SOFO_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;

export type SofoErrorCode = (typeof SOFO_ERROR_CODES)[number];

export interface SofoErrorBody {
  readonly code: SofoErrorCode;
  readonly message: string;
  readonly details?: readonly string[];
}

export class SofoError extends Error {
  readonly code: SofoErrorCode;
  readonly details: readonly string[];

  constructor(code: SofoErrorCode, message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'SofoError';
    this.code = code;
    this.details = details;
  }

  toBody(): SofoErrorBody {
    return this.details.length > 0
      ? { code: this.code, message: this.message, details: this.details }
      : { code: this.code, message: this.message };
  }
}

export const validationError = (details: readonly string[]): SofoError =>
  new SofoError('VALIDATION_ERROR', 'Request validation failed', details);

export const unauthenticated = (message = 'Authentication required'): SofoError =>
  new SofoError('UNAUTHENTICATED', message);

export const forbidden = (message = 'You do not have permission to perform this action'): SofoError =>
  new SofoError('FORBIDDEN', message);

export const notFound = (resource: string): SofoError =>
  new SofoError('NOT_FOUND', `${resource} not found`);

export const conflict = (message: string): SofoError => new SofoError('CONFLICT', message);
