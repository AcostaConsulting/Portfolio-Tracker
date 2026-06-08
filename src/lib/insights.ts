// BLOQUE D — Motores de "features de producto" (puros, sin React ni Dexie).
//  D.1 Alertas · D.2 Comisiones · D.3 Liquidez · D.6 Rebalanceo.
// Reciben las vistas que ya calcula el motor (selectors/portfolio-engine) y
// devuelven datos para mostrar. Nada de red ni de escritura.

import type { HistoricalSnapshot, Transaction } from '../types';
import type { AllocationClassKey, AllocationRow } from './portfolio-engine';
import type { FixedIncomeView } from './selectors';
import { diffDays } from './dates';

// --- D.1 — Alertas ----------------------------------------------------------

export type AlertSeverity = 'info' | 'warn';

export interface Alert {
  id: string;
  code: string; // i18n: alerts.<code>
  severity: AlertSeverity;
  params?: Record<string, string | number>;
}

export const DRIFT_THRESHOLD_PP = 10; // desviación de mezcla > 10 puntos
export const MATURITY_SOON_DAYS = 14; // RF que vence en <= 14 días
export const NO_REBALANCE_DAYS = 182; // ~6 meses sin snapshot nuevo

export interface AlertsInput {
  allocation: AllocationRow[];
  fixedIncome: FixedIncomeView[];
  snapshots: HistoricalSnapshot[];
  today: string;
}

export function computeAlerts(input: AlertsInput): Alert[] {
  const alerts: Alert[] = [];

  // 1) Desviación de la mezcla objetivo más allá del umbral.
  for (const r of input.allocation) {
    if (r.targetPct > 0 && Math.abs(r.diffPct) > DRIFT_THRESHOLD_PP) {
      alerts.push({
        id: `drift-${r.key}`,
        code: r.diffPct > 0 ? 'driftOver' : 'driftUnder',
        severity: 'warn',
        params: { class: r.key, diff: Math.abs(Math.round(r.diffPct)) },
      });
    }
  }

  // 2) Renta fija próxima a vencer.
  for (const v of input.fixedIncome) {
    if (v.maturityDate && v.status === 'Vigente') {
      const d = diffDays(input.today, v.maturityDate);
      if (d >= 0 && d <= MATURITY_SOON_DAYS) {
        alerts.push({
          id: `maturity-${v.asset.id}`,
          code: 'maturitySoon',
          severity: 'warn',
          params: { ticker: v.asset.ticker, days: d },
        });
      }
    }
  }

  // 3) Sin rebalanceo (snapshot) en ~6 meses.
  if (input.snapshots.length > 0) {
    const last = input.snapshots[input.snapshots.length - 1]; // ordenados por fecha asc
    const since = diffDays(last.date, input.today);
    if (since >= NO_REBALANCE_DAYS) {
      alerts.push({ id: 'no-rebalance', code: 'noRebalance', severity: 'info', params: { days: since } });
    }
  }

  return alerts;
}

// --- D.2 — Revisión de comisiones ------------------------------------------

export interface CommissionRow {
  platform: string;
  totalBase: number;
  txCount: number;
}

export interface CommissionsResult {
  rows: CommissionRow[];
  totalBase: number;
  impliedPct: number; // total comisiones / total invertido (en base) * 100
}

export function computeCommissions(
  txns: Transaction[],
  ratesToBase: Record<string, number>,
  totalInvestedBase: number,
): CommissionsResult {
  const map = new Map<string, { total: number; count: number }>();
  let totalBase = 0;
  for (const t of txns) {
    if (!(t.commission > 0)) continue;
    const fx = ratesToBase[t.operation_currency.toUpperCase()] ?? t.fx_rate ?? 1;
    const base = t.commission * fx;
    totalBase += base;
    const key = t.platform?.trim() || '—';
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += base;
    cur.count += 1;
    map.set(key, cur);
  }
  const rows = [...map.entries()]
    .map(([platform, v]) => ({ platform, totalBase: v.total, txCount: v.count }))
    .sort((a, b) => b.totalBase - a.totalBase);
  const impliedPct = totalInvestedBase > 0 ? (totalBase / totalInvestedBase) * 100 : 0;
  return { rows, totalBase, impliedPct };
}

// --- D.3 — Sugerencia de liquidez ------------------------------------------

export interface LiquiditySuggestion {
  ticker: string;
  days: number;
  valueBase: number;
}

export function computeLiquiditySuggestions(
  fixedIncome: FixedIncomeView[],
  today: string,
  withinDays = MATURITY_SOON_DAYS,
): LiquiditySuggestion[] {
  const out: LiquiditySuggestion[] = [];
  for (const v of fixedIncome) {
    if (v.maturityDate && v.status === 'Vigente') {
      const d = diffDays(today, v.maturityDate);
      if (d >= 0 && d <= withinDays) {
        out.push({ ticker: v.asset.ticker, days: d, valueBase: v.currentValueBase });
      }
    }
  }
  return out.sort((a, b) => a.days - b.days);
}

// --- D.6 — Detección de rebalanceo -----------------------------------------

export type RebalanceActionKind = 'buy' | 'sell' | 'hold';

export interface RebalanceAction {
  key: AllocationClassKey;
  action: RebalanceActionKind;
  amountBase: number; // cuánto comprar/vender para volver al objetivo
}

/** Banda muerta: ignora desajustes menores al 1% del total (ruido). */
const REBALANCE_DEADBAND = 0.01;

export function computeRebalance(allocation: AllocationRow[], totalValue: number): RebalanceAction[] {
  return allocation.map((r) => {
    const targetValue = totalValue * (r.targetPct / 100);
    const delta = targetValue - r.marketValue; // >0 comprar, <0 vender
    const action: RebalanceActionKind =
      Math.abs(delta) < totalValue * REBALANCE_DEADBAND ? 'hold' : delta > 0 ? 'buy' : 'sell';
    return { key: r.key, action, amountBase: Math.abs(delta) };
  });
}
