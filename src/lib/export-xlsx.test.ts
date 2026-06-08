import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import {
  buildMovimientosTemplateWorkbook,
  buildMovimientosWorkbook,
  buildResumenWorkbook,
} from './export-xlsx';
import type { PortfolioView } from './selectors';
import type { Asset, Transaction } from '../types';

// Mock de `t`: devuelve la clave (con el valor de `base` si se interpola). Así el
// test no depende de i18n ni de Dexie; solo verifica que se construye el libro.
const t = ((key: string, opts?: { base?: string }) =>
  opts && opts.base ? `${key}(${opts.base})` : key) as unknown as TFunction;

const assets: Asset[] = [
  { id: 'btc', ticker: 'BTC', name: 'Bitcoin', class: 'Cripto', currency: 'USD', current_price: 68000 },
];

const txns: Transaction[] = [
  {
    id: 't1',
    date: '2026-01-15',
    asset_id: 'btc',
    type: 'Compra',
    quantity: 0.5,
    price_per_unit: 60000,
    operation_currency: 'USD',
    fx_rate: 18,
    commission: 10,
    withholding: 0,
    platform: 'Binance',
  },
];

// Vista mínima: el builder solo lee totals / allocation / pnlBreakdown.
const view = {
  totals: { totalInvested: 540180, totalMarketValue: 612000, totalPnl: 71820, returnPct: 13.29 },
  allocation: [
    { key: 'cripto', marketValue: 612000, weightPct: 100, targetPct: 40, diffPct: 60 },
    { key: 'accion', marketValue: 0, weightPct: 0, targetPct: 30, diffPct: -30 },
    { key: 'renta_fija', marketValue: 0, weightPct: 0, targetPct: 30, diffPct: -30 },
  ],
  pnlBreakdown: { unrealized: 71820, realizedSales: 0, dividends: 0, interest: 0, stakingValue: 0 },
} as unknown as PortfolioView;

describe('export-xlsx (ExcelJS)', () => {
  it('buildResumenWorkbook arma 3 hojas y genera un .xlsx no vacío', async () => {
    const wb = buildResumenWorkbook(view, 'MXN', txns, assets, t);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'export.sheetSummary',
      'export.sheetMovements',
      'export.sheetInfo',
    ]);
    const buf = await wb.xlsx.writeBuffer();
    expect(buf).toBeTruthy();
    expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(0);
  });

  it('buildMovimientosWorkbook genera un .xlsx no vacío sin lanzar', async () => {
    const wb = buildMovimientosWorkbook(txns, assets, 'MXN', t);
    const buf = await wb.xlsx.writeBuffer();
    expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(0);
  });

  it('no lanza con listas vacías', async () => {
    const wb = buildMovimientosWorkbook([], [], 'MXN', t);
    await expect(wb.xlsx.writeBuffer()).resolves.toBeTruthy();
  });
});

describe('buildMovimientosTemplateWorkbook (plantilla de importación, v0.7.0)', () => {
  it('usa las MISMAS columnas de entrada del export, sin las calculadas', () => {
    const wb = buildMovimientosTemplateWorkbook('MXN', t);
    const ws = wb.worksheets[0];
    const headers: unknown[] = [];
    ws.getRow(1).eachCell((cell) => headers.push(cell.value));

    expect(headers).toEqual([
      'export.colDate',
      'export.colTicker',
      'export.colType',
      'export.colQuantity',
      'export.colUnitPrice',
      'export.colCurrency',
      'export.colFxRate',
      'export.colCommission',
      'export.colWithholding',
      'export.colPlatform',
      'export.colNotes',
    ]);
    // Las columnas calculadas del export NO van en la plantilla de entrada.
    for (const calc of ['export.colAmountBase', 'export.colCommissionBase', 'export.colNetBase', 'export.colName']) {
      expect(headers).not.toContain(calc);
    }
  });

  it('incluye una fila de ejemplo (encabezados + 1 fila) y una hoja de instrucciones', async () => {
    const wb = buildMovimientosTemplateWorkbook('MXN', t);
    const ws = wb.worksheets[0];
    expect(ws.rowCount).toBeGreaterThanOrEqual(2); // encabezado + ejemplo
    // La hoja de DATOS debe ser la primera (la que lee el importador).
    expect(wb.worksheets.length).toBeGreaterThanOrEqual(2);
    const buf = await wb.xlsx.writeBuffer();
    expect((buf as ArrayBuffer).byteLength).toBeGreaterThan(0);
  });
});
