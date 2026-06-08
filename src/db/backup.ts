// Respaldo y restauración por JSON (sección 7 del brief) y reset total.
// El respaldo es la única forma de sincronizar entre dispositivos: no hay nube.

import { db } from './db';
import { ensureSettings } from './seed';
import type {
  Asset,
  FixedIncomePosition,
  FxRate,
  Goal,
  HistoricalSnapshot,
  License,
  Settings,
  Transaction,
} from '../types';

export interface BackupData {
  version: 1;
  exported_at: string; // ISO
  settings: Settings[];
  assets: Asset[];
  transactions: Transaction[];
  fx_rates: FxRate[];
  fixed_income_positions: FixedIncomePosition[];
  historical_snapshots: HistoricalSnapshot[];
  license?: License[]; // A.1 — opcional (respaldos previos a v0.3.0 no la traen)
  goals?: Goal[]; // D.5 — opcional (respaldos previos no la traen)
}

const ALL_TABLES = [
  db.settings,
  db.assets,
  db.transactions,
  db.fx_rates,
  db.fixed_income_positions,
  db.historical_snapshots,
  db.goals,
];

export async function exportAllData(): Promise<BackupData> {
  const [settings, assets, transactions, fx_rates, fixed_income_positions, historical_snapshots, license, goals] =
    await Promise.all([
      db.settings.toArray(),
      db.assets.toArray(),
      db.transactions.toArray(),
      db.fx_rates.toArray(),
      db.fixed_income_positions.toArray(),
      db.historical_snapshots.toArray(),
      db.license.toArray(),
      db.goals.toArray(),
    ]);
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    settings,
    assets,
    transactions,
    fx_rates,
    fixed_income_positions,
    historical_snapshots,
    license,
    goals,
  };
}

/** Valida que un objeto desconocido tenga la forma de un respaldo nuestro. */
export function isBackupData(x: unknown): x is BackupData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return (
    d.version === 1 &&
    Array.isArray(d.assets) &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.settings)
  );
}

/** Reemplaza TODOS los datos por los del respaldo (borra y vuelve a cargar). */
export async function importAllData(data: BackupData): Promise<void> {
  await db.transaction('rw', [...ALL_TABLES, db.license], async () => {
    await Promise.all(ALL_TABLES.map((t) => t.clear()));
    await db.settings.bulkPut(data.settings ?? []);
    await db.assets.bulkPut(data.assets ?? []);
    await db.transactions.bulkPut(data.transactions ?? []);
    await db.fx_rates.bulkPut(data.fx_rates ?? []);
    await db.fixed_income_positions.bulkPut(data.fixed_income_positions ?? []);
    await db.historical_snapshots.bulkPut(data.historical_snapshots ?? []);
    await db.goals.bulkPut(data.goals ?? []);
    // La licencia solo se reemplaza si el respaldo la incluye. Un respaldo viejo
    // (sin licencia) deja intacta la activación actual de este equipo.
    if (data.license !== undefined) {
      await db.license.clear();
      await db.license.bulkPut(data.license ?? []);
    }
  });
}

/**
 * Borra todos los datos y deja una configuración por defecto. No re-siembra los
 * datos de ejemplo: el portafolio queda vacío y listo para capturar.
 */
export async function resetAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES, async () => {
    await Promise.all(ALL_TABLES.map((t) => t.clear()));
  });
  await ensureSettings();
}

// --- S1: tablas SENSIBLES -------------------------------------------------
// Todo menos `settings` (que queda en claro para poder leer moneda/idioma/tema
// antes de desbloquear). Estas tablas solo contienen datos en claro mientras la
// sesión está desbloqueada; al bloquear/arrancar bloqueado se vacían y el dato
// real vive cifrado en el vault (ver src/store/vault.ts).

const SENSITIVE_TABLES = [
  db.assets,
  db.transactions,
  db.fx_rates,
  db.fixed_income_positions,
  db.historical_snapshots,
];

export interface SensitiveData {
  assets: Asset[];
  transactions: Transaction[];
  fx_rates: FxRate[];
  fixed_income_positions: FixedIncomePosition[];
  historical_snapshots: HistoricalSnapshot[];
}

/** Serializa las tablas sensibles (para cifrarlas en el vault). */
export async function exportSensitive(): Promise<SensitiveData> {
  const [assets, transactions, fx_rates, fixed_income_positions, historical_snapshots] =
    await Promise.all([
      db.assets.toArray(),
      db.transactions.toArray(),
      db.fx_rates.toArray(),
      db.fixed_income_positions.toArray(),
      db.historical_snapshots.toArray(),
    ]);
  return { assets, transactions, fx_rates, fixed_income_positions, historical_snapshots };
}

/** Reemplaza las tablas sensibles con el contenido descifrado del vault. */
export async function importSensitive(data: SensitiveData): Promise<void> {
  await db.transaction('rw', SENSITIVE_TABLES, async () => {
    await Promise.all(SENSITIVE_TABLES.map((t) => t.clear()));
    await db.assets.bulkPut(data.assets ?? []);
    await db.transactions.bulkPut(data.transactions ?? []);
    await db.fx_rates.bulkPut(data.fx_rates ?? []);
    await db.fixed_income_positions.bulkPut(data.fixed_income_positions ?? []);
    await db.historical_snapshots.bulkPut(data.historical_snapshots ?? []);
  });
}

/** Vacía las tablas sensibles (al bloquear o arrancar bloqueado: 0 plano en disco). */
export async function clearSensitive(): Promise<void> {
  await db.transaction('rw', SENSITIVE_TABLES, async () => {
    await Promise.all(SENSITIVE_TABLES.map((t) => t.clear()));
  });
}
