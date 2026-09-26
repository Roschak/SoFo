import { describe, expect, it } from 'vitest';
import {
  RECURRENCE_OPTIONS,
  countRecurrenceOccurrences,
  validateRecurrenceInput,
} from './calendar-view';

describe('recurrence helpers (PRD §86 lanjutan)', () => {
  it('opsi recurrence terbatas & sinkron dengan API', () => {
    expect(RECURRENCE_OPTIONS).toEqual(['NONE', 'DAILY', 'WEEKLY']);
  });

  it('validateRecurrenceInput: NONE tanpa batas akhir sah', () => {
    expect(validateRecurrenceInput('NONE', '', '')).toBeNull();
  });

  it('validateRecurrenceInput: berulang wajib punya batas akhir', () => {
    expect(validateRecurrenceInput('DAILY', '', '2026-10-01T09:00')).not.toBeNull();
    expect(validateRecurrenceInput('WEEKLY', '', '2026-10-01T09:00')).not.toBeNull();
  });

  it('validateRecurrenceInput: batas akhir sebelum mulai ditolak', () => {
    const message = validateRecurrenceInput(
      'DAILY',
      '2026-09-30T09:00',
      '2026-10-01T09:00',
    );
    expect(message).toBe('Akhir berulang tidak boleh sebelum mulai.');
  });

  it('validateRecurrenceInput: batas akhir >= mulai sah', () => {
    expect(
      validateRecurrenceInput('DAILY', '2026-10-05T09:00', '2026-10-01T09:00'),
    ).toBeNull();
  });

  it('countRecurrenceOccurrences: harian & mingguan', () => {
    const start = '2026-10-01T09:00';
    expect(countRecurrenceOccurrences('DAILY', start, '2026-10-04T09:00')).toBe(4);
    expect(countRecurrenceOccurrences('WEEKLY', start, '2026-10-22T09:00')).toBe(4);
  });

  it('countRecurrenceOccurrences: input belum lengkap → null', () => {
    expect(countRecurrenceOccurrences('NONE', '', '')).toBeNull();
    expect(countRecurrenceOccurrences('DAILY', '', '2026-10-04T09:00')).toBeNull();
    expect(countRecurrenceOccurrences('DAILY', '2026-10-04T09:00', '')).toBeNull();
  });
});
