import { describe, it, expect } from 'vitest';
import { addDays, addMonths, diffDays, parseISO, toISO } from './dates';

describe('dates', () => {
  it('round-trip ISO', () => {
    expect(toISO(parseISO('2026-05-28'))).toBe('2026-05-28');
  });

  it('diffDays cuenta días calendario con signo', () => {
    expect(diffDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(diffDays('2026-01-31', '2026-01-01')).toBe(-30);
    expect(diffDays('2026-05-28', '2026-05-28')).toBe(0);
  });

  it('addDays suma días cruzando meses', () => {
    expect(addDays('2026-01-28', 28)).toBe('2026-02-25');
    expect(addDays('2026-01-01', 28)).toBe('2026-01-29');
  });

  it('addMonths respeta el fin de mes', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28'); // 2026 no es bisiesto
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // 2024 es bisiesto
    expect(addMonths('2026-01-15', 6)).toBe('2026-07-15');
    expect(addMonths('2025-06-30', 6)).toBe('2025-12-30');
  });
});
