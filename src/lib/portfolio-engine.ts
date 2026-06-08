// MOTOR DE CÁLCULO — sección 6 del brief.
// Funciones puras y testeables. No accede a la base de datos ni a la UI.
//
// Convención de monedas:
//  - Cada transacción trae su `fx_rate` (op_currency -> base) del día de la operación,
//    así que las conversiones históricas usan ese valor.
//  - Para precios actuales se usa `ratesToBase`: un mapa { moneda -> rate_to_base }
//    que DEBE incluir la moneda base mapeada a 1.

import type { Asset, Transaction, TransactionType } from '../types';

/** Suma segura (ignora NaN / no finitos). */
function sum(nums: number[]): number {
  return nums.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
}

// 6.1 — Conversión a moneda base.
export function toBase(amountOp: number, fxRate: number): number {
  return amountOp * fxRate;
}

/** Importe bruto de una operación en su moneda (cantidad × precio unitario). */
export function grossAmountOp(tx: Pick<Transaction, 'quantity' | 'price_per_unit'>): number {
  return tx.quantity * tx.price_per_unit;
}

/**
 * 6.8 — Importe NETO de una operación, en su moneda de operación.
 *  - Compra:    importe + comisión              (lo que saliste de bolsillo)
 *  - Venta:     importe − comisión − retención  (lo que recibiste)
 *  - Dividendo: importe − retención
 *  - Interés:   importe − retención
 *  - Staking:   0
 *  - Ajuste:    0
 */
export function netAmountOp(tx: Transaction): number {
  const importe = grossAmountOp(tx);
  switch (tx.type) {
    case 'Compra':
      return importe + tx.commission;
    case 'Venta':
      return importe - tx.commission - tx.withholding;
    case 'Dividendo':
    case 'Interés':
      // price_per_unit = monto del dividendo/interés; la cantidad puede ser 0.
      return tx.price_per_unit - tx.withholding;
    case 'Staking':
    case 'Ajuste':
    case 'Airdrop':
    case 'Recompensa':
      // v0.6.0 — adquisiciones sin flujo de efectivo (cripto recibida sin pago).
      return 0;
  }
}

/** Importe neto de una operación, convertido a moneda base. */
export function netAmountBase(tx: Transaction): number {
  return toBase(netAmountOp(tx), tx.fx_rate);
}

// Tipos que AUMENTAN la cantidad del activo (sin importar el costo).
const ACQUIRE_TYPES: TransactionType[] = ['Compra', 'Staking', 'Ajuste', 'Airdrop', 'Recompensa'];

// v0.6.0 — Tipos que APORTAN costo base: Compra siempre; Airdrop/Recompensa solo si
// el usuario capturó un precio (precio 0 → costo 0, baja el promedio ponderado).
// Staking/Ajuste nunca aportan costo (entran a costo 0).
const COST_TYPES: TransactionType[] = ['Compra', 'Airdrop', 'Recompensa'];

// 6.2 — Cantidad neta del activo.
export function netQuantity(txns: Transaction[]): number {
  return sum(
    txns.map((t) => {
      if (t.type === 'Venta') return -t.quantity;
      if (ACQUIRE_TYPES.includes(t.type)) return t.quantity;
      return 0; // Dividendo, Interés no afectan la cantidad
    }),
  );
}

// 6.3 — Costo total en base, cantidad adquirida y costo promedio ponderado.
export function averageCost(txns: Transaction[]): {
  totalCostBase: number;
  totalQtyAcquired: number;
  avgCost: number;
} {
  const acquisitions = txns.filter((t) => COST_TYPES.includes(t.type));
  const totalCostBase =
    sum(acquisitions.map((t) => toBase(grossAmountOp(t), t.fx_rate))) +
    sum(acquisitions.map((t) => toBase(t.commission, t.fx_rate)));
  const totalQtyAcquired = sum(
    txns.filter((t) => ACQUIRE_TYPES.includes(t.type)).map((t) => t.quantity),
  );
  const avgCost = totalQtyAcquired > 0 ? totalCostBase / totalQtyAcquired : 0;
  return { totalCostBase, totalQtyAcquired, avgCost };
}

// 6.4 — Precio actual del activo convertido a moneda base.
export function currentPriceInBase(asset: Asset, ratesToBase: Record<string, number>): number {
  const rate = ratesToBase[asset.currency] ?? 1;
  return asset.current_price * rate;
}

// 6.4 — Valor de mercado.
export function marketValue(qtyNet: number, priceInBase: number): number {
  return qtyNet * priceInBase;
}

// 6.5 — P&L no realizada.
export function unrealizedPnl(mktValue: number, avgCost: number, qtyNet: number): number {
  return mktValue - avgCost * qtyNet;
}

// 6.6 — P&L realizada por ventas (simplificado con costo promedio).
export function realizedSalesPnl(txns: Transaction[], avgCost: number): number {
  const sells = txns.filter((t) => t.type === 'Venta');
  const proceeds = sum(sells.map((t) => netAmountBase(t)));
  const qtySold = sum(sells.map((t) => t.quantity));
  return proceeds - avgCost * qtySold;
}

/** Ingreso neto por dividendos, en base. */
export function dividendsIncome(txns: Transaction[]): number {
  return sum(txns.filter((t) => t.type === 'Dividendo').map((t) => netAmountBase(t)));
}

/** Ingreso neto por intereses / cupones, en base. */
export function interestIncome(txns: Transaction[]): number {
  return sum(txns.filter((t) => t.type === 'Interés').map((t) => netAmountBase(t)));
}

/** Cantidad recibida por staking. */
export function stakingQuantity(txns: Transaction[]): number {
  return sum(txns.filter((t) => t.type === 'Staking').map((t) => t.quantity));
}

export interface PositionSummary {
  asset: Asset;
  qtyNet: number;
  totalCostBase: number;
  avgCost: number;
  priceInBase: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number; // fracción (0.1 = 10%)
  realizedSalesPnl: number;
  dividendsIncome: number;
  interestIncome: number;
  stakingQty: number;
  stakingValue: number; // valor actual de las unidades recibidas por staking
  realizedPnlTotal: number; // ventas + dividendos + intereses (6.6)
}

/** Agrega toda la posición de un activo a partir de sus transacciones. */
export function computePosition(
  asset: Asset,
  txns: Transaction[],
  ratesToBase: Record<string, number>,
): PositionSummary {
  const assetTxns = txns.filter((t) => t.asset_id === asset.id);
  const qtyNet = netQuantity(assetTxns);
  const { totalCostBase, avgCost } = averageCost(assetTxns);
  const priceInBase = currentPriceInBase(asset, ratesToBase);
  const mv = marketValue(qtyNet, priceInBase);
  const uPnl = unrealizedPnl(mv, avgCost, qtyNet);
  const costOfHeld = avgCost * qtyNet;
  const uPct = costOfHeld !== 0 ? uPnl / costOfHeld : 0;
  const rSales = realizedSalesPnl(assetTxns, avgCost);
  const divs = dividendsIncome(assetTxns);
  const interest = interestIncome(assetTxns);
  const stkQty = stakingQuantity(assetTxns);

  return {
    asset,
    qtyNet,
    totalCostBase,
    avgCost,
    priceInBase,
    marketValue: mv,
    unrealizedPnl: uPnl,
    unrealizedPct: uPct,
    realizedSalesPnl: rSales,
    dividendsIncome: divs,
    interestIncome: interest,
    stakingQty: stkQty,
    stakingValue: stkQty * priceInBase,
    realizedPnlTotal: rSales + divs + interest,
  };
}

export function computePositions(
  assets: Asset[],
  txns: Transaction[],
  ratesToBase: Record<string, number>,
): PositionSummary[] {
  return assets.map((a) => computePosition(a, txns, ratesToBase));
}

// ---------------------------------------------------------------------------
// Asset allocation (6.7)
// ---------------------------------------------------------------------------

export type AllocationClassKey = 'cripto' | 'accion' | 'renta_fija';

export function classKey(cls: Asset['class']): AllocationClassKey {
  switch (cls) {
    case 'Cripto':
      return 'cripto';
    case 'Acción':
      return 'accion';
    case 'Renta Fija':
      return 'renta_fija';
  }
}

export interface AllocationRow {
  key: AllocationClassKey;
  marketValue: number;
  weightPct: number; // 0..100
  targetPct: number; // 0..100
  diffPct: number; // weight − target
}

// 6.7 — Pesos actuales vs. objetivo por clase.
export function computeAllocation(
  marketValueByClass: Record<AllocationClassKey, number>,
  targets: Record<AllocationClassKey, number>,
): AllocationRow[] {
  const keys: AllocationClassKey[] = ['cripto', 'accion', 'renta_fija'];
  const total = sum(keys.map((k) => marketValueByClass[k]));
  return keys.map((key) => {
    const mv = marketValueByClass[key];
    const weightPct = total > 0 ? (mv / total) * 100 : 0;
    const targetPct = targets[key];
    return { key, marketValue: mv, weightPct, targetPct, diffPct: weightPct - targetPct };
  });
}

// ---------------------------------------------------------------------------
// Totales del portafolio (KPIs del dashboard, 5.2)
// ---------------------------------------------------------------------------

/** Forma mínima para totalizar: sirve tanto a posiciones de mercado como de renta fija. */
export interface TotalsInput {
  invested: number; // costo base de lo que se mantiene
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export interface PortfolioTotals {
  totalInvested: number;
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  returnPct: number; // 0..100
}

export function positionToTotalsInput(p: PositionSummary): TotalsInput {
  return {
    invested: p.avgCost * p.qtyNet,
    marketValue: p.marketValue,
    unrealizedPnl: p.unrealizedPnl,
    realizedPnl: p.realizedPnlTotal,
  };
}

export function computeTotals(rows: TotalsInput[]): PortfolioTotals {
  const totalInvested = sum(rows.map((r) => r.invested));
  const totalMarketValue = sum(rows.map((r) => r.marketValue));
  const totalUnrealizedPnl = sum(rows.map((r) => r.unrealizedPnl));
  const totalRealizedPnl = sum(rows.map((r) => r.realizedPnl));
  const totalPnl = totalUnrealizedPnl + totalRealizedPnl;
  const returnPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  return {
    totalInvested,
    totalMarketValue,
    totalUnrealizedPnl,
    totalRealizedPnl,
    totalPnl,
    returnPct,
  };
}
