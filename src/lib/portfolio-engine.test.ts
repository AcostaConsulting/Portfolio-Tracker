import { describe, it, expect } from 'vitest';
import type { Asset, Transaction } from '../types';
import {
  averageCost,
  computeAllocation,
  computePosition,
  computeTotals,
  currentPriceInBase,
  dividendsIncome,
  interestIncome,
  marketValue,
  netAmountBase,
  netAmountOp,
  netQuantity,
  positionToTotalsInput,
  realizedSalesPnl,
  stakingQuantity,
  toBase,
  unrealizedPnl,
} from './portfolio-engine';

function makeTx(o: Partial<Transaction> & Pick<Transaction, 'type'>): Transaction {
  return {
    id: o.id ?? `${o.type}-${Math.random()}`,
    date: o.date ?? '2026-01-01',
    asset_id: o.asset_id ?? 'a',
    type: o.type,
    quantity: o.quantity ?? 0,
    price_per_unit: o.price_per_unit ?? 0,
    operation_currency: o.operation_currency ?? 'MXN',
    fx_rate: o.fx_rate ?? 1,
    commission: o.commission ?? 0,
    withholding: o.withholding ?? 0,
    platform: o.platform,
    notes: o.notes,
  };
}

function makeAsset(o: Partial<Asset> & Pick<Asset, 'id'>): Asset {
  return {
    id: o.id,
    ticker: o.ticker ?? o.id.toUpperCase(),
    name: o.name ?? o.id,
    class: o.class ?? 'Cripto',
    currency: o.currency ?? 'MXN',
    current_price: o.current_price ?? 0,
    fixed_income_type: o.fixed_income_type,
    notes: o.notes,
  };
}

describe('6.1 conversión a base', () => {
  it('toBase multiplica por el fx', () => {
    expect(toBase(100, 18)).toBe(1800);
    expect(toBase(100, 1)).toBe(100);
  });
  it('currentPriceInBase usa el fx del catálogo', () => {
    const usd = makeAsset({ id: 'x', currency: 'USD', current_price: 30000 });
    expect(currentPriceInBase(usd, { MXN: 1, USD: 20 })).toBe(600000);
  });
  it('moneda base se asume 1 si falta en el mapa', () => {
    const mxn = makeAsset({ id: 'y', currency: 'MXN', current_price: 100 });
    expect(currentPriceInBase(mxn, {})).toBe(100);
  });
});

describe('6.8 importe neto por tipo', () => {
  it('Compra = importe + comisión', () => {
    expect(
      netAmountOp(makeTx({ type: 'Compra', quantity: 10, price_per_unit: 100, commission: 5 })),
    ).toBe(1005);
  });
  it('Venta = importe − comisión − retención', () => {
    expect(
      netAmountOp(
        makeTx({ type: 'Venta', quantity: 10, price_per_unit: 100, commission: 5, withholding: 3 }),
      ),
    ).toBe(992);
  });
  it('Dividendo = monto (precio) − retención', () => {
    expect(
      netAmountOp(makeTx({ type: 'Dividendo', quantity: 0, price_per_unit: 200, withholding: 20 })),
    ).toBe(180);
  });
  it('Interés = monto (precio) − retención', () => {
    expect(netAmountOp(makeTx({ type: 'Interés', quantity: 0, price_per_unit: 150 }))).toBe(150);
  });
  it('Staking y Ajuste = 0', () => {
    expect(netAmountOp(makeTx({ type: 'Staking', quantity: 5, price_per_unit: 0 }))).toBe(0);
    expect(netAmountOp(makeTx({ type: 'Ajuste', quantity: 3 }))).toBe(0);
  });
  it('netAmountBase convierte con el fx de la operación', () => {
    expect(
      netAmountBase(
        makeTx({ type: 'Compra', quantity: 10, price_per_unit: 100, commission: 5, fx_rate: 2 }),
      ),
    ).toBe(2010);
  });
});

describe('posición de mercado (6.2–6.6)', () => {
  const asset = makeAsset({ id: 'a', class: 'Cripto', currency: 'MXN', current_price: 110 });
  const txns: Transaction[] = [
    makeTx({ type: 'Compra', quantity: 10, price_per_unit: 100, commission: 10 }),
    makeTx({ type: 'Compra', quantity: 10, price_per_unit: 120, commission: 20 }),
    makeTx({ type: 'Staking', quantity: 2, price_per_unit: 0 }),
    makeTx({ type: 'Venta', quantity: 5, price_per_unit: 130, commission: 5, withholding: 2 }),
    makeTx({ type: 'Dividendo', quantity: 0, price_per_unit: 50, withholding: 10 }),
    makeTx({ type: 'Interés', quantity: 0, price_per_unit: 30 }),
  ];
  const rates = { MXN: 1 };

  it('6.2 cantidad neta', () => {
    expect(netQuantity(txns)).toBe(17);
  });
  it('6.3 costo promedio ponderado', () => {
    const { totalCostBase, totalQtyAcquired, avgCost } = averageCost(txns);
    expect(totalCostBase).toBe(2230);
    expect(totalQtyAcquired).toBe(22);
    expect(avgCost).toBeCloseTo(101.3636, 4);
  });
  it('6.4 valor de mercado', () => {
    expect(marketValue(17, 110)).toBe(1870);
  });
  it('6.5 P&L no realizada', () => {
    const { avgCost } = averageCost(txns);
    expect(unrealizedPnl(1870, avgCost, 17)).toBeCloseTo(146.8182, 4);
  });
  it('6.6 P&L realizada por ventas + ingresos', () => {
    const { avgCost } = averageCost(txns);
    expect(realizedSalesPnl(txns, avgCost)).toBeCloseTo(136.1818, 4);
    expect(dividendsIncome(txns)).toBe(40);
    expect(interestIncome(txns)).toBe(30);
  });
  it('staking: cantidad y valor actual', () => {
    expect(stakingQuantity(txns)).toBe(2);
    expect(computePosition(asset, txns, rates).stakingValue).toBe(220);
  });
  it('computePosition agrega toda la posición', () => {
    const pos = computePosition(asset, txns, rates);
    expect(pos.qtyNet).toBe(17);
    expect(pos.marketValue).toBe(1870);
    expect(pos.realizedPnlTotal).toBeCloseTo(206.1818, 4);
  });
  it('computeTotals suma la posición', () => {
    const totals = computeTotals([positionToTotalsInput(computePosition(asset, txns, rates))]);
    expect(totals.totalMarketValue).toBe(1870);
    expect(totals.totalInvested).toBeCloseTo(1723.1818, 4);
    expect(totals.totalPnl).toBeCloseTo(353, 4);
    expect(totals.returnPct).toBeCloseTo(20.4854, 3);
  });
});

describe('costo promedio con multimoneda', () => {
  it('convierte cada compra con su propio fx', () => {
    const txns = [
      makeTx({
        type: 'Compra',
        quantity: 2,
        price_per_unit: 100,
        fx_rate: 18,
        commission: 10,
        operation_currency: 'USD',
      }),
      makeTx({
        type: 'Compra',
        quantity: 1,
        price_per_unit: 200,
        fx_rate: 20,
        operation_currency: 'USD',
      }),
    ];
    const { totalCostBase, totalQtyAcquired, avgCost } = averageCost(txns);
    expect(totalCostBase).toBe(7780);
    expect(totalQtyAcquired).toBe(3);
    expect(avgCost).toBeCloseTo(2593.3333, 4);
  });
});

describe('6.7 asset allocation', () => {
  it('pesos actuales vs. objetivo', () => {
    const rows = computeAllocation(
      { cripto: 4000, accion: 4000, renta_fija: 2000 },
      { cripto: 40, accion: 30, renta_fija: 30 },
    );
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.cripto.weightPct).toBeCloseTo(40, 6);
    expect(byKey.accion.weightPct).toBeCloseTo(40, 6);
    expect(byKey.renta_fija.weightPct).toBeCloseTo(20, 6);
    expect(byKey.accion.diffPct).toBeCloseTo(10, 6);
    expect(byKey.renta_fija.diffPct).toBeCloseTo(-10, 6);
  });
  it('total 0 => todos los pesos en 0', () => {
    const rows = computeAllocation(
      { cripto: 0, accion: 0, renta_fija: 0 },
      { cripto: 40, accion: 30, renta_fija: 30 },
    );
    expect(rows.every((r) => r.weightPct === 0)).toBe(true);
  });
});

describe('v0.6.0 airdrops y recompensas', () => {
  it('Airdrop con precio 0: sube la cantidad pero no el costo base', () => {
    const txns = [
      makeTx({ type: 'Compra', quantity: 1, price_per_unit: 100, fx_rate: 1 }),
      makeTx({ type: 'Airdrop', quantity: 10, price_per_unit: 0, fx_rate: 1 }),
    ];
    expect(netQuantity(txns)).toBe(11);
    const { totalCostBase, totalQtyAcquired, avgCost } = averageCost(txns);
    expect(totalCostBase).toBe(100); // el airdrop no agrega costo
    expect(totalQtyAcquired).toBe(11);
    expect(avgCost).toBeCloseTo(100 / 11, 8);
  });

  it('Recompensa con precio capturado: pondera el costo promedio', () => {
    const txns = [
      makeTx({ type: 'Compra', quantity: 1, price_per_unit: 100, fx_rate: 1 }),
      makeTx({ type: 'Recompensa', quantity: 1, price_per_unit: 2, fx_rate: 1 }),
    ];
    const { totalCostBase, avgCost } = averageCost(txns);
    expect(totalCostBase).toBe(102);
    expect(avgCost).toBe(51); // 102 / 2
  });

  it('Venta tras un airdrop: la P&L realizada usa el costo base correcto', () => {
    const asset = makeAsset({ id: 'a', class: 'Cripto', currency: 'MXN', current_price: 100 });
    const txns = [
      makeTx({ asset_id: 'a', type: 'Compra', quantity: 1, price_per_unit: 100, fx_rate: 1 }),
      makeTx({ asset_id: 'a', type: 'Airdrop', quantity: 1, price_per_unit: 0, fx_rate: 1 }),
      makeTx({ asset_id: 'a', type: 'Venta', quantity: 1, price_per_unit: 100, fx_rate: 1 }),
    ];
    const pos = computePosition(asset, txns, { MXN: 1 });
    expect(pos.avgCost).toBe(50); // 100 de costo / 2 adquiridos
    expect(pos.realizedSalesPnl).toBe(50); // 100 recibidos − 50 de costo
    expect(pos.qtyNet).toBe(1); // 1 + 1 − 1
  });

  it('netAmountOp de airdrop/recompensa es 0 (sin flujo de efectivo)', () => {
    expect(netAmountOp(makeTx({ type: 'Airdrop', quantity: 5, price_per_unit: 3 }))).toBe(0);
    expect(netAmountOp(makeTx({ type: 'Recompensa', quantity: 5, price_per_unit: 3 }))).toBe(0);
  });
});
