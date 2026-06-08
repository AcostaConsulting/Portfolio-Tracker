import Dexie, { type Table } from 'dexie';
import type {
  Asset,
  FixedIncomePosition,
  FxRate,
  Goal,
  HistoricalSnapshot,
  Label,
  License,
  Settings,
  Transaction,
} from '../types';

export const SETTINGS_ID = 1;
export const LICENSE_ID = 1;

export class PortfolioDB extends Dexie {
  settings!: Table<Settings, number>;
  assets!: Table<Asset, string>;
  transactions!: Table<Transaction, string>;
  fx_rates!: Table<FxRate, string>;
  fixed_income_positions!: Table<FixedIncomePosition, string>;
  historical_snapshots!: Table<HistoricalSnapshot, string>;
  license!: Table<License, number>; // A.1 — singleton id=1; sin fila = Free
  goals!: Table<Goal, string>; // D.5 — metas financieras (Premium+)
  labels!: Table<Label, string>; // S10 — etiquetas personalizadas (Premium+)

  constructor() {
    super('portfolio-tracker');
    this.version(1).stores({
      // Solo se declaran las columnas indexadas; el resto del objeto se guarda igual.
      settings: 'id',
      assets: 'id, ticker, class',
      transactions: 'id, asset_id, date, type',
      fx_rates: 'currency',
      fixed_income_positions: 'id, asset_id, type',
      historical_snapshots: 'id, date',
    });
    // v2 (Sesión 4) — tabla `license`. Dexie conserva las tablas anteriores; la
    // nueva empieza vacía (= plan Free), sin romper datos ni respaldos existentes.
    this.version(2).stores({
      license: 'id',
    });
    // v3 (Sesión 4) — tabla `goals` (D.5). Empieza vacía; sin romper datos.
    this.version(3).stores({
      goals: 'id',
    });
    // v4 (Sesión 10) — tabla `labels` (etiquetas personalizadas). Empieza vacía;
    // sin romper datos. Los campos nuevos de Asset (sector, label_ids) NO son
    // indexados, así que no se declaran aquí (van solos, sin migración).
    this.version(4).stores({
      labels: 'id, name',
    });
  }
}

export const db = new PortfolioDB();
