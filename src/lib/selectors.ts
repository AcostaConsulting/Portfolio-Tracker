// CAPA DE INTEGRACIÓN (pura).
// Combina el motor de portafolio (sección 6) con el de renta fija (sección 8)
// para producir las vistas que consume la UI: posiciones de mercado, vistas de
// renta fija, totales, asignación y desglose de P&L.
//
// Regla anti-doble-conteo: los activos clase 'Renta Fija' NO entran como
// posiciones de mercado; su valor viene del motor de renta fija. Sus cupones,
// registrados como transacciones 'Interés', se cuentan como ingreso realizado.

import type {
  AllocationTargets,
  Asset,
  FixedIncomePosition,
  FixedIncomeType,
  FxRate,
  Transaction,
} from '../types';
import {
  type AllocationClassKey,
  type AllocationRow,
  classKey,
  computeAllocation,
  computePosition,
  computeTotals,
  dividendsIncome,
  interestIncome,
  netAmountOp,
  type PortfolioTotals,
  type PositionSummary,
  positionToTotalsInput,
  toBase,
  type TotalsInput,
} from './portfolio-engine';
import {
  type CouponBondResult,
  computeDiscount,
  computeFixedRateCoupon,
  computeInflationLinked,
  computeMoneyMarket,
  computeSavings,
  computeTermDeposit,
  type DiscountResult,
  type FixedIncomeStatus,
  type InflationLinkedResult,
  type MoneyMarketResult,
  type SavingsResult,
  type TermDepositResult,
} from './fixed-income-engine';

/** Mapa { moneda -> rate_to_base } incluyendo la base mapeada a 1. */
export function buildRatesToBase(
  fxRates: FxRate[],
  baseCurrency: string,
): Record<string, number> {
  const map: Record<string, number> = { [baseCurrency]: 1 };
  for (const fx of fxRates) map[fx.currency] = fx.rate_to_base;
  return map;
}

/**
 * Aportaciones netas (depósitos − retiros) de un activo, en su moneda de
 * operación. Sirve al fondo de liquidez: Compra suma, Venta resta.
 */
export function netContributionsLocal(txns: Transaction[], assetId: string): number {
  return txns
    .filter((t) => t.asset_id === assetId)
    .reduce((acc, t) => {
      if (t.type === 'Compra') return acc + netAmountOp(t);
      if (t.type === 'Venta') return acc - netAmountOp(t);
      return acc;
    }, 0);
}

type FixedIncomeDetail =
  | { kind: 'discount'; result: DiscountResult }
  | { kind: 'money_market'; result: MoneyMarketResult }
  | { kind: 'fixed_rate_coupon'; result: CouponBondResult }
  | { kind: 'inflation_linked'; result: InflationLinkedResult }
  | { kind: 'promissory_note'; result: TermDepositResult }
  | { kind: 'sofipo'; result: TermDepositResult }
  | { kind: 'savings'; result: SavingsResult };

export interface FixedIncomeView {
  position: FixedIncomePosition;
  asset: Asset;
  type: FixedIncomeType;
  currency: string;
  fxRate: number; // moneda del instrumento -> base

  // En moneda del instrumento (para la tarjeta de detalle)
  investedLocal: number; // costo base (capital_invested o aportaciones netas)
  currentValueLocal: number; // valor actual estimado
  accruedLocal: number; // interés / rendimiento / cupones devengados (informativo)

  // En moneda base (lo que entra a los totales)
  investedBase: number;
  currentValueBase: number;
  unrealizedPnlBase: number;
  realizedIncomeBase: number; // cupones / intereses cobrados (transacciones)

  status?: FixedIncomeStatus;
  maturityDate?: string;
  nextCouponDate?: string;
  pendingCoupons?: string[];

  detail: FixedIncomeDetail;
}

interface FiCore {
  investedLocal: number;
  currentValueLocal: number;
  accruedLocal: number;
  status?: FixedIncomeStatus;
  maturityDate?: string;
  nextCouponDate?: string;
  pendingCoupons?: string[];
  detail: FixedIncomeDetail;
}

function computeCore(
  position: FixedIncomePosition,
  txns: Transaction[],
  assetId: string,
  today: string,
): FiCore {
  switch (position.type) {
    case 'discount': {
      const result = computeDiscount(
        {
          capital_invested: position.capital_invested ?? 0,
          annual_rate: position.annual_rate ?? 0,
          term_days: position.term_days ?? 0,
          purchase_date: position.purchase_date ?? today,
          maturity_date: position.maturity_date,
        },
        today,
      );
      return {
        investedLocal: position.capital_invested ?? 0,
        currentValueLocal: result.currentValue,
        accruedLocal: result.accruedInterest,
        status: result.status,
        maturityDate: result.maturityDate,
        detail: { kind: 'discount', result },
      };
    }
    case 'money_market': {
      const contributions = netContributionsLocal(txns, assetId);
      const result = computeMoneyMarket(
        contributions,
        position.reported_balance ?? contributions,
      );
      return {
        investedLocal: result.netContributions,
        currentValueLocal: result.currentValue,
        accruedLocal: result.accruedReturn,
        detail: { kind: 'money_market', result },
      };
    }
    case 'fixed_rate_coupon': {
      const result = computeFixedRateCoupon(
        {
          face_value_total: position.face_value_total ?? 0,
          coupon_rate: position.coupon_rate ?? 0,
          coupon_frequency: position.coupon_frequency ?? 'semestral',
          first_coupon_date: position.first_coupon_date ?? today,
          maturity_date: position.maturity_date ?? today,
        },
        today,
      );
      return {
        investedLocal: position.capital_invested ?? position.face_value_total ?? 0,
        currentValueLocal: result.currentValue,
        accruedLocal: result.accruedCouponIncome,
        maturityDate: position.maturity_date,
        nextCouponDate: result.nextCouponDate,
        pendingCoupons: result.pendingCoupons,
        detail: { kind: 'fixed_rate_coupon', result },
      };
    }
    case 'inflation_linked': {
      const result = computeInflationLinked(
        {
          face_value_in_units: position.face_value_in_units ?? 0,
          unit_value_at_purchase: position.unit_value_at_purchase ?? 0,
          unit_value_current: position.unit_value_current ?? 0,
          coupon_rate: position.coupon_rate ?? 0,
          coupon_frequency: position.coupon_frequency ?? 'semestral',
          first_coupon_date: position.first_coupon_date ?? today,
          maturity_date: position.maturity_date ?? today,
        },
        today,
      );
      return {
        investedLocal: position.capital_invested ?? 0,
        currentValueLocal: result.currentValueLocal,
        accruedLocal: result.accruedCouponIncome,
        maturityDate: position.maturity_date,
        nextCouponDate: result.nextCouponDate,
        pendingCoupons: result.pendingCoupons,
        detail: { kind: 'inflation_linked', result },
      };
    }
    // C.1 — Pagaré y SoFIPO: mismo cálculo (depósito a plazo con retención ISR).
    case 'promissory_note':
    case 'sofipo': {
      const result = computeTermDeposit(
        {
          capital_invested: position.capital_invested ?? 0,
          annual_rate: position.annual_rate ?? 0,
          term_days: position.term_days ?? 0,
          purchase_date: position.purchase_date ?? today,
          maturity_date: position.maturity_date,
        },
        today,
      );
      return {
        investedLocal: position.capital_invested ?? 0,
        currentValueLocal: result.currentValue, // capital + interés NETO devengado
        accruedLocal: result.accruedInterestNet,
        status: result.status,
        maturityDate: result.maturityDate,
        detail: { kind: position.type, result } as FixedIncomeDetail,
      };
    }
    // C.1 — Nu / Ahorros: el saldo es el valor (sin base de costo separada → P&L 0);
    // el interés devengado se muestra como información.
    case 'savings': {
      const balance = position.reported_balance ?? 0;
      const result = computeSavings(
        {
          balance,
          annual_rate: position.annual_rate ?? 0,
          since_date: position.purchase_date,
        },
        today,
      );
      return {
        investedLocal: balance,
        currentValueLocal: balance,
        accruedLocal: result.accruedInterest || result.monthlyInterest,
        detail: { kind: 'savings', result },
      };
    }
  }
}

export function computeFixedIncomeView(
  position: FixedIncomePosition,
  asset: Asset,
  txns: Transaction[],
  ratesToBase: Record<string, number>,
  today: string,
): FixedIncomeView {
  const fxRate = ratesToBase[position.currency] ?? 1;
  const assetTxns = txns.filter((t) => t.asset_id === asset.id);
  const core = computeCore(position, txns, asset.id, today);

  const investedBase = toBase(core.investedLocal, fxRate);
  const currentValueBase = toBase(core.currentValueLocal, fxRate);
  const realizedIncomeBase = dividendsIncome(assetTxns) + interestIncome(assetTxns);

  return {
    position,
    asset,
    type: position.type,
    currency: position.currency,
    fxRate,
    investedLocal: core.investedLocal,
    currentValueLocal: core.currentValueLocal,
    accruedLocal: core.accruedLocal,
    investedBase,
    currentValueBase,
    unrealizedPnlBase: currentValueBase - investedBase,
    realizedIncomeBase,
    status: core.status,
    maturityDate: core.maturityDate,
    nextCouponDate: core.nextCouponDate,
    pendingCoupons: core.pendingCoupons,
    detail: core.detail,
  };
}

export interface PnlBreakdown {
  unrealized: number;
  realizedSales: number;
  dividends: number;
  interest: number;
  stakingValue: number; // valor actual de unidades por staking (incluido en no realizada)
}

export interface PortfolioView {
  marketPositions: PositionSummary[];
  fixedIncome: FixedIncomeView[];
  totals: PortfolioTotals;
  allocation: AllocationRow[];
  pnlBreakdown: PnlBreakdown;
  ratesToBase: Record<string, number>;
}

export function computePortfolioView(
  assets: Asset[],
  txns: Transaction[],
  fiPositions: FixedIncomePosition[],
  fxRates: FxRate[],
  baseCurrency: string,
  targets: AllocationTargets,
  today: string,
): PortfolioView {
  const ratesToBase = buildRatesToBase(fxRates, baseCurrency);
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const marketPositions = assets
    .filter((a) => a.class !== 'Renta Fija')
    .map((a) => computePosition(a, txns, ratesToBase));

  const fixedIncome: FixedIncomeView[] = [];
  for (const pos of fiPositions) {
    const asset = assetById.get(pos.asset_id);
    if (!asset) continue;
    fixedIncome.push(computeFixedIncomeView(pos, asset, txns, ratesToBase, today));
  }

  const totalsInputs: TotalsInput[] = [
    ...marketPositions.map(positionToTotalsInput),
    ...fixedIncome.map((v) => ({
      invested: v.investedBase,
      marketValue: v.currentValueBase,
      unrealizedPnl: v.unrealizedPnlBase,
      realizedPnl: v.realizedIncomeBase,
    })),
  ];
  const totals = computeTotals(totalsInputs);

  const mvByClass: Record<AllocationClassKey, number> = {
    cripto: 0,
    accion: 0,
    renta_fija: 0,
  };
  for (const p of marketPositions) mvByClass[classKey(p.asset.class)] += p.marketValue;
  for (const v of fixedIncome) mvByClass.renta_fija += v.currentValueBase;
  const allocation = computeAllocation(mvByClass, targets);

  const pnlBreakdown: PnlBreakdown = {
    unrealized:
      marketPositions.reduce((a, p) => a + p.unrealizedPnl, 0) +
      fixedIncome.reduce((a, v) => a + v.unrealizedPnlBase, 0),
    realizedSales: marketPositions.reduce((a, p) => a + p.realizedSalesPnl, 0),
    dividends: dividendsIncome(txns),
    interest: interestIncome(txns),
    stakingValue: marketPositions.reduce((a, p) => a + p.stakingValue, 0),
  };

  return { marketPositions, fixedIncome, totals, allocation, pnlBreakdown, ratesToBase };
}
