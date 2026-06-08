import { describe, it, expect } from 'vitest';
import {
  computeAlerts,
  computeCommissions,
  computeLiquiditySuggestions,
  computeRebalance,
} from './insights';
import type { AllocationRow } from './portfolio-engine';
import type { FixedIncomeView } from './selectors';
import type { HistoricalSnapshot, Transaction } from '../types';

const alloc = (key: string, marketValue: number, weightPct: number, targetPct: number): AllocationRow =>
  ({ key, marketValue, weightPct, targetPct, diffPct: weightPct - targetPct } as unknown as AllocationRow);

const fiv = (id: string, ticker: string, maturityDate: string, status: string, currentValueBase: number): FixedIncomeView =>
  ({ asset: { id, ticker }, maturityDate, status, currentValueBase } as unknown as FixedIncomeView);

describe('computeAlerts', () => {
  it('alerta por desviación de mezcla > umbral (sobre y bajo)', () => {
    const a = computeAlerts({
      allocation: [alloc('cripto', 600, 60, 40), alloc('renta_fija', 400, 40, 60)],
      fixedIncome: [],
      snapshots: [],
      today: '2026-05-31',
    });
    expect(a.map((x) => x.code).sort()).toEqual(['driftOver', 'driftUnder']);
  });

  it('no alerta si la desviación está dentro del umbral', () => {
    const a = computeAlerts({ allocation: [alloc('cripto', 45, 45, 40)], fixedIncome: [], snapshots: [], today: '2026-05-31' });
    expect(a).toHaveLength(0);
  });

  it('alerta por RF próxima a vencer (con días restantes)', () => {
    const a = computeAlerts({ allocation: [], fixedIncome: [fiv('c', 'CETE', '2026-06-05', 'Vigente', 1000)], snapshots: [], today: '2026-05-31' });
    expect(a.find((x) => x.code === 'maturitySoon')?.params?.days).toBe(5);
  });

  it('alerta por sin rebalanceo en ~6 meses', () => {
    const snaps = [{ id: 's', date: '2025-10-01', total_invested: 0, total_market_value: 0, total_pnl: 0, return_pct: 0 }] as HistoricalSnapshot[];
    const a = computeAlerts({ allocation: [], fixedIncome: [], snapshots: snaps, today: '2026-05-31' });
    expect(a.find((x) => x.code === 'noRebalance')).toBeTruthy();
  });
});

describe('computeCommissions', () => {
  it('agrega comisiones por plataforma (en base) y calcula el % implícito', () => {
    const txns = [
      { id: '1', commission: 15, operation_currency: 'USD', fx_rate: 18, platform: 'Binance' },
      { id: '2', commission: 30, operation_currency: 'MXN', fx_rate: 1, platform: 'GBM' },
      { id: '3', commission: 5, operation_currency: 'USD', fx_rate: 18, platform: 'Binance' },
      { id: '4', commission: 0, operation_currency: 'MXN', fx_rate: 1, platform: 'GBM' },
    ] as Transaction[];
    const r = computeCommissions(txns, { USD: 18, MXN: 1 }, 10000);
    expect(r.totalBase).toBeCloseTo(390); // 360 (Binance) + 30 (GBM)
    expect(r.rows[0]).toMatchObject({ platform: 'Binance', totalBase: 360, txCount: 2 });
    expect(r.impliedPct).toBeCloseTo(3.9);
  });
});

describe('computeLiquiditySuggestions', () => {
  it('lista la RF que vence pronto, ordenada por días', () => {
    const fi = [
      fiv('a', 'CETE-A', '2026-06-10', 'Vigente', 1000),
      fiv('b', 'CETE-B', '2026-06-02', 'Vigente', 500),
      fiv('c', 'BONO', '2027-01-01', 'Vigente', 2000),
    ];
    const s = computeLiquiditySuggestions(fi, '2026-05-31');
    expect(s.map((x) => x.ticker)).toEqual(['CETE-B', 'CETE-A']);
  });
});

describe('computeRebalance', () => {
  it('sugiere comprar/vender por clase para volver al objetivo', () => {
    const allocation = [alloc('cripto', 600, 60, 40), alloc('renta_fija', 400, 40, 60)];
    const r = computeRebalance(allocation, 1000);
    const cripto = r.find((x) => x.key === 'cripto')!;
    const rf = r.find((x) => x.key === 'renta_fija')!;
    expect(cripto.action).toBe('sell');
    expect(cripto.amountBase).toBeCloseTo(200);
    expect(rf.action).toBe('buy');
    expect(rf.amountBase).toBeCloseTo(200);
  });

  it('hold si el desajuste está dentro de la banda muerta', () => {
    const r = computeRebalance([alloc('cripto', 405, 40.5, 40)], 1000); // delta 5 < 1% de 1000
    expect(r[0].action).toBe('hold');
  });
});
