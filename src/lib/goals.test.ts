import { describe, it, expect } from 'vitest';
import { computeGoalProgress } from './goals';
import type { Goal } from '../types';

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g',
  name: 'Fondo de emergencia',
  target_amount: 100000,
  target_date: '2026-12-31',
  created_at: '2026-01-01',
  ...over,
});

describe('computeGoalProgress', () => {
  it('avance = valor actual / objetivo', () => {
    const p = computeGoalProgress(goal(), 25000, '2026-05-31');
    expect(p.pct).toBeCloseTo(25);
    expect(p.remaining).toBeCloseTo(75000);
    expect(p.daysLeft!).toBeGreaterThan(0);
  });

  it('acota el avance a 100% pero conserva rawPct', () => {
    const p = computeGoalProgress(goal(), 120000, '2026-05-31');
    expect(p.pct).toBe(100);
    expect(p.rawPct).toBeCloseTo(120);
    expect(p.remaining).toBe(0);
  });

  it('onTrack compara avance vs tiempo transcurrido', () => {
    const p = computeGoalProgress(goal(), 60000, '2026-07-01'); // ~50% del tiempo, 60% de avance
    expect(p.timePct!).toBeGreaterThan(0);
    expect(p.onTrack).toBe(true);
  });

  it('sin fecha objetivo: daysLeft/timePct/onTrack null', () => {
    const p = computeGoalProgress(goal({ target_date: undefined }), 50000, '2026-05-31');
    expect(p.daysLeft).toBeNull();
    expect(p.timePct).toBeNull();
    expect(p.onTrack).toBeNull();
  });
});
