// Datos de ejemplo borrables (sección 9 del brief).
// Se siembran una sola vez en la primera apertura. Tras un "reset" NO se vuelven
// a sembrar: un flag en localStorage marca que la instalación ya se inicializó,
// de modo que el reset deja un portafolio vacío de verdad.

import { db, SETTINGS_ID } from './db';
import type {
  Asset,
  FixedIncomePosition,
  FxRate,
  Settings,
  Transaction,
} from '../types';

const INSTALL_FLAG = 'pt-installed';

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  base_currency: 'MXN',
  allocation_targets: { cripto: 40, accion: 30, renta_fija: 30 },
  live_prices_enabled: false,
  price_update_frequency: 'manual',
  language: 'es',
  theme: 'system',
  auto_check_updates: false,
  auto_download_updates: false,
};

const SEED_FX_RATES: FxRate[] = [
  { currency: 'USD', rate_to_base: 18.5, updated_at: '2026-05-28' },
];

const SEED_ASSETS: Asset[] = [
  { id: 'btc', ticker: 'BTC', name: 'Bitcoin', class: 'Cripto', currency: 'USD', current_price: 68000 },
  { id: 'eth', ticker: 'ETH', name: 'Ethereum', class: 'Cripto', currency: 'USD', current_price: 3500 },
  { id: 'msft', ticker: 'MSFT', name: 'Microsoft', class: 'Acción', currency: 'USD', current_price: 430 },
  { id: 'walmex', ticker: 'WALMEX', name: 'Walmart de México', class: 'Acción', currency: 'MXN', current_price: 62 },
  { id: 'cetes', ticker: 'CETES-28', name: 'CETES 28 días', class: 'Renta Fija', fixed_income_type: 'discount', currency: 'MXN', current_price: 0 },
  { id: 'bonddia', ticker: 'BONDDIA', name: 'Fondo de liquidez BONDDIA', class: 'Renta Fija', fixed_income_type: 'money_market', currency: 'MXN', current_price: 0 },
  { id: 'bonom', ticker: 'BONO-M-30', name: 'Bono M 2030', class: 'Renta Fija', fixed_income_type: 'fixed_rate_coupon', currency: 'MXN', current_price: 0 },
  { id: 'udibono', ticker: 'UDIBONO-28', name: 'UDIBONO 2028', class: 'Renta Fija', fixed_income_type: 'inflation_linked', currency: 'MXN', current_price: 0 },
];

const SEED_TRANSACTIONS: Transaction[] = [
  { id: 's-btc-1', date: '2026-01-15', asset_id: 'btc', type: 'Compra', quantity: 0.05, price_per_unit: 60000, operation_currency: 'USD', fx_rate: 18.0, commission: 15, withholding: 0, platform: 'Binance' },
  { id: 's-eth-1', date: '2026-02-10', asset_id: 'eth', type: 'Compra', quantity: 1.5, price_per_unit: 3000, operation_currency: 'USD', fx_rate: 18.2, commission: 10, withholding: 0, platform: 'Binance' },
  { id: 's-eth-2', date: '2026-04-01', asset_id: 'eth', type: 'Staking', quantity: 0.03, price_per_unit: 0, operation_currency: 'USD', fx_rate: 18.4, commission: 0, withholding: 0, notes: 'Recompensa de staking' },
  { id: 's-msft-1', date: '2026-01-20', asset_id: 'msft', type: 'Compra', quantity: 10, price_per_unit: 400, operation_currency: 'USD', fx_rate: 18.1, commission: 5, withholding: 0, platform: 'GBM' },
  { id: 's-msft-2', date: '2026-03-12', asset_id: 'msft', type: 'Dividendo', quantity: 0, price_per_unit: 8, operation_currency: 'USD', fx_rate: 18.3, commission: 0, withholding: 1.2 },
  { id: 's-wmx-1', date: '2026-02-05', asset_id: 'walmex', type: 'Compra', quantity: 200, price_per_unit: 58, operation_currency: 'MXN', fx_rate: 1, commission: 30, withholding: 0, platform: 'GBM' },
  { id: 's-wmx-2', date: '2026-05-02', asset_id: 'walmex', type: 'Venta', quantity: 50, price_per_unit: 64, operation_currency: 'MXN', fx_rate: 1, commission: 20, withholding: 5 },
  { id: 's-bonddia-1', date: '2026-03-01', asset_id: 'bonddia', type: 'Compra', quantity: 1, price_per_unit: 50000, operation_currency: 'MXN', fx_rate: 1, commission: 0, withholding: 0, notes: 'Aportación inicial' },
  { id: 's-bonom-1', date: '2026-01-15', asset_id: 'bonom', type: 'Interés', quantity: 0, price_per_unit: 4750, operation_currency: 'MXN', fx_rate: 1, commission: 0, withholding: 475, notes: 'Cupón semestral' },
];

const SEED_FIXED_INCOME: FixedIncomePosition[] = [
  {
    id: 'fi-cetes',
    asset_id: 'cetes',
    type: 'discount',
    currency: 'MXN',
    purchase_date: '2026-05-10',
    capital_invested: 50000,
    annual_rate: 10.5,
    term_days: 28,
    face_value_per_title: 10,
  },
  {
    id: 'fi-bonddia',
    asset_id: 'bonddia',
    type: 'money_market',
    currency: 'MXN',
    reported_balance: 51200,
  },
  {
    id: 'fi-bonom',
    asset_id: 'bonom',
    type: 'fixed_rate_coupon',
    currency: 'MXN',
    purchase_date: '2025-07-15',
    capital_invested: 98000,
    face_value_total: 100000,
    coupon_rate: 9.5,
    coupon_frequency: 'semestral',
    first_coupon_date: '2025-07-15',
    maturity_date: '2030-07-15',
  },
  {
    id: 'fi-udibono',
    asset_id: 'udibono',
    type: 'inflation_linked',
    currency: 'MXN',
    purchase_date: '2025-06-30',
    capital_invested: 80000,
    face_value_in_units: 10000,
    unit_value_at_purchase: 7.8,
    unit_value_current: 8.15,
    coupon_rate: 4,
    coupon_frequency: 'semestral',
    first_coupon_date: '2025-12-31',
    maturity_date: '2028-06-30',
  },
];

function installed(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(INSTALL_FLAG) === '1';
}

function markInstalled(): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(INSTALL_FLAG, '1');
}

/**
 * Siembra los datos de ejemplo solo en la primera apertura (base vacía y sin
 * marca de instalación). Idempotente: marca la instalación al terminar para que
 * un reset posterior no vuelva a sembrar.
 */
export async function seedIfEmpty(): Promise<void> {
  if (installed()) return;

  const [assetCount, settingsCount] = await Promise.all([
    db.assets.count(),
    db.settings.count(),
  ]);

  if (assetCount === 0 && settingsCount === 0) {
    await db.transaction(
      'rw',
      [db.settings, db.assets, db.transactions, db.fx_rates, db.fixed_income_positions],
      async () => {
        await db.settings.put(DEFAULT_SETTINGS);
        await db.assets.bulkPut(SEED_ASSETS);
        await db.transactions.bulkPut(SEED_TRANSACTIONS);
        await db.fx_rates.bulkPut(SEED_FX_RATES);
        await db.fixed_income_positions.bulkPut(SEED_FIXED_INCOME);
      },
    );
  }

  markInstalled();
}

/** Garantiza que exista la fila de configuración (singleton id = 1). */
export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
