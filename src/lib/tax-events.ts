// E.1 — Detección de eventos fiscales (PURO). Regla de oro: la app DESCRIBE el
// evento (tipo, monto, fecha, activo) y dirige al humano. NUNCA clasifica
// fiscalmente, NO calcula ISR, NO recomienda. Cada evento se etiqueta como
// "Revisar con asesor" en la UI.

import type { Asset, Transaction } from '../types';
import { netAmountBase } from './portfolio-engine';

export type TaxEventType =
  | 'realized_gain'
  | 'interest'
  | 'dividend'
  | 'staking'
  | 'airdrop' //  v0.6.0 — tokens recibidos por airdrop (posible ingreso gravable al recibir)
  | 'reward'; //  v0.6.0 — recompensas cripto (posible ingreso gravable al recibir)

export interface TaxEvent {
  id: string;
  type: TaxEventType;
  date: string; //        ISO
  ticker: string;
  amountBase: number; //  monto del evento en moneda base (DESCRIPTIVO, no es la base gravable)
}

/**
 * Lista eventos potencialmente relevantes a partir de las transacciones:
 *  - Venta → ganancia/ingreso realizado (monto neto de la operación)
 *  - Interés → intereses cobrados
 *  - Dividendo → dividendos cobrados
 *  - Staking → unidades recibidas (valor estimado a precio actual)
 * Las compras y ajustes no generan evento. Ordenados por fecha (más reciente primero).
 */
export function detectTaxEvents(
  txns: Transaction[],
  assets: Asset[],
  ratesToBase: Record<string, number>,
): TaxEvent[] {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const events: TaxEvent[] = [];

  for (const t of txns) {
    const asset = byId.get(t.asset_id);
    const ticker = asset?.ticker ?? '—';
    switch (t.type) {
      case 'Venta':
        events.push({ id: t.id, type: 'realized_gain', date: t.date, ticker, amountBase: netAmountBase(t) });
        break;
      case 'Interés':
        events.push({ id: t.id, type: 'interest', date: t.date, ticker, amountBase: netAmountBase(t) });
        break;
      case 'Dividendo':
        events.push({ id: t.id, type: 'dividend', date: t.date, ticker, amountBase: netAmountBase(t) });
        break;
      case 'Staking': {
        const fx = ratesToBase[t.operation_currency.toUpperCase()] ?? t.fx_rate ?? 1;
        const value = t.quantity * (asset?.current_price ?? 0) * fx;
        events.push({ id: t.id, type: 'staking', date: t.date, ticker, amountBase: value });
        break;
      }
      // v0.6.0 — Airdrops y recompensas cripto: posible ingreso gravable AL RECIBIR.
      // Valor estimado = cantidad × (precio capturado si lo hay, si no precio actual).
      case 'Airdrop':
      case 'Recompensa': {
        const fx = ratesToBase[t.operation_currency.toUpperCase()] ?? t.fx_rate ?? 1;
        const unit = t.price_per_unit > 0 ? t.price_per_unit : (asset?.current_price ?? 0);
        const value = t.quantity * unit * fx;
        events.push({
          id: t.id,
          type: t.type === 'Airdrop' ? 'airdrop' : 'reward',
          date: t.date,
          ticker,
          amountBase: value,
        });
        break;
      }
      default:
        break; // Compra, Ajuste → sin evento
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}
