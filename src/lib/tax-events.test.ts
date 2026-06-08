import { describe, it, expect } from 'vitest';
import { detectTaxEvents } from './tax-events';
import type { Asset, Transaction } from '../types';

const assets: Asset[] = [
  { id: 'btc', ticker: 'BTC', name: 'Bitcoin', class: 'Cripto', currency: 'USD', current_price: 70000 },
  { id: 'msft', ticker: 'MSFT', name: 'Microsoft', class: 'Acción', currency: 'USD', current_price: 430 },
];

const tx = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-01-01',
  asset_id: 'btc',
  type: 'Compra',
  quantity: 0,
  price_per_unit: 0,
  operation_currency: 'USD',
  fx_rate: 18,
  commission: 0,
  withholding: 0,
  ...over,
});

describe('detectTaxEvents', () => {
  it('detecta venta, interés, dividendo y staking; ignora compra/ajuste', () => {
    const txns = [
      tx({ type: 'Compra', date: '2026-01-10' }),
      tx({ type: 'Venta', asset_id: 'msft', date: '2026-02-01', quantity: 5, price_per_unit: 450 }),
      tx({ type: 'Dividendo', asset_id: 'msft', date: '2026-03-01', price_per_unit: 8, withholding: 1 }),
      tx({ type: 'Interés', date: '2026-03-15', price_per_unit: 100 }),
      tx({ type: 'Staking', date: '2026-04-01', quantity: 0.01 }),
      tx({ type: 'Ajuste', date: '2026-04-10', quantity: 1 }),
    ];
    const ev = detectTaxEvents(txns, assets, { USD: 18, MXN: 1 });
    expect(ev.map((e) => e.type)).toEqual(['staking', 'interest', 'dividend', 'realized_gain']); // orden por fecha desc
  });

  it('describe el monto sin calcular impuestos (staking valuado a precio actual)', () => {
    const ev = detectTaxEvents([tx({ type: 'Staking', date: '2026-04-01', quantity: 0.01 })], assets, { USD: 18 });
    expect(ev[0]).toMatchObject({ type: 'staking', ticker: 'BTC' });
    expect(ev[0].amountBase).toBeCloseTo(0.01 * 70000 * 18); // 12600
  });

  it('lista vacía si no hay eventos gravables', () => {
    const ev = detectTaxEvents([tx({ type: 'Compra' }), tx({ type: 'Ajuste' })], assets, { USD: 18 });
    expect(ev).toHaveLength(0);
  });
});
