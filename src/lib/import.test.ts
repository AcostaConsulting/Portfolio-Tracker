import { describe, it, expect } from 'vitest';
import {
  coerceDate,
  parseNumber,
  normalizeType,
  normalizeClass,
  autoSuggestMapping,
  parseRows,
  parseSnapshotRows,
  type ColumnMapping,
} from './import';
import type { Asset } from '../types';

const FULL_MAPPING: ColumnMapping = {
  date: 0,
  ticker: 1,
  class: 2,
  type: 3,
  quantity: 4,
  price: 5,
  currency: 6,
  commission: 7,
  withholding: 8,
  notes: 9,
};

const BTC: Asset = { id: 'btc-existing', ticker: 'BTC', name: 'Bitcoin', class: 'Cripto', currency: 'USD', current_price: 0 };

describe('helpers', () => {
  it('coerceDate acepta ISO y reformatea otros formatos', () => {
    expect(coerceDate('2026-01-15')).toBe('2026-01-15');
    expect(coerceDate('  2026-01-15 ')).toBe('2026-01-15');
    expect(coerceDate('not-a-date')).toBeNull();
    expect(coerceDate('2026-13-40')).toBeNull();
  });

  it('parseNumber tolera comas, espacios y símbolo de moneda', () => {
    expect(parseNumber('1,234.50')).toBeCloseTo(1234.5);
    expect(parseNumber('$ 60000')).toBe(60000);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });

  it('normalizeType y normalizeClass mapean sinónimos', () => {
    expect(normalizeType('compra')).toBe('Compra');
    expect(normalizeType('BUY')).toBe('Compra');
    expect(normalizeType('cupón')).toBe('Interés');
    expect(normalizeType('airdrop')).toBe('Airdrop');
    expect(normalizeType('recompensa')).toBe('Recompensa');
    expect(normalizeType('xyz')).toBeNull();
    expect(normalizeClass('crypto')).toBe('Cripto');
    expect(normalizeClass('Acciones')).toBe('Acción');
    expect(normalizeClass('renta fija')).toBe('Renta Fija');
    expect(normalizeClass('nope')).toBeNull();
  });
});

describe('autoSuggestMapping', () => {
  it('mapea los encabezados de la plantilla en español', () => {
    const headers = ['Fecha (YYYY-MM-DD)', 'Activo (ticker)', 'Clase', 'Tipo', 'Cantidad', 'Precio', 'Moneda', 'Comisión', 'Retención', 'Notas'];
    const m = autoSuggestMapping(headers);
    expect(m).toMatchObject({ date: 0, ticker: 1, class: 2, type: 3, quantity: 4, price: 5, currency: 6, commission: 7, withholding: 8, notes: 9 });
  });

  it('respeta encabezados conocidos (ida y vuelta en cualquier idioma)', () => {
    const headers = ['日付', '銘柄', '種別', '数量', '価格'];
    const m = autoSuggestMapping(headers, { date: '日付', ticker: '銘柄', type: '種別', quantity: '数量', price: '価格' });
    expect(m).toMatchObject({ date: 0, ticker: 1, type: 2, quantity: 3, price: 4 });
  });
});

describe('parseRows', () => {
  const opts = { existingAssets: [BTC], baseCurrency: 'MXN', ratesToBase: { USD: 18 } };

  it('importa filas válidas, crea activos nuevos y referencia los existentes', () => {
    const raw = [
      ['2026-01-15', 'BTC', 'Cripto', 'Compra', '0.05', '60000', 'USD', '15', '0', 'primera'],
      ['2026-02-10', 'msft', 'Acción', 'buy', '10', '400', 'USD', '5', '', ''],
    ];
    const r = parseRows(raw, FULL_MAPPING, opts);
    expect(r.errors).toHaveLength(0);
    expect(r.transactions).toHaveLength(2);
    expect(r.newAssets).toHaveLength(1);
    expect(r.newAssets[0].ticker).toBe('MSFT');
    expect(r.newAssets[0].class).toBe('Acción');
    const btcTx = r.transactions[0];
    expect(btcTx.asset_id).toBe('btc-existing'); // referencia al existente
    expect(btcTx.fx_rate).toBe(18); // tomado de ratesToBase
    expect(btcTx.commission).toBe(15);
  });

  it('reporta errores por fila sin abortar el resto', () => {
    const raw = [
      ['2026-01-15', 'BTC', 'Cripto', 'Compra', '0.05', '60000', 'USD', '', '', ''],
      ['mala-fecha', 'ETH', 'Cripto', 'Compra', '1', '3000', 'USD', '', '', ''],
      ['2026-03-01', 'BTC', 'Cripto', 'tipoX', '1', '100', 'USD', '', '', ''],
      ['2026-03-02', 'XRP', 'Cripto', 'Compra', '-5', '1', 'USD', '', '', ''],
      ['2026-03-03', 'BTC', 'Cripto', 'Compra', '1', '-100', 'USD', '', '', ''],
    ];
    const r = parseRows(raw, FULL_MAPPING, opts);
    expect(r.transactions).toHaveLength(1);
    expect(r.errors).toHaveLength(4);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5]);
  });

  it('un dividendo lleva el monto en Precio y cantidad 0', () => {
    const raw = [['2026-03-12', 'BTC', 'Cripto', 'Dividendo', '0', '8', 'USD', '', '1.2', '']];
    const r = parseRows(raw, FULL_MAPPING, opts);
    expect(r.errors).toHaveLength(0);
    expect(r.transactions[0]).toMatchObject({ type: 'Dividendo', quantity: 0, price_per_unit: 8, withholding: 1.2 });
  });

  it('salta filas vacías', () => {
    const raw = [[], ['', '', '', '', '', '', '', '', '', ''], ['2026-01-15', 'BTC', 'Cripto', 'Compra', '1', '100', 'USD', '', '', '']];
    const r = parseRows(raw, FULL_MAPPING, opts);
    expect(r.transactions).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
  });
});

// v0.7.0 — el importador debe reflejar las columnas de ENTRADA del export:
// Tipo de cambio (fx_rate) y Plataforma (platform), además de los tipos nuevos.
describe('parseRows — columnas del export (v0.7.0)', () => {
  // Layout de la plantilla/export (sin columnas calculadas): incluye fx_rate y platform.
  const MAP_V7: ColumnMapping = {
    date: 0,
    ticker: 1,
    type: 2,
    quantity: 3,
    price: 4,
    currency: 5,
    fx_rate: 6,
    commission: 7,
    withholding: 8,
    platform: 9,
    notes: 10,
  };
  const opts = { existingAssets: [BTC], baseCurrency: 'MXN', ratesToBase: { USD: 18 } };

  it('usa el Tipo de cambio de la columna (no lo recalcula) y guarda la Plataforma', () => {
    const raw = [['2026-01-15', 'BTC', 'Compra', '0.05', '60000', 'USD', '20.1', '15', '0', 'Bitso', 'nota']];
    const r = parseRows(raw, MAP_V7, opts);
    expect(r.errors).toHaveLength(0);
    expect(r.transactions[0].fx_rate).toBe(20.1); // de la columna, no el 18 de ratesToBase
    expect(r.transactions[0].platform).toBe('Bitso');
  });

  it('si el Tipo de cambio está vacío, cae a 1 cuando la moneda es la base', () => {
    const raw = [['2026-01-15', 'CETE', 'Compra', '1', '100', 'MXN', '', '0', '0', 'GBM', '']];
    const r = parseRows(raw, MAP_V7, { existingAssets: [], baseCurrency: 'MXN', ratesToBase: {} });
    expect(r.errors).toHaveLength(0);
    expect(r.transactions[0].fx_rate).toBe(1);
  });

  it('si el Tipo de cambio está vacío y la moneda no es base, usa la tasa conocida; sin plataforma queda indefinida', () => {
    const raw = [['2026-01-15', 'BTC', 'Compra', '0.05', '60000', 'USD', '', '0', '0', '', '']];
    const r = parseRows(raw, MAP_V7, opts);
    expect(r.transactions[0].fx_rate).toBe(18);
    expect(r.transactions[0].platform).toBeUndefined();
  });

  it('acepta los tipos nuevos Airdrop y Recompensa (cantidad > 0, precio opcional)', () => {
    const raw = [
      ['2026-01-15', 'UNI', 'Airdrop', '12', '', 'USD', '', '0', '0', 'Uniswap', ''],
      ['2026-01-16', 'ETH', 'Recompensa', '0.3', '', 'USD', '', '0', '0', 'Lido', ''],
    ];
    const r = parseRows(raw, MAP_V7, { existingAssets: [], baseCurrency: 'MXN', ratesToBase: {} });
    expect(r.errors).toHaveLength(0);
    expect(r.transactions[0]).toMatchObject({ type: 'Airdrop', quantity: 12, price_per_unit: 0 });
    expect(r.transactions[1]).toMatchObject({ type: 'Recompensa', quantity: 0.3 });
  });

  it('un Airdrop con cantidad 0 es inválido', () => {
    const raw = [['2026-01-15', 'UNI', 'Airdrop', '0', '', 'USD', '', '0', '0', '', '']];
    const r = parseRows(raw, MAP_V7, { existingAssets: [], baseCurrency: 'MXN', ratesToBase: {} });
    expect(r.transactions).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
  });
});

describe('autoSuggestMapping — ida y vuelta con el export completo (v0.7.0)', () => {
  // Encabezados EXACTOS que produce exportMovimientosXlsx (15 columnas).
  const exportHeaders = [
    'Fecha',
    'Activo',
    'Nombre',
    'Tipo',
    'Cantidad',
    'Precio unit. (op)',
    'Moneda op.',
    'Tipo de cambio',
    'Comisión (op)',
    'Retención (op)',
    'Importe en base (MXN)',
    'Comisión en base (MXN)',
    'Neto en base (MXN)',
    'Plataforma',
    'Notas',
  ];
  // Encabezados conocidos = mismas etiquetas del export (lo que pasa la pantalla).
  const known = {
    date: 'Fecha',
    ticker: 'Activo',
    type: 'Tipo',
    quantity: 'Cantidad',
    price: 'Precio unit. (op)',
    currency: 'Moneda op.',
    fx_rate: 'Tipo de cambio',
    commission: 'Comisión (op)',
    withholding: 'Retención (op)',
    platform: 'Plataforma',
    notes: 'Notas',
    class: 'Clase',
  };

  it('mapea cada columna de entrada e ignora las calculadas y Nombre', () => {
    const m = autoSuggestMapping(exportHeaders, known);
    expect(m).toMatchObject({
      date: 0,
      ticker: 1,
      type: 3,
      quantity: 4,
      price: 5,
      currency: 6,
      fx_rate: 7,
      commission: 8,
      withholding: 9,
      platform: 13,
      notes: 14,
    });
    expect(m.class).toBeUndefined(); // el export no trae columna Clase
    // Nombre (2) y las calculadas (10, 11, 12) NO deben mapearse a ningún campo.
    for (const ignored of [2, 10, 11, 12]) {
      expect(Object.values(m)).not.toContain(ignored);
    }
  });
});

describe('parseSnapshotRows', () => {
  it('genera compras de apertura con el costo promedio capturado', () => {
    const raw = [
      ['BTC', 'Cripto', '0.1', '55000', 'USD'],
      ['', 'x', '1', '1', 'USD'], // ticker vacío → error
    ];
    const r = parseSnapshotRows(raw, { ticker: 0, class: 1, quantity: 2, avgCost: 3, currency: 4 }, {
      existingAssets: [],
      baseCurrency: 'MXN',
      ratesToBase: { USD: 18 },
      openingDate: '2026-01-01',
    });
    expect(r.errors).toHaveLength(1);
    expect(r.transactions).toHaveLength(1);
    expect(r.transactions[0]).toMatchObject({
      type: 'Compra',
      quantity: 0.1,
      price_per_unit: 55000,
      date: '2026-01-01',
      fx_rate: 18,
    });
    expect(r.newAssets[0]).toMatchObject({ ticker: 'BTC', current_price: 55000 });
  });
});
