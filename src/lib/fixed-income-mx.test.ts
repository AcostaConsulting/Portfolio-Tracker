import { describe, it, expect } from 'vitest';
import {
  computeTermDeposit,
  computeSavings,
  ISR_WITHHOLDING_RATE,
} from './fixed-income-engine';
import { addDays } from './dates';

describe('computeTermDeposit (pagaré / SoFIPO)', () => {
  const base = {
    capital_invested: 100_000,
    annual_rate: 12, // %
    term_days: 360,
    purchase_date: '2026-01-01',
  };

  it('interés bruto total al vencimiento = capital * tasa * plazo/360', () => {
    const r = computeTermDeposit(base, base.purchase_date);
    expect(r.totalInterest).toBeCloseTo(12_000, 6); // 100000 * 0.12 * 360/360
    expect(r.valueAtMaturity).toBeCloseTo(112_000, 6);
  });

  it('al inicio no hay interés devengado ni retención', () => {
    const r = computeTermDeposit(base, base.purchase_date);
    expect(r.daysElapsed).toBe(0);
    expect(r.accruedInterestGross).toBe(0);
    expect(r.withholding).toBe(0);
    expect(r.currentValue).toBe(100_000);
    expect(r.status).toBe('Vigente');
  });

  it('a mitad del plazo: devengado por días + retención ISR (fórmula SAT sobre el capital)', () => {
    const today = addDays(base.purchase_date, 180); // mitad del plazo
    const r = computeTermDeposit(base, today);
    expect(r.daysElapsed).toBe(180);
    expect(r.accruedInterestGross).toBeCloseTo(6_000, 6); // 12000 * 180/360
    // SAT: capital × tasa anual × días/365
    const expectedWithholding = 100_000 * ISR_WITHHOLDING_RATE * (180 / 365);
    expect(r.withholding).toBeCloseTo(expectedWithholding, 6);
    expect(r.accruedInterestNet).toBeCloseTo(6_000 - expectedWithholding, 6);
    expect(r.currentValue).toBeCloseTo(100_000 + r.accruedInterestNet, 6);
  });

  it('el devengado se topa al plazo y queda Vencido tras el vencimiento', () => {
    const today = addDays(base.purchase_date, 400); // pasado el vencimiento
    const r = computeTermDeposit(base, today);
    expect(r.daysElapsed).toBe(360); // topado al plazo
    expect(r.accruedInterestGross).toBeCloseTo(12_000, 6);
    expect(r.daysRemaining).toBe(0);
    expect(r.status).toBe('Vencido');
  });

  it('usa el vencimiento explícito si se da', () => {
    const r = computeTermDeposit({ ...base, maturity_date: '2026-12-31' }, base.purchase_date);
    expect(r.maturityDate).toBe('2026-12-31');
  });
});

describe('computeSavings (Nu / Ahorros)', () => {
  it('proyecta interés diario / mensual / anual a partir del saldo y la tasa', () => {
    const r = computeSavings({ balance: 50_000, annual_rate: 4.8 }, '2026-05-31');
    expect(r.annualInterest).toBeCloseTo(2_400, 6); // 50000 * 0.048
    expect(r.monthlyInterest).toBeCloseTo(200, 6); // 2400 / 12
    expect(r.dailyInterest).toBeCloseTo(2_400 / 360, 6);
    expect(r.accruedInterest).toBe(0); // sin since_date
  });

  it('si se da una fecha, devenga interés por los días transcurridos', () => {
    const since = '2026-01-01';
    const today = addDays(since, 90);
    const r = computeSavings({ balance: 50_000, annual_rate: 4.8, since_date: since }, today);
    expect(r.daysElapsed).toBe(90);
    expect(r.accruedInterest).toBeCloseTo((2_400 / 360) * 90, 6); // 600
  });
});
