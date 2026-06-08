// Adaptador de SERIALIZACIÓN a Excel (.xlsx) — F1 (v0.5.0: ExcelJS + i18n + formato).
//
// IMPORTANTE: este módulo NO contiene lógica de cálculo. Solo toma datos que ya
// calculó el motor (`PortfolioView`, helpers de `portfolio-engine`) y los vuelca
// a un libro de Excel CON FORMATO. Cualquier número que aparezca aquí viene del
// motor puro. Es PURO respecto a React/Dexie (solo el wrapper de descarga toca el
// DOM, y solo si existe `document`).
//
// v0.5.0: se cambió SheetJS por ExcelJS SOLO para el export (con formato
// profesional: encabezados navy, filas alternas, totales gold, bordes, anchos
// automáticos) y los textos se traducen con la `t` que pasa cada pantalla.
// SheetJS sigue instalado: lo usa `import-xlsx.ts` para LEER importaciones.
//
// S6 (sanitización): nunca asignamos `cell.value` como fórmula; todo va como
// texto/número inerte, así que un ticker o nota que empiece con '=' no se ejecuta.

import ExcelJS from 'exceljs';
import type { Cell, Row, Worksheet } from 'exceljs';
import type { TFunction } from 'i18next';
import type { Asset, Transaction } from '../types';
import { grossAmountOp, netAmountBase, toBase } from './portfolio-engine';
import type { PortfolioView } from './selectors';
import { APP_VERSION } from '../config/version';
import { todayISO } from './dates';

// --- Paleta y formatos -----------------------------------------------------
// ARGB (alfa primero). Tokens de marca: navy #1F3864, gold #F0CDA1.
const C = {
  navy: 'FF1F3864',
  white: 'FFFFFFFF',
  gold: 'FFF0CDA1',
  zebra: 'FFF5F5F5',
  border: 'FFD9D9D9',
  muted: 'FF808080',
} as const;

const FMT = {
  money: '#,##0.00',
  pct: '#,##0.00"%"',
  qty: '#,##0.########',
  price: '#,##0.######',
} as const;

type Align = 'left' | 'right';

interface ColSpec {
  header: string;
  align: Align;
  fmt?: string;
}

/** Redondeo de presentación (no es cálculo de negocio): evita ruido de flotantes. */
function round(n: number, decimals = 2): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// --- Helpers de estilo -----------------------------------------------------

function thinBorder() {
  const side = { style: 'thin' as const, color: { argb: C.border } };
  return { top: side, left: side, bottom: side, right: side };
}

function styleHeaderCell(cell: Cell, align: Align): void {
  cell.font = { bold: true, size: 11, color: { argb: C.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
  cell.alignment = { vertical: 'middle', horizontal: align };
  cell.border = thinBorder();
}

function styleDataCell(cell: Cell, align: Align, fmt: string | undefined, zebra: boolean): void {
  cell.font = { size: 10 };
  cell.alignment = { horizontal: align, vertical: 'middle' };
  if (fmt && typeof cell.value === 'number') cell.numFmt = fmt;
  if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
  cell.border = thinBorder();
}

function styleTotalCell(cell: Cell, align: Align, fmt: string | undefined): void {
  cell.font = { bold: true, size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gold } };
  cell.alignment = { horizontal: align, vertical: 'middle' };
  if (fmt && typeof cell.value === 'number') cell.numFmt = fmt;
  cell.border = thinBorder();
}

/**
 * Agrega una tabla con encabezado (navy), filas de datos (zebra + bordes) y una
 * fila de totales opcional (gold). Devuelve las filas de DATOS por si hay que
 * ajustar el formato de alguna celda puntual. Si `title` está vacío, no agrega
 * fila de título (así el encabezado queda en la fila 1, como pide el spec).
 */
function addTable(
  ws: Worksheet,
  title: string,
  cols: ColSpec[],
  dataRows: Array<Array<string | number>>,
  totalRow?: Array<string | number>,
): Row[] {
  if (title) {
    const tRow = ws.addRow([title]);
    tRow.getCell(1).font = { bold: true, size: 12, color: { argb: C.navy } };
  }
  const headerRow = ws.addRow(cols.map((c) => c.header));
  headerRow.height = 20;
  cols.forEach((c, i) => styleHeaderCell(headerRow.getCell(i + 1), c.align));

  const added: Row[] = [];
  dataRows.forEach((vals, ri) => {
    const r = ws.addRow(vals);
    cols.forEach((c, i) => styleDataCell(r.getCell(i + 1), c.align, c.fmt, ri % 2 === 1));
    added.push(r);
  });

  if (totalRow) {
    const r = ws.addRow(totalRow);
    cols.forEach((c, i) => styleTotalCell(r.getCell(i + 1), c.align, c.fmt));
  }

  ws.addRow([]); // espaciador entre tablas
  return added;
}

/** Ancho automático por columna: clamp [min, max] sobre el largo del contenido. */
function autoWidth(ws: Worksheet, colCount: number, min = 12, max = 40): void {
  for (let c = 1; c <= colCount; c++) {
    let width = min;
    ws.getColumn(c).eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const len = v == null ? 0 : String(v).length + 2;
      if (len > width) width = len;
    });
    ws.getColumn(c).width = Math.min(max, width);
  }
}

// --- Hojas reutilizables ---------------------------------------------------

/** Hoja "Movimientos": una fila por transacción, encabezados en la fila 1. */
function addMovimientosSheet(
  wb: ExcelJS.Workbook,
  txns: Transaction[],
  assets: Asset[],
  base: string,
  t: TFunction,
): void {
  const ws = wb.addWorksheet(t('export.sheetMovements'));
  const assetById = new Map(assets.map((a) => [a.id, a]));

  const cols: ColSpec[] = [
    { header: t('export.colDate'), align: 'left' },
    { header: t('export.colTicker'), align: 'left' },
    { header: t('export.colName'), align: 'left' },
    { header: t('export.colType'), align: 'left' },
    { header: t('export.colQuantity'), align: 'right', fmt: FMT.qty },
    { header: t('export.colUnitPrice'), align: 'right', fmt: FMT.price },
    { header: t('export.colCurrency'), align: 'left' },
    { header: t('export.colFxRate'), align: 'right', fmt: FMT.price },
    { header: t('export.colCommission'), align: 'right', fmt: FMT.money },
    { header: t('export.colWithholding'), align: 'right', fmt: FMT.money },
    { header: t('export.colAmountBase', { base }), align: 'right', fmt: FMT.money },
    { header: t('export.colCommissionBase', { base }), align: 'right', fmt: FMT.money },
    { header: t('export.colNetBase', { base }), align: 'right', fmt: FMT.money },
    { header: t('export.colPlatform'), align: 'left' },
    { header: t('export.colNotes'), align: 'left' },
  ];

  const rows: Array<Array<string | number>> = txns.map((tx) => {
    const a = assetById.get(tx.asset_id);
    return [
      tx.date,
      a?.ticker ?? '—',
      a?.name ?? '',
      t(`txType.${tx.type}`),
      round(tx.quantity, 8),
      round(tx.price_per_unit, 6),
      tx.operation_currency,
      round(tx.fx_rate, 6),
      round(tx.commission),
      round(tx.withholding),
      round(toBase(grossAmountOp(tx), tx.fx_rate)),
      round(toBase(tx.commission, tx.fx_rate)),
      round(netAmountBase(tx)),
      tx.platform ?? '',
      tx.notes ?? '',
    ];
  });

  addTable(ws, '', cols, rows); // sin título → encabezado en la fila 1
  autoWidth(ws, cols.length);
}

/** Hoja "Info": metadatos (app, fecha local de generación, versión, moneda base). */
function addInfoSheet(wb: ExcelJS.Workbook, base: string, t: TFunction): void {
  const ws = wb.addWorksheet(t('export.sheetInfo'));
  const rows: Array<[string, string]> = [
    [t('export.appName'), 'Tracker de Portafolio'],
    [t('export.generatedOn'), new Date().toLocaleString()],
    [t('export.version'), APP_VERSION],
    [t('export.baseCurrency'), base],
  ];
  for (const [k, v] of rows) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  }
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 32;
}

/** Hoja "Instrucciones" de la plantilla de importación: cómo llenar cada columna. */
function addTemplateInfoSheet(wb: ExcelJS.Workbook, base: string, t: TFunction, typeList: string): void {
  const ws = wb.addWorksheet(t('import.tplInstructionsSheet'));
  const title = ws.addRow([t('import.tplInstructionsTitle')]);
  title.getCell(1).font = { bold: true, size: 12, color: { argb: C.navy } };
  ws.addRow([t('import.tplIntro')]);
  ws.addRow([]);
  const lines: Array<[string, string]> = [
    [t('export.colDate'), t('import.tplDateHint')],
    [t('export.colType'), t('import.tplTypeHint', { list: typeList })],
    [t('export.colCurrency'), t('import.tplCurrencyHint')],
    [t('export.colFxRate'), t('import.tplFxHint')],
    [`${t('export.colCommission')} / ${t('export.colWithholding')}`, t('import.tplFeeHint')],
  ];
  for (const [k, v] of lines) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  }
  ws.addRow([]);
  const note = ws.addRow([t('import.tplCalculatedNote', { base })]);
  note.getCell(1).font = { italic: true, color: { argb: C.muted } };
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 72;
}

// --- Constructores de libro (puros: devuelven un Workbook, testeables) ------

/** Reporte del Dashboard: hoja Resumen (KPIs + asignación + P&L) + Movimientos + Info. */
export function buildResumenWorkbook(
  view: PortfolioView,
  base: string,
  txns: Transaction[],
  assets: Asset[],
  t: TFunction,
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tracker de Portafolio';
  wb.created = new Date();

  const ws = wb.addWorksheet(t('export.sheetSummary'));
  const { totals, allocation, pnlBreakdown } = view;

  // Indicadores (KPIs)
  const kpiRows = addTable(
    ws,
    t('export.sectionIndicators'),
    [
      { header: t('export.indicator'), align: 'left' },
      { header: t('export.valueBase', { base }), align: 'right', fmt: FMT.money },
    ],
    [
      [t('export.totalInvested'), round(totals.totalInvested)],
      [t('export.marketValue'), round(totals.totalMarketValue)],
      [t('export.gainLoss'), round(totals.totalPnl)],
      [t('export.returnPct'), round(totals.returnPct)],
    ],
  );
  // El rendimiento es un % (no dinero): ajusta el formato de su celda de valor.
  const returnRow = kpiRows[3];
  if (returnRow) returnRow.getCell(2).numFmt = FMT.pct;

  // Distribución vs. Objetivo
  addTable(
    ws,
    t('export.sectionAllocation'),
    [
      { header: t('export.assetClass'), align: 'left' },
      { header: t('export.valueBase', { base }), align: 'right', fmt: FMT.money },
      { header: t('export.weightCurrent'), align: 'right', fmt: FMT.pct },
      { header: t('export.weightTarget'), align: 'right', fmt: FMT.pct },
      { header: t('export.diffPp'), align: 'right', fmt: FMT.pct },
    ],
    allocation.map((r) => [
      t(`allocClass.${r.key}`),
      round(r.marketValue),
      round(r.weightPct),
      round(r.targetPct),
      round(r.diffPct),
    ]),
  );

  // Desglose de P&L (con fila de total en gold)
  addTable(
    ws,
    t('export.sectionPnl'),
    [
      { header: t('export.concept'), align: 'left' },
      { header: t('export.amountBase', { base }), align: 'right', fmt: FMT.money },
    ],
    [
      [t('export.pnlUnrealized'), round(pnlBreakdown.unrealized)],
      [t('export.pnlRealizedSales'), round(pnlBreakdown.realizedSales)],
      [t('export.pnlDividends'), round(pnlBreakdown.dividends)],
      [t('export.pnlInterest'), round(pnlBreakdown.interest)],
    ],
    [t('export.totalPnl'), round(totals.totalPnl)],
  );

  // Nota de staking (informativa, atenuada)
  const stk = ws.addRow([t('export.stakingValue'), round(pnlBreakdown.stakingValue)]);
  stk.getCell(1).font = { size: 9, italic: true, color: { argb: C.muted } };
  stk.getCell(2).font = { size: 9, italic: true, color: { argb: C.muted } };
  stk.getCell(2).numFmt = FMT.money;
  stk.getCell(2).alignment = { horizontal: 'right' };

  autoWidth(ws, 5);

  addMovimientosSheet(wb, txns, assets, base, t);
  addInfoSheet(wb, base, t);
  return wb;
}

/** Solo Movimientos (respeta los filtros activos: el llamador pasa la lista filtrada) + Info. */
export function buildMovimientosWorkbook(
  txns: Transaction[],
  assets: Asset[],
  base: string,
  t: TFunction,
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tracker de Portafolio';
  wb.created = new Date();
  addMovimientosSheet(wb, txns, assets, base, t);
  addInfoSheet(wb, base, t);
  return wb;
}

/**
 * Plantilla de importación de Movimientos (v0.7.0). Reproduce EXACTAMENTE las
 * columnas de ENTRADA del export (sin las calculadas "…en base", que la app
 * recalcula), con el mismo formato navy + una fila de ejemplo + una hoja de
 * instrucciones. Reusa las MISMAS claves i18n del export, así la ida y vuelta
 * (exportar → reimportar) mapea las columnas automáticamente en cualquier idioma.
 *
 * Es una operación de ESCRITURA (igual que el export), por eso usa ExcelJS;
 * SheetJS se sigue usando para LEER el archivo al importar (`import-xlsx.ts`).
 */
export function buildMovimientosTemplateWorkbook(base: string, t: TFunction): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tracker de Portafolio';
  wb.created = new Date();

  interface TplCol {
    header: string;
    example: string | number;
    align: Align;
    fmt?: string;
    note?: string;
  }
  // Lista de tipos válidos COMPUESTA de las mismas etiquetas que muestra la app
  // (txType.*), así el aviso coincide con el idioma activo sin traducir a mano.
  const typeList = (
    ['Compra', 'Venta', 'Dividendo', 'Interés', 'Staking', 'Ajuste', 'Airdrop', 'Recompensa'] as const
  )
    .map((ty) => t(`txType.${ty}`))
    .join(', ');
  // SOLO columnas de entrada (las calculadas "…en base" NO van: las hace la app).
  const cols: TplCol[] = [
    { header: t('export.colDate'), example: '2026-01-15', align: 'left', note: t('import.tplDateHint') },
    { header: t('export.colTicker'), example: 'BTC', align: 'left' },
    { header: t('export.colType'), example: t('txType.Compra'), align: 'left', note: t('import.tplTypeHint', { list: typeList }) },
    { header: t('export.colQuantity'), example: 0.05, align: 'right', fmt: FMT.qty },
    { header: t('export.colUnitPrice'), example: 95000, align: 'right', fmt: FMT.price },
    { header: t('export.colCurrency'), example: 'USD', align: 'left', note: t('import.tplCurrencyHint') },
    { header: t('export.colFxRate'), example: 20.1, align: 'right', fmt: FMT.price, note: t('import.tplFxHint') },
    { header: t('export.colCommission'), example: 5, align: 'right', fmt: FMT.money, note: t('import.tplFeeHint') },
    { header: t('export.colWithholding'), example: 0, align: 'right', fmt: FMT.money, note: t('import.tplFeeHint') },
    { header: t('export.colPlatform'), example: 'Bitso', align: 'left' },
    { header: t('export.colNotes'), example: t('import.tplExampleNote'), align: 'left' },
  ];

  const ws = wb.addWorksheet(t('export.sheetMovements'));
  const headerRow = ws.addRow(cols.map((c) => c.header));
  headerRow.height = 20;
  cols.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    styleHeaderCell(cell, c.align);
    if (c.note) cell.note = c.note; // comentario con la ayuda de cada columna
  });
  const exampleRow = ws.addRow(cols.map((c) => c.example));
  cols.forEach((c, i) => styleDataCell(exampleRow.getCell(i + 1), c.align, c.fmt, false));
  autoWidth(ws, cols.length);

  addTemplateInfoSheet(wb, base, t, typeList); // segunda hoja → la de datos queda primera
  return wb;
}

// --- Descarga (impuro: toca el DOM; no-op fuera del navegador, p. ej. en tests) ---

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buf = await wb.xlsx.writeBuffer();
  if (typeof document === 'undefined') return; // entorno sin DOM (node/tests)
  const blob = new Blob([buf as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporta el reporte completo del Dashboard. Archivo: portafolio-resumen-FECHA.xlsx */
export async function exportResumenXlsx(
  view: PortfolioView,
  base: string,
  txns: Transaction[],
  assets: Asset[],
  t: TFunction,
): Promise<void> {
  const wb = buildResumenWorkbook(view, base, txns, assets, t);
  await downloadWorkbook(wb, `portafolio-resumen-${todayISO()}.xlsx`);
}

/** Exporta solo Movimientos (filtrados). Archivo: portafolio-movimientos-FECHA.xlsx */
export async function exportMovimientosXlsx(
  txns: Transaction[],
  assets: Asset[],
  base: string,
  t: TFunction,
): Promise<void> {
  const wb = buildMovimientosWorkbook(txns, assets, base, t);
  await downloadWorkbook(wb, `portafolio-movimientos-${todayISO()}.xlsx`);
}

/** Descarga la plantilla de importación de Movimientos. Archivo: plantilla-movimientos.xlsx */
export async function exportMovimientosTemplateXlsx(base: string, t: TFunction): Promise<void> {
  const wb = buildMovimientosTemplateWorkbook(base, t);
  await downloadWorkbook(wb, 'plantilla-movimientos.xlsx');
}
