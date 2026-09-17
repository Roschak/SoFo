import { SofoError, validationError, forbidden } from './errors';

describe('SofoError', () => {
  it('carries code, message, and details', () => {
    const error = validationError(['email is invalid']);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual(['email is invalid']);
  });

  it('omits empty details from the body', () => {
    const error = forbidden();
    expect(error.toBody()).toEqual({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });
  });

  it('is a real Error instance', () => {
    expect(new SofoError('CONFLICT', 'dup') instanceof Error).toBe(true);
  });
});
