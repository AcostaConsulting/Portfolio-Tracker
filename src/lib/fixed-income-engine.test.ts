import { describe, it, expect } from 'vitest';
import {
  computeDiscount,
  computeFixedRateCoupon,
  computeInflationLinked,
  computeMaturityAlerts,
  computeMoneyMarket,
  couponSchedule,
} from './fixed-income-engine';
import type { Asset, FixedIncomePosition } from '../types';

describe('8.1 a descuento (CETES)', () => {
  const base = {
    capital_invested: 10000,
    annual_rate: 11,
    term_days: 28,
    purchase_date: '2026-01-01',
  };

  it('valor al vencimiento, interés total y vencimiento auto', () => {
    const r = computeDiscount(base, '2026-01-15');
    expect(r.valueAtMaturity).toBeCloseTo(10085.5556, 4);
    expect(r.totalInterest).toBeCloseTo(85.5556, 4);
    expect(r.maturityDate).toBe('2026-01-29');
  });

  it('interés devengado a mitad del plazo', () => {
    const r = computeDiscount(base, '2026-01-15');
    expect(r.daysElapsed).toBe(14);
    expect(r.accruedInterest).toBeCloseTo(42.7778, 4);
    expect(r.currentValue).toBeCloseTo(10042.7778, 4);
    expect(r.daysRemaining).toBe(14);
    expect(r.status).toBe('Vigente');
  });

  it('al vencer: interés completo y estado Vencido', () => {
    const r = computeDiscount(base, '2026-02-01');
    expect(r.daysElapsed).toBe(28);
    expect(r.accruedInterest).toBeCloseTo(85.5556, 4);
    expect(r.daysRemaining).toBe(0);
    expect(r.status).toBe('Vencido');
  });

  it('respeta una fecha de vencimiento explícita', () => {
    const r = computeDiscount({ ...base, maturity_date: '2026-02-15' }, '2026-01-15');
    expect(r.maturityDate).toBe('2026-02-15');
  });
});

describe('8.2 fondo de liquidez', () => {
  it('rendimiento = saldo reportado − aportaciones netas', () => {
    const r = computeMoneyMarket(10000, 10350);
    expect(r.netContributions).toBe(10000);
    expect(r.currentValue).toBe(10350);
    expect(r.accruedReturn).toBe(350);
  });
});

describe('calendario de cupones', () => {
  it('semestral incluye el vencimiento', () => {
    expect(couponSchedule('2025-06-30', '2027-06-30', 'semestral')).toEqual([
      '2025-06-30',
      '2025-12-30',
      '2026-06-30',
      '2026-12-30',
      '2027-06-30',
    ]);
  });
  it('trimestral respeta el fin de mes', () => {
    expect(couponSchedule('2026-01-31', '2026-12-31', 'trimestral')).toEqual([
      '2026-01-31',
      '2026-04-30',
      '2026-07-31',
      '2026-10-31',
    ]);
  });
});

describe('8.3 tasa fija con cupones (Bono M)', () => {
  const p = {
    face_value_total: 100000,
    coupon_rate: 8,
    coupon_frequency: 'semestral' as const,
    first_coupon_date: '2025-06-30',
    maturity_date: '2027-06-30',
  };

  it('cupón por pago, cobrados/pendientes e ingreso acumulado', () => {
    const r = computeFixedRateCoupon(p, '2026-05-28');
    expect(r.couponPerPayment).toBe(4000);
    expect(r.paidCoupons).toHaveLength(2);
    expect(r.pendingCoupons).toHaveLength(3);
    expect(r.accruedCouponIncome).toBe(8000);
    expect(r.nextCouponDate).toBe('2026-06-30');
    expect(r.currentValue).toBe(100000);
  });

  it('acepta precio de mercado manual', () => {
    expect(computeFixedRateCoupon(p, '2026-05-28', 98000).currentValue).toBe(98000);
  });
});

describe('8.4 indexado a inflación (UDIBONO)', () => {
  const p = {
    face_value_in_units: 10000,
    unit_value_at_purchase: 7.5,
    unit_value_current: 8.0,
    coupon_rate: 4,
    coupon_frequency: 'semestral' as const,
    first_coupon_date: '2025-06-30',
    maturity_date: '2027-06-30',
  };

  it('valor actual indexado y ajuste inflacionario', () => {
    const r = computeInflationLinked(p, '2026-05-28');
    expect(r.currentValueLocal).toBe(80000);
    expect(r.inflationAdjustment).toBe(5000);
  });

  it('cupón calculado sobre el valor indexado actual', () => {
    const r = computeInflationLinked(p, '2026-05-28');
    expect(r.couponPerPayment).toBe(1600);
    expect(r.accruedCouponIncome).toBe(3200);
    expect(r.nextCouponDate).toBe('2026-06-30');
  });
});

describe('v0.6.0 computeMaturityAlerts', () => {
  const today = '2026-06-02';
  function fiPos(id: string, asset_id: string, maturity_date?: string): FixedIncomePosition {
    return { id, asset_id, type: 'discount', currency: 'MXN', maturity_date };
  }
  function mkAsset(id: string, ticker: string): Asset {
    return { id, ticker, name: ticker, class: 'Renta Fija', currency: 'MXN', current_price: 0 };
  }
  const assets = [mkAsset('a-over', 'OVER'), mkAsset('a-urg', 'URG'), mkAsset('a-up', 'UP'), mkAsset('a-ok', 'OK')];
  const positions = [
    fiPos('p-over', 'a-over', '2026-05-31'), // hace 2 días → overdue
    fiPos('p-urg', 'a-urg', '2026-06-05'), //   en 3 días → urgent
    fiPos('p-up', 'a-up', '2026-06-17'), //     en 15 días → upcoming
    fiPos('p-ok', 'a-ok', '2026-08-01'), //     en 60 días → ok
    fiPos('p-none', 'a-ok'), //                 sin fecha → excluida
  ];

  it('clasifica por umbral, resuelve el nombre y excluye las posiciones sin fecha', () => {
    const alerts = computeMaturityAlerts(positions, assets, today);
    expect(alerts).toHaveLength(4);
    const byId = Object.fromEntries(alerts.map((a) => [a.positionId, a]));
    expect(byId['p-over'].status).toBe('overdue');
    expect(byId['p-over'].daysUntilMaturity).toBe(-2);
    expect(byId['p-urg'].status).toBe('urgent');
    expect(byId['p-up'].status).toBe('upcoming');
    expect(byId['p-ok'].status).toBe('ok');
    expect(byId['p-urg'].instrumentName).toBe('URG');
  });

  it('ordena por días hasta el vencimiento (más urgente primero)', () => {
    const alerts = computeMaturityAlerts(positions, assets, today);
    expect(alerts.map((a) => a.positionId)).toEqual(['p-over', 'p-urg', 'p-up', 'p-ok']);
  });
});
