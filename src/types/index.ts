// Entidades del dominio. Coinciden con la sección 4 del brief.

import type { Tier } from '../config/tiers';

export type AssetClass = 'Cripto' | 'Acción' | 'Renta Fija';

// --- S10 — Clasificación opcional del activo --------------------------------
// Dos capas INDEPENDIENTES y opcionales: `sector` (lista fija, para comparar con
// el mercado; todos los planes) y `label_ids` (etiquetas libres del usuario;
// Premium+). Un activo puede tener ambas, una o ninguna. Ver lib/diversification.ts.

/** Sectores fijos para acciones (estilo GICS, en español). */
export type StockSector =
  | 'Tecnología'
  | 'Salud'
  | 'Financiero'
  | 'Consumo básico'
  | 'Consumo discrecional'
  | 'Energía'
  | 'Materiales'
  | 'Industrial'
  | 'Inmobiliario'
  | 'Servicios públicos'
  | 'Telecomunicaciones';

/** Sectores fijos para cripto. */
export type CryptoSector =
  | 'Capa 1 (L1)'
  | 'Capa 2 (L2)'
  | 'Stablecoin'
  | 'DeFi'
  | 'Exchange token'
  | 'Memecoin'
  | 'NFT / Gaming'
  | 'Privacidad'
  | 'IA / Datos'
  | 'Staking / Recompensas';

export type AssetSector = StockSector | CryptoSector;

export type FixedIncomeType =
  | 'discount' //          A descuento (CETES, BPAGs, T-Bills)
  | 'money_market' //      Fondo de liquidez (BONDDIA, money market)
  | 'fixed_rate_coupon' // Tasa fija con cupones (Bonos M, corporativos)
  | 'inflation_linked' //  Indexado a inflación (UDIBONOS, TIPS)
  | 'promissory_note' //   C.1 — Pagaré bancario (plazo fijo + retención ISR). Pro+
  | 'sofipo' //            C.1 — SoFIPO (igual que pagaré + aviso sin protección IPAB). Pro+
  | 'savings'; //          C.1 — Nu / Ahorros (saldo + tasa anual baja). Free

export type TransactionType =
  | 'Compra'
  | 'Venta'
  | 'Dividendo'
  | 'Interés'
  | 'Staking'
  | 'Ajuste'
  | 'Airdrop' //     v0.6.0 — tokens recibidos gratis (fork / distribución). Solo cripto.
  | 'Recompensa'; // v0.6.0 — recompensas cripto (staking / cashback / interés). Solo cripto.

export type CouponFrequency = 'anual' | 'semestral' | 'trimestral' | 'mensual';

/** F3 — Fuente de precio en vivo de un activo. */
export type PriceSource = 'manual' | 'coingecko' | 'yahoo';

/** F3 — Frecuencia de actualización automática de precios. */
export type PriceUpdateFrequency = 'manual' | '5min' | '15min' | '1hour';

/** F4 — Idiomas soportados. Español es el predeterminado y la fuente de verdad. */
export type Language = 'es' | 'en' | 'fr' | 'zh' | 'ja';

/** F5 — Tema de la interfaz. 'system' sigue la preferencia del sistema operativo. */
export type Theme = 'light' | 'dark' | 'system';

export interface AllocationTargets {
  cripto: number; //      ej. 40
  accion: number; //      ej. 30
  renta_fija: number; //  ej. 30
}

export interface Settings {
  id: number; // singleton, siempre = 1
  base_currency: string; // 'MXN', 'USD', etc.
  allocation_targets: AllocationTargets; // suma debe ser 100
  live_prices_enabled?: boolean; // F3: opt-in a precios en vivo (default false)
  price_update_frequency?: PriceUpdateFrequency; // F3 (default 'manual')
  language?: Language; // F4: idioma de la UI (default 'es')
  theme?: Theme; // F5: tema claro/oscuro/sistema (default 'system')
  auto_check_updates?: boolean; // S9: buscar updates (GitHub) cada 7 días (opt-in, default false)
  auto_download_updates?: boolean; // S9: descargar updates en segundo plano (opt-in, default false)
  updates_last_checked?: string; // S9: ISO de la última búsqueda de actualizaciones
}

export interface Asset {
  id: string; // UUID
  ticker: string; // 'BTC', 'MSFT', 'CETES-28', etc.
  name: string;
  class: AssetClass;
  fixed_income_type?: FixedIncomeType; // solo si class === 'Renta Fija'
  currency: string; // moneda en la que se cotiza el precio
  current_price: number; // captura manual; F3 puede actualizarlo en vivo
  price_source?: PriceSource; // F3: fuente de precio en vivo (default 'manual')
  sector?: AssetSector; // S10: sector (lista fija) — opcional, NO indexado. Solo acciones/cripto.
  label_ids?: string[]; // S10: IDs de Label (etiquetas libres) — opcional, NO indexado.
  notes?: string;
}

/**
 * S10 — Etiqueta personalizada (Premium+). Capa de clasificación LIBRE que el
 * usuario crea para organizar por estrategia (p. ej. "Tesis de IA", "Dividendos").
 * Independiente del `sector`. Tabla Dexie `labels` (v4). Un activo la referencia
 * por `Asset.label_ids` (array de estos `id`).
 */
export interface Label {
  id: string; // UUID
  name: string; // máx. 30 caracteres
  color?: string; // hex opcional, para la UI
  created_at: string; // ISO
}

export interface Transaction {
  id: string; // UUID
  date: string; // ISO 'YYYY-MM-DD'
  asset_id: string; // FK a Asset
  type: TransactionType;
  quantity: number;
  price_per_unit: number; // en la moneda de la operación
  operation_currency: string;
  fx_rate: number; // tipo de cambio operación -> base
  commission: number; // en moneda de la operación
  withholding: number; // retención en moneda de la operación
  platform?: string;
  notes?: string;
}

export interface FxRate {
  currency: string; // PK — 'USD', 'EUR', etc.
  rate_to_base: number; // cuánta moneda base vale 1 unidad de esta moneda
  updated_at: string; // ISO
}

/**
 * Renta fija: una sola tabla con campos opcionales según `type`.
 * Cada posición referencia un Asset (class 'Renta Fija') vía asset_id.
 * El capital_invested es el costo base (captura única); los cupones/intereses
 * cobrados se registran aparte como transacciones tipo 'Interés'.
 */
export interface FixedIncomePosition {
  id: string;
  asset_id: string; // FK a Asset
  type: FixedIncomeType;
  currency: string;
  notes?: string;
  institution?: string; // C.2 — banco/plataforma (string libre; el dropdown vive en la UI)

  // --- discount / fixed_rate_coupon / inflation_linked ---
  purchase_date?: string; // ISO
  capital_invested?: number; // costo base, en `currency`

  // --- discount ---
  annual_rate?: number; // % anual
  term_days?: number; // plazo en días
  maturity_date?: string; // ISO (auto = compra + plazo, editable)
  face_value_per_title?: number; // valor nominal por título (default 10)

  // --- money_market ---
  reported_balance?: number; // saldo actual reportado por la plataforma

  // --- fixed_rate_coupon / inflation_linked ---
  face_value_total?: number; // valor nominal total (lo que regresan al vencer)
  coupon_rate?: number; // tasa cupón anual % (real, para inflation_linked)
  coupon_frequency?: CouponFrequency;
  first_coupon_date?: string; // ISO

  // --- inflation_linked ---
  face_value_in_units?: number; // valor nominal en unidades indexadas (UDIs)
  unit_value_at_purchase?: number; // valor de la unidad al comprar (UDI compra)
  unit_value_current?: number; // valor de la unidad actual (UDI actual)
}

export interface HistoricalSnapshot {
  id: string;
  date: string; // ISO — fecha de cierre del mes
  total_invested: number;
  total_market_value: number;
  total_pnl: number;
  return_pct: number;
}

/**
 * D.5 — Meta financiera (Premium+). Valor objetivo y fecha objetivo opcional.
 * El avance se mide contra el valor de mercado del portafolio.
 */
export interface Goal {
  id: string; // UUID
  name: string;
  target_amount: number; // en moneda base
  target_date?: string; // ISO (opcional)
  created_at: string; // ISO
}

/**
 * A.1 — Licencia activada. Singleton (id = 1) en la tabla Dexie `license`.
 * Sin fila = plan Free. El `machine_id` es un identificador ANÓNIMO y NO
 * personal (UUID local); se recalcula en cada equipo y NO se confía en el del
 * respaldo (si difiere, es señal de equipo distinto → A.5).
 */
export interface License {
  id: number; //          singleton, siempre = 1
  tier: Tier;
  code: string; //        el código activado (ej. "PTRF-PRO-2026-XXXXXXXX")
  activated_at: string; // ISO date
  machine_id: string; //  fingerprint anónimo (UUID local), NO datos personales
}
