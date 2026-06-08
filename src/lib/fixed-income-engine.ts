// MOTOR DE RENTA FIJA — sección 8 del brief.
// Funciones puras. Las tasas se reciben en PORCENTAJE (ej. 11 = 11%).
// Los montos están en la moneda del instrumento; la conversión a base se hace fuera.

import type { Asset, CouponFrequency, FixedIncomePosition } from '../types';
import { addDays, addMonths, diffDays } from './dates';

const PAYMENTS_PER_YEAR: Record<CouponFrequency, number> = {
  anual: 1,
  semestral: 2,
  trimestral: 4,
  mensual: 12,
};

const MONTHS_PER_PERIOD: Record<CouponFrequency, number> = {
  anual: 12,
  semestral: 6,
  trimestral: 3,
  mensual: 1,
};

export type FixedIncomeStatus = 'Vigente' | 'Vencido';

// ---------------------------------------------------------------------------
// 8.1 — A DESCUENTO (CETES, BPAGs, T-Bills)
// ---------------------------------------------------------------------------

export interface DiscountInput {
  capital_invested: number;
  annual_rate: number; // %
  term_days: number;
  purchase_date: string; // ISO
  maturity_date?: string; // ISO (default = compra + plazo)
}

export interface DiscountResult {
  valueAtMaturity: number;
  totalInterest: number;
  daysElapsed: number;
  accruedInterest: number;
  currentValue: number;
  daysRemaining: number;
  status: FixedIncomeStatus;
  maturityDate: string;
}

export function computeDiscount(p: DiscountInput, today: string): DiscountResult {
  const rate = p.annual_rate / 100;
  const valueAtMaturity = p.capital_invested * (1 + (rate * p.term_days) / 360);
  const totalInterest = valueAtMaturity - p.capital_invested;

  const maturityDate = p.maturity_date ?? addDays(p.purchase_date, p.term_days);
  const elapsedRaw = diffDays(p.purchase_date, today);
  const daysElapsed = Math.max(0, Math.min(elapsedRaw, p.term_days));
  const accruedInterest = p.term_days > 0 ? totalInterest * (daysElapsed / p.term_days) : 0;
  const currentValue = p.capital_invested + accruedInterest;
  const daysRemaining = Math.max(diffDays(today, maturityDate), 0);

  return {
    valueAtMaturity,
    totalInterest,
    daysElapsed,
    accruedInterest,
    currentValue,
    daysRemaining,
    status: daysRemaining > 0 ? 'Vigente' : 'Vencido',
    maturityDate,
  };
}

// ---------------------------------------------------------------------------
// 8.2 — FONDO DE LIQUIDEZ (BONDDIA, money market)
// Las aportaciones netas se calculan fuera (desde las transacciones); aquí solo
// se contrasta contra el saldo reportado por el usuario.
// ---------------------------------------------------------------------------

export interface MoneyMarketResult {
  netContributions: number;
  currentValue: number;
  accruedReturn: number;
}

export function computeMoneyMarket(
  netContributions: number,
  reportedBalance: number,
): MoneyMarketResult {
  return {
    netContributions,
    currentValue: reportedBalance,
    accruedReturn: reportedBalance - netContributions,
  };
}

// ---------------------------------------------------------------------------
// Calendario de cupones (compartido por 8.3 y 8.4)
// ---------------------------------------------------------------------------

/** Fechas de cupón desde el primer cupón hasta el vencimiento (inclusive). */
export function couponSchedule(
  firstCouponDate: string,
  maturityDate: string,
  freq: CouponFrequency,
): string[] {
  const step = MONTHS_PER_PERIOD[freq];
  const dates: string[] = [];
  for (let k = 0; k < 10_000; k++) {
    const d = addMonths(firstCouponDate, k * step);
    if (diffDays(d, maturityDate) < 0) break; // d ya pasó el vencimiento
    dates.push(d);
  }
  return dates;
}

function splitCoupons(schedule: string[], today: string) {
  const paid = schedule.filter((d) => diffDays(d, today) >= 0); // d <= hoy
  const pending = schedule.filter((d) => diffDays(d, today) < 0); // d > hoy
  return { paid, pending };
}

// ---------------------------------------------------------------------------
// 8.3 — TASA FIJA CON CUPONES (Bonos M, corporativos)
// ---------------------------------------------------------------------------

export interface CouponBondInput {
  face_value_total: number;
  coupon_rate: number; // % anual
  coupon_frequency: CouponFrequency;
  first_coupon_date: string; // ISO
  maturity_date: string; // ISO
}

export interface CouponBondResult {
  couponPerPayment: number;
  schedule: string[];
  paidCoupons: string[];
  pendingCoupons: string[];
  accruedCouponIncome: number;
  currentValue: number; // simplificado = valor nominal (o precio de mercado manual)
  nextCouponDate?: string;
}

export function computeFixedRateCoupon(
  p: CouponBondInput,
  today: string,
  marketPriceOverride?: number,
): CouponBondResult {
  const couponPerPayment =
    (p.face_value_total * (p.coupon_rate / 100)) / PAYMENTS_PER_YEAR[p.coupon_frequency];
  const schedule = couponSchedule(p.first_coupon_date, p.maturity_date, p.coupon_frequency);
  const { paid, pending } = splitCoupons(schedule, today);

  return {
    couponPerPayment,
    schedule,
    paidCoupons: paid,
    pendingCoupons: pending,
    accruedCouponIncome: paid.length * couponPerPayment,
    currentValue: marketPriceOverride ?? p.face_value_total,
    nextCouponDate: pending[0],
  };
}

// ---------------------------------------------------------------------------
// 8.4 — INDEXADO A INFLACIÓN (UDIBONOS, TIPS)
// ---------------------------------------------------------------------------

export interface InflationLinkedInput {
  face_value_in_units: number; // valor nominal en UDIs
  unit_value_at_purchase: number; // UDI compra
  unit_value_current: number; // UDI actual
  coupon_rate: number; // % real
  coupon_frequency: CouponFrequency;
  first_coupon_date: string; // ISO
  maturity_date: string; // ISO
}

export interface InflationLinkedResult {
  currentValueLocal: number;
  inflationAdjustment: number;
  couponPerPayment: number;
  schedule: string[];
  paidCoupons: string[];
  pendingCoupons: string[];
  accruedCouponIncome: number;
  nextCouponDate?: string;
}

export function computeInflationLinked(
  p: InflationLinkedInput,
  today: string,
): InflationLinkedResult {
  const currentValueLocal = p.face_value_in_units * p.unit_value_current;
  const inflationAdjustment =
    currentValueLocal - p.face_value_in_units * p.unit_value_at_purchase;
  const couponPerPayment =
    (p.face_value_in_units * p.unit_value_current * (p.coupon_rate / 100)) /
    PAYMENTS_PER_YEAR[p.coupon_frequency];
  const schedule = couponSchedule(p.first_coupon_date, p.maturity_date, p.coupon_frequency);
  const { paid, pending } = splitCoupons(schedule, today);

  return {
    currentValueLocal,
    inflationAdjustment,
    couponPerPayment,
    schedule,
    paidCoupons: paid,
    pendingCoupons: pending,
    accruedCouponIncome: paid.length * couponPerPayment,
    nextCouponDate: pending[0],
  };
}

// ---------------------------------------------------------------------------
// C.1 / C.3 — PAGARÉS BANCARIOS y SoFIPOs (depósito a plazo con retención ISR)
// ---------------------------------------------------------------------------
//
// Mismo cálculo para pagaré y SoFIPO; la única diferencia (aviso "sin protección
// IPAB") es de UI. Interés simple devengado por días transcurridos; se muestra el
// interés BRUTO y el NETO tras la retención de ISR.

// Base de días para el interés simple (consistente con CETES / a descuento).
const INTEREST_DAY_BASIS = 360;

// C.3 — Retención de ISR sobre la renta fija (pagarés/SoFIPOs), con la fórmula del
// SAT: retención = CAPITAL × tasa de retención ANUAL × (días transcurridos / 365).
// La tasa anual se aplica sobre el CAPITAL (no sobre el interés) y se prorratea por
// los días del ejercicio. La tasa la fija el SAT y cambia año con año.
// ESTIMACIÓN informativa, NO un cálculo fiscal (confírmalo con tu asesor).
// Tasa de retención ISR anual, Anexo 8 RMF — revisar cada año.
export const ISR_WITHHOLDING_RATE = 0.019;
// Días naturales del ejercicio que usa el SAT para prorratear la retención.
const ISR_DAY_BASIS = 365;

export interface TermDepositInput {
  capital_invested: number;
  annual_rate: number; // %
  term_days: number;
  purchase_date: string; // ISO
  maturity_date?: string; // ISO (default = compra + plazo)
}

export interface TermDepositResult {
  valueAtMaturity: number; //      capital + interés bruto al vencimiento
  totalInterest: number; //        interés BRUTO total al vencimiento
  daysElapsed: number;
  daysRemaining: number;
  accruedInterestGross: number; // interés bruto devengado a hoy
  withholding: number; //          retención ISR estimada sobre el interés devengado
  accruedInterestNet: number; //   neto = bruto − retención
  currentValue: number; //         capital + interés neto devengado
  status: FixedIncomeStatus;
  maturityDate: string;
}

export function computeTermDeposit(p: TermDepositInput, today: string): TermDepositResult {
  const rate = p.annual_rate / 100;
  const totalInterest = p.capital_invested * rate * (p.term_days / INTEREST_DAY_BASIS);
  const valueAtMaturity = p.capital_invested + totalInterest;

  const maturityDate = p.maturity_date ?? addDays(p.purchase_date, p.term_days);
  const elapsedRaw = diffDays(p.purchase_date, today);
  const daysElapsed = Math.max(0, Math.min(elapsedRaw, p.term_days));
  const accruedInterestGross = p.term_days > 0 ? totalInterest * (daysElapsed / p.term_days) : 0;
  // Fórmula SAT: la retención es sobre el CAPITAL prorrateado por días, no sobre el interés.
  const withholding = p.capital_invested * ISR_WITHHOLDING_RATE * (daysElapsed / ISR_DAY_BASIS);
  const accruedInterestNet = accruedInterestGross - withholding;
  const currentValue = p.capital_invested + accruedInterestNet;
  const daysRemaining = Math.max(diffDays(today, maturityDate), 0);

  return {
    valueAtMaturity,
    totalInterest,
    daysElapsed,
    daysRemaining,
    accruedInterestGross,
    withholding,
    accruedInterestNet,
    currentValue,
    status: daysRemaining > 0 ? 'Vigente' : 'Vencido',
    maturityDate,
  };
}

// ---------------------------------------------------------------------------
// C.1 — Nu / AHORROS (saldo con tasa anual; interés devengado proyectado)
// ---------------------------------------------------------------------------

export interface SavingsInput {
  balance: number;
  annual_rate: number; // %
  since_date?: string; // ISO opcional: fecha desde la que devengar
}

export interface SavingsResult {
  dailyInterest: number;
  monthlyInterest: number;
  annualInterest: number;
  daysElapsed: number; //      días desde since_date (0 si no se dio)
  accruedInterest: number; //  interés devengado en since_date→hoy (0 si no hay since_date)
}

export function computeSavings(p: SavingsInput, today: string): SavingsResult {
  const rate = p.annual_rate / 100;
  const annualInterest = p.balance * rate;
  const dailyInterest = annualInterest / INTEREST_DAY_BASIS;
  const monthlyInterest = annualInterest / 12;
  let daysElapsed = 0;
  let accruedInterest = 0;
  if (p.since_date) {
    daysElapsed = Math.max(0, diffDays(p.since_date, today));
    accruedInterest = dailyInterest * daysElapsed;
  }
  return { dailyInterest, monthlyInterest, annualInterest, daysElapsed, accruedInterest };
}

// ---------------------------------------------------------------------------
// v0.6.0 (T3) — Recordatorios de vencimiento de renta fija
// ---------------------------------------------------------------------------

export type MaturityStatus = 'overdue' | 'urgent' | 'upcoming' | 'ok';

export interface MaturityAlert {
  positionId: string;
  instrumentName: string;
  maturityDate: string; //       ISO
  daysUntilMaturity: number; //  negativo si ya venció
  status: MaturityStatus;
}

/**
 * Alertas de vencimiento de las posiciones que tienen `maturity_date`. Recibe
 * `assets` para resolver el nombre (ticker) del instrumento y `today` inyectado
 * para ser 100% testeable sin mocks de fecha. Umbrales:
 *   overdue  < 0 · urgent 0–7 · upcoming 8–30 · ok > 30
 * Ordenadas por días hasta el vencimiento (las más urgentes primero).
 */
export function computeMaturityAlerts(
  positions: FixedIncomePosition[],
  assets: Asset[],
  today: string,
): MaturityAlert[] {
  const byId = new Map(assets.map((a) => [a.id, a]));
  return positions
    .filter((p): p is FixedIncomePosition & { maturity_date: string } => !!p.maturity_date)
    .map((p) => {
      const days = diffDays(today, p.maturity_date);
      const status: MaturityStatus =
        days < 0 ? 'overdue' : days <= 7 ? 'urgent' : days <= 30 ? 'upcoming' : 'ok';
      const asset = byId.get(p.asset_id);
      return {
        positionId: p.id,
        instrumentName: asset?.ticker ?? asset?.name ?? p.id,
        maturityDate: p.maturity_date,
        daysUntilMaturity: days,
        status,
      };
    })
    .sort((a, b) => a.daysUntilMaturity - b.daysUntilMaturity);
}
