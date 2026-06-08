// B.3 — MOTOR DE IMPORTACIÓN (puro). No importa React ni Dexie ni SheetJS.
// Toma filas crudas (matriz de celdas) + un mapeo de columnas y produce:
//  - transacciones válidas (con asset_id resuelto),
//  - activos nuevos a crear (los que no existen aún, por ticker),
//  - una lista de errores por fila (para el preview).
// La ESCRITURA a Dexie la hace la pantalla; aquí solo se valida y transforma.

import type { Asset, AssetClass, Transaction, TransactionType } from '../types';

export type ImportField =
  | 'date'
  | 'ticker'
  | 'class'
  | 'type'
  | 'quantity'
  | 'price'
  | 'currency'
  | 'fx_rate'
  | 'commission'
  | 'withholding'
  | 'platform'
  | 'notes';

export const IMPORT_FIELDS: ImportField[] = [
  'date',
  'ticker',
  'class',
  'type',
  'quantity',
  'price',
  'currency',
  'fx_rate',
  'commission',
  'withholding',
  'platform',
  'notes',
];

/** Campos obligatorios para que una fila pueda importarse. */
export const REQUIRED_FIELDS: ImportField[] = ['date', 'ticker', 'type', 'quantity'];

/** Mapeo destino→índice de columna en las filas crudas. */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export interface RowError {
  row: number; // 1-based, como lo ve el usuario
  code: string; // código de error; la UI lo traduce con `import.err_<code>`
  value?: string; // valor problemático (la fecha o el tipo inválido, etc.)
}

export interface ParseOptions {
  existingAssets: Asset[];
  baseCurrency: string;
  ratesToBase?: Record<string, number>;
}

export interface ParsedImport {
  transactions: Transaction[];
  newAssets: Asset[];
  errors: RowError[];
}

// --- Normalización de valores ----------------------------------------------

const TYPE_SYNONYMS: Record<string, TransactionType> = {
  compra: 'Compra',
  buy: 'Compra',
  purchase: 'Compra',
  venta: 'Venta',
  sell: 'Venta',
  sale: 'Venta',
  dividendo: 'Dividendo',
  dividend: 'Dividendo',
  interes: 'Interés',
  interés: 'Interés',
  interest: 'Interés',
  cupon: 'Interés',
  cupón: 'Interés',
  coupon: 'Interés',
  staking: 'Staking',
  airdrop: 'Airdrop',
  recompensa: 'Recompensa',
  reward: 'Recompensa',
  ajuste: 'Ajuste',
  adjustment: 'Ajuste',
};

const CLASS_SYNONYMS: Record<string, AssetClass> = {
  cripto: 'Cripto',
  crypto: 'Cripto',
  criptomoneda: 'Cripto',
  accion: 'Acción',
  acción: 'Acción',
  acciones: 'Acción',
  stock: 'Acción',
  equity: 'Acción',
  'renta fija': 'Renta Fija',
  renta_fija: 'Renta Fija',
  rentafija: 'Renta Fija',
  bond: 'Renta Fija',
  'fixed income': 'Renta Fija',
};

function lower(s: string): string {
  return s.trim().toLowerCase();
}

/** Quita acentos para comparar encabezados. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export function normalizeType(s: string): TransactionType | null {
  return TYPE_SYNONYMS[lower(s)] ?? null;
}

export function normalizeClass(s: string): AssetClass | null {
  return CLASS_SYNONYMS[lower(s)] ?? null;
}

/** Acepta YYYY-MM-DD; si no, intenta parsear y reformatear a ISO. null si no es fecha. */
export function coerceDate(v: string): string | null {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) ? null : s;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Convierte a número tolerando comas de miles, espacios y símbolo de moneda. */
export function parseNumber(v: string): number | null {
  const s = v.trim().replace(/[\s,$]/g, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fallback */
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Auto-sugerencia de mapeo ----------------------------------------------

const FIELD_PATTERNS: Record<ImportField, string[]> = {
  date: ['fecha', 'date'],
  ticker: ['ticker', 'simbolo', 'activo', 'asset', 'clave', 'symbol'],
  class: ['clase', 'class', 'tipo de activo'],
  type: ['tipo', 'type', 'operacion', 'movimiento'],
  quantity: ['cantidad', 'quantity', 'qty', 'unidades', 'titulos'],
  price: ['precio', 'price', 'costo', 'valor', 'cost'],
  currency: ['moneda', 'currency', 'divisa'],
  fx_rate: ['tipo de cambio', 'tipodecambio', 'cambio', 'exchange rate', 'fxrate'],
  commission: ['comision', 'commission', 'fee', 'comisión'],
  withholding: ['retencion', 'withholding', 'isr', 'retención'],
  platform: ['plataforma', 'platform', 'broker', 'bolsa', 'exchange', 'casa de bolsa'],
  notes: ['notas', 'nota', 'notes', 'comentario', 'note'],
};

/**
 * Sugiere un mapeo a partir de los encabezados del archivo. Primero intenta una
 * coincidencia EXACTA con los encabezados conocidos de nuestra plantilla (para
 * que la ida y vuelta funcione en cualquier idioma), luego heurística por nombre.
 */
export function autoSuggestMapping(
  headers: string[],
  knownHeaders?: Partial<Record<ImportField, string>>,
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const folded = headers.map((h) => fold(h ?? ''));

  // 1) Coincidencia exacta con los encabezados de nuestra plantilla localizada.
  if (knownHeaders) {
    for (const field of IMPORT_FIELDS) {
      const known = knownHeaders[field];
      if (!known) continue;
      const idx = folded.findIndex((h, i) => !used.has(i) && h === fold(known));
      if (idx >= 0) {
        mapping[field] = idx;
        used.add(idx);
      }
    }
  }

  // 2) Heurística por palabras clave (es/en).
  for (const field of IMPORT_FIELDS) {
    if (mapping[field] !== undefined) continue;
    const pats = FIELD_PATTERNS[field].map(fold);
    const idx = folded.findIndex(
      (h, i) => !used.has(i) && h !== '' && pats.some((p) => h === p || h.includes(p)),
    );
    if (idx >= 0) {
      mapping[field] = idx;
      used.add(idx);
    }
  }

  return mapping;
}

// --- Lectura de celdas ------------------------------------------------------

function cell(row: unknown[], idx: number | undefined): string {
  if (idx === undefined || idx === null) return '';
  const v = row[idx];
  return v === undefined || v === null ? '' : String(v).trim();
}

function isEmptyRow(row: unknown[]): boolean {
  return !row || row.every((c) => c === undefined || c === null || String(c).trim() === '');
}

// --- Parseo de transacciones (B.2/B.3) -------------------------------------

export function parseRows(raw: unknown[][], mapping: ColumnMapping, opts: ParseOptions): ParsedImport {
  const transactions: Transaction[] = [];
  const errors: RowError[] = [];
  const newByTicker = new Map<string, Asset>();
  const existingByTicker = new Map(opts.existingAssets.map((a) => [a.ticker.toUpperCase(), a]));
  const rates = opts.ratesToBase ?? {};

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const rowNum = i + 1;
    if (isEmptyRow(row)) continue;

    const dateRaw = cell(row, mapping.date);
    const ticker = cell(row, mapping.ticker).toUpperCase();
    const typeRaw = cell(row, mapping.type);

    const date = coerceDate(dateRaw);
    if (!date) {
      errors.push({ row: rowNum, code: 'badDate', value: dateRaw });
      continue;
    }
    if (!ticker) {
      errors.push({ row: rowNum, code: 'noTicker' });
      continue;
    }
    const type = normalizeType(typeRaw);
    if (!type) {
      errors.push({ row: rowNum, code: 'badType', value: typeRaw });
      continue;
    }

    const quantity = parseNumber(cell(row, mapping.quantity));
    const priceCell = cell(row, mapping.price);
    const price = priceCell === '' ? 0 : parseNumber(priceCell);
    if (price === null) {
      errors.push({ row: rowNum, code: 'badPrice', value: priceCell });
      continue;
    }
    if (price < 0) {
      errors.push({ row: rowNum, code: 'negPrice' });
      continue;
    }

    // Validación por tipo: Compra/Venta/Staking/Airdrop/Recompensa mueven unidades
    // (cantidad > 0); Dividendo/Interés llevan el monto en Precio (cantidad = 0);
    // Ajuste ≠ 0. (Airdrop/Recompensa: el precio es opcional, igual que Staking.)
    const isIncome = type === 'Dividendo' || type === 'Interés';
    if (
      type === 'Compra' ||
      type === 'Venta' ||
      type === 'Staking' ||
      type === 'Airdrop' ||
      type === 'Recompensa'
    ) {
      if (quantity === null || !(quantity > 0)) {
        errors.push({ row: rowNum, code: 'badQty' });
        continue;
      }
    } else if (isIncome) {
      if (!(price > 0)) {
        errors.push({ row: rowNum, code: 'badAmount' });
        continue;
      }
    } else {
      // Ajuste
      if (quantity === null || quantity === 0) {
        errors.push({ row: rowNum, code: 'zeroAdjust' });
        continue;
      }
    }

    // Resolver o crear el activo.
    let asset = existingByTicker.get(ticker) ?? newByTicker.get(ticker);
    if (!asset) {
      const cls = normalizeClass(cell(row, mapping.class)) ?? 'Cripto';
      const curr = cell(row, mapping.currency).toUpperCase() || opts.baseCurrency;
      asset = {
        id: makeId(),
        ticker,
        name: ticker,
        class: cls,
        currency: curr,
        current_price: 0,
        ...(cls === 'Renta Fija' ? { fixed_income_type: 'discount' as const } : {}),
      };
      newByTicker.set(ticker, asset);
    }

    const currency = cell(row, mapping.currency).toUpperCase() || asset.currency || opts.baseCurrency;
    // Tipo de cambio: si la columna trae un número > 0 se usa tal cual (preserva el
    // valor del export); si está vacía, 1 cuando es la moneda base o la tasa conocida.
    const fxCell = parseNumber(cell(row, mapping.fx_rate));
    const fx =
      fxCell !== null && fxCell > 0
        ? fxCell
        : currency === opts.baseCurrency
          ? 1
          : rates[currency] ?? 1;
    const commission = parseNumber(cell(row, mapping.commission)) ?? 0;
    const withholding = parseNumber(cell(row, mapping.withholding)) ?? 0;
    const platform = cell(row, mapping.platform) || undefined;
    const notes = cell(row, mapping.notes) || undefined;

    transactions.push({
      id: makeId(),
      date,
      asset_id: asset.id,
      type,
      quantity: isIncome ? 0 : quantity ?? 0,
      price_per_unit: price,
      operation_currency: currency,
      fx_rate: fx,
      commission: Math.max(0, commission),
      withholding: Math.max(0, withholding),
      ...(platform ? { platform } : {}),
      notes,
    });
  }

  return { transactions, newAssets: [...newByTicker.values()], errors };
}

// --- Snapshot de posiciones (B.4) ------------------------------------------

export type SnapshotField = 'ticker' | 'class' | 'quantity' | 'avgCost' | 'currency';

export const SNAPSHOT_FIELDS: SnapshotField[] = ['ticker', 'class', 'quantity', 'avgCost', 'currency'];
export const SNAPSHOT_REQUIRED: SnapshotField[] = ['ticker', 'quantity', 'avgCost'];

export type SnapshotMapping = Partial<Record<SnapshotField, number>>;

export interface SnapshotOptions {
  existingAssets: Asset[];
  baseCurrency: string;
  ratesToBase?: Record<string, number>;
  openingDate: string; // ISO — fecha de apertura que indica el usuario
}

/**
 * Importa una FOTO de posiciones (ticker, cantidad, costo promedio) generando una
 * transacción de Compra de apertura por cada posición en la fecha indicada. Así el
 * costo promedio ponderado del motor coincide con el capturado.
 */
export function parseSnapshotRows(
  raw: unknown[][],
  mapping: SnapshotMapping,
  opts: SnapshotOptions,
): ParsedImport {
  const transactions: Transaction[] = [];
  const errors: RowError[] = [];
  const newByTicker = new Map<string, Asset>();
  const existingByTicker = new Map(opts.existingAssets.map((a) => [a.ticker.toUpperCase(), a]));
  const rates = opts.ratesToBase ?? {};
  const date = coerceDate(opts.openingDate) ?? opts.openingDate;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const rowNum = i + 1;
    if (isEmptyRow(row)) continue;

    const ticker = cell(row, mapping.ticker).toUpperCase();
    if (!ticker) {
      errors.push({ row: rowNum, code: 'noTicker' });
      continue;
    }
    const quantity = parseNumber(cell(row, mapping.quantity));
    if (quantity === null || !(quantity > 0)) {
      errors.push({ row: rowNum, code: 'badQty' });
      continue;
    }
    const avgCost = parseNumber(cell(row, mapping.avgCost));
    if (avgCost === null || avgCost < 0) {
      errors.push({ row: rowNum, code: 'badAvgCost' });
      continue;
    }

    let asset = existingByTicker.get(ticker) ?? newByTicker.get(ticker);
    if (!asset) {
      const cls = normalizeClass(cell(row, mapping.class)) ?? 'Cripto';
      const curr = cell(row, mapping.currency).toUpperCase() || opts.baseCurrency;
      asset = {
        id: makeId(),
        ticker,
        name: ticker,
        class: cls,
        currency: curr,
        current_price: avgCost,
        ...(cls === 'Renta Fija' ? { fixed_income_type: 'discount' as const } : {}),
      };
      newByTicker.set(ticker, asset);
    }

    const currency = cell(row, mapping.currency).toUpperCase() || asset.currency || opts.baseCurrency;
    const fx = currency === opts.baseCurrency ? 1 : rates[currency] ?? 1;

    transactions.push({
      id: makeId(),
      date,
      asset_id: asset.id,
      type: 'Compra',
      quantity,
      price_per_unit: avgCost,
      operation_currency: currency,
      fx_rate: fx,
      commission: 0,
      withholding: 0,
      notes: 'Apertura (import de posiciones)',
    });
  }

  return { transactions, newAssets: [...newByTicker.values()], errors };
}
