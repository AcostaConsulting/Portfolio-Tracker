import { describe, it, expect } from 'vitest';
import { shouldWarnAnomaly } from './license-guard';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-05-31T12:00:00Z');

describe('shouldWarnAnomaly', () => {
  it('no avisa si no hay licencia (sin machine_id guardado)', () => {
    expect(
      shouldWarnAnomaly({ storedMachineId: null, currentMachineId: 'A', activatedAt: '2026-05-30', now: NOW }),
    ).toBe(false);
  });

  it('no avisa si el equipo es el mismo', () => {
    expect(
      shouldWarnAnomaly({ storedMachineId: 'A', currentMachineId: 'A', activatedAt: '2026-05-30', now: NOW }),
    ).toBe(false);
  });

  it('avisa si el equipo difiere y la activación fue hace < 7 días', () => {
    expect(
      shouldWarnAnomaly({ storedMachineId: 'A', currentMachineId: 'B', activatedAt: '2026-05-28', now: NOW }),
    ).toBe(true);
  });

  it('NO avisa si difiere pero ya pasaron 7+ días', () => {
    const old = new Date(NOW - 8 * DAY).toISOString();
    expect(
      shouldWarnAnomaly({ storedMachineId: 'A', currentMachineId: 'B', activatedAt: old, now: NOW }),
    ).toBe(false);
  });

  it('no avisa si la fecha de activación es inválida', () => {
    expect(
      shouldWarnAnomaly({ storedMachineId: 'A', currentMachineId: 'B', activatedAt: 'no-fecha', now: NOW }),
    ).toBe(false);
  });

  it('no avisa si activated_at está en el futuro (reloj raro)', () => {
    const future = new Date(NOW + 2 * DAY).toISOString();
    expect(
      shouldWarnAnomaly({ storedMachineId: 'A', currentMachineId: 'B', activatedAt: future, now: NOW }),
    ).toBe(false);
  });
});
