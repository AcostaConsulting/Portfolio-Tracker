import { describe, it, expect } from 'vitest';
import type { Asset, FixedIncomePosition, FxRate, Transaction } from '../types';
import {
  buildRatesToBase,
  computePortfolioView,
  netContributionsLocal,
} from './selectors';

function tx(o: Partial<Transaction> & Pick<Transaction, 'type' | 'asset_id'>): Transaction {
  return {
    id: o.id ?? `${o.asset_id}-${o.type}-${Math.random()}`,
    date: o.date ?? '2026-01-01',
    asset_id: o.asset_id,
    type: o.type,
    quantity: o.quantity ?? 0,
    price_per_unit: o.price_per_unit ?? 0,
    operation_currency: o.operation_currency ?? 'MXN',
    fx_rate: o.fx_rate ?? 1,
    commission: o.commission ?? 0,
    withholding: o.withholding ?? 0,
  };
}

function asset(o: Partial<Asset> & Pick<Asset, 'id' | 'class'>): Asset {
  return {
    id: o.id,
    ticker: o.ticker ?? o.id.toUpperCase(),
    name: o.name ?? o.id,
    class: o.class,
    currency: o.currency ?? 'MXN',
    current_price: o.current_price ?? 0,
    fixed_income_type: o.fixed_income_type,
  };
}

describe('buildRatesToBase', () => {
  it('incluye la base mapeada a 1', () => {
    const map = buildRatesToBase([{ currency: 'USD', rate_to_base: 18.5, updated_at: 'x' }], 'MXN');
    expect(map).toEqual({ MXN: 1, USD: 18.5 });
  });
});

describe('netContributionsLocal', () => {
  it('depósitos suman, retiros restan', () => {
    const txns = [
      tx({ asset_id: 'mm', type: 'Compra', quantity: 1, price_per_unit: 1000 }),
      tx({ asset_id: 'mm', type: 'Compra', quantity: 1, price_per_unit: 500, commission: 10 }),
      tx({ asset_id: 'mm', type: 'Venta', quantity: 1, price_per_unit: 200 }),
      tx({ asset_id: 'otro', type: 'Compra', quantity: 1, price_per_unit: 999 }),
    ];
    expect(netContributionsLocal(txns, 'mm')).toBe(1310); // 1000 + 510 − 200
  });
});

describe('computePortfolioView — integración', () => {
  const assets: Asset[] = [
    asset({ id: 'c', class: 'Cripto', currency: 'USD', current_price: 6 }),
    asset({ id: 'mm', class: 'Renta Fija', fixed_income_type: 'money_market', current_price: 0 }),
    asset({ id: 'bond', class: 'Renta Fija', fixed_income_type: 'fixed_rate_coupon', current_price: 0 }),
  ];
  const txns: Transaction[] = [
    tx({ asset_id: 'c', type: 'Compra', quantity: 10, price_per_unit: 5, operation_currency: 'USD', fx_rate: 20 }),
    tx({ asset_id: 'mm', type: 'Compra', quantity: 1, price_per_unit: 1000 }),
    tx({ asset_id: 'bond', type: 'Interés', quantity: 0, price_per_unit: 200 }),
  ];
  const fi: FixedIncomePosition[] = [
    { id: 'p-mm', asset_id: 'mm', type: 'money_market', currency: 'MXN', reported_balance: 1100 },
    {
      id: 'p-bond',
      asset_id: 'bond',
      type: 'fixed_rate_coupon',
      currency: 'MXN',
      capital_invested: 4800,
      face_value_total: 5000,
      coupon_rate: 8,
      coupon_frequency: 'semestral',
      first_coupon_date: '2025-01-15',
      maturity_date: '2027-01-15',
    },
  ];
  const fx: FxRate[] = [{ currency: 'USD', rate_to_base: 20, updated_at: 'x' }];

  const view = computePortfolioView(assets, txns, fi, fx, 'MXN', { cripto: 40, accion: 30, renta_fija: 30 }, '2026-05-28');

  it('renta fija no entra como posición de mercado (anti-doble-conteo)', () => {
    expect(view.marketPositions).toHaveLength(1);
    expect(view.marketPositions[0].asset.id).toBe('c');
  });

  it('totales agregan mercado + renta fija', () => {
    expect(view.totals.totalInvested).toBe(6800); // 1000 + 1000 + 4800
    expect(view.totals.totalMarketValue).toBe(7300); // 1200 + 1100 + 5000
    expect(view.totals.totalUnrealizedPnl).toBe(500);
    expect(view.totals.totalRealizedPnl).toBe(200); // cupón del bono, contado una vez
    expect(view.totals.totalPnl).toBe(700);
  });

  it('el desglose de P&L suma el total', () => {
    const b = view.pnlBreakdown;
    expect(b.unrealized + b.realizedSales + b.dividends + b.interest).toBe(view.totals.totalPnl);
    expect(b.interest).toBe(200);
  });

  it('fondo de liquidez: rendimiento = saldo − aportaciones', () => {
    const mm = view.fixedIncome.find((v) => v.asset.id === 'mm')!;
    expect(mm.investedBase).toBe(1000);
    expect(mm.currentValueBase).toBe(1100);
    expect(mm.accruedLocal).toBe(100);
  });

  it('asignación: renta fija domina por valor de mercado', () => {
    const byKey = Object.fromEntries(view.allocation.map((r) => [r.key, r]));
    expect(byKey.renta_fija.weightPct).toBeCloseTo(83.5616, 3);
    expect(byKey.cripto.weightPct).toBeCloseTo(16.4384, 3);
  });
});
