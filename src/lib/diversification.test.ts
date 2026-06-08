import { describe, it, expect } from 'vitest';
import type { Asset, Label } from '../types';
import type { PortfolioView } from './selectors';
import type { FixedIncomeView } from './selectors';
import type { PositionSummary } from './portfolio-engine';
import { computeDiversificationView } from './diversification';

function asset(o: Partial<Asset> & Pick<Asset, 'id' | 'class'>): Asset {
  return {
    id: o.id,
    ticker: o.ticker ?? o.id.toUpperCase(),
    name: o.name ?? o.id,
    class: o.class,
    currency: o.currency ?? 'MXN',
    current_price: o.current_price ?? 0,
    sector: o.sector,
    label_ids: o.label_ids,
    fixed_income_type: o.fixed_income_type,
  };
}

function label(id: string, name: string): Label {
  return { id, name, created_at: '2026-01-01' };
}

/**
 * Construye una PortfolioView mínima. El motor de diversificación solo lee
 * `marketPositions[].asset/.marketValue` y `fixedIncome[].asset/.currentValueBase`,
 * así que el resto de la vista se rellena con stubs (datos de entrada, no mocks
 * de comportamiento).
 */
function makeView(
  market: Array<[Asset, number]>,
  fixed: Array<[Asset, number]> = [],
): PortfolioView {
  return {
    marketPositions: market.map(([a, marketValue]) => ({ asset: a, marketValue }) as PositionSummary),
    fixedIncome: fixed.map(([a, currentValueBase]) => ({ asset: a, currentValueBase }) as FixedIncomeView),
    totals: {} as PortfolioView['totals'],
    allocation: [],
    pnlBreakdown: {} as PortfolioView['pnlBreakdown'],
    ratesToBase: {},
  };
}

describe('computeDiversificationView', () => {
  it('agrupa correctamente por sector', () => {
    const a = asset({ id: 'msft', class: 'Acción', sector: 'Tecnología' });
    const b = asset({ id: 'jpm', class: 'Acción', sector: 'Financiero' });
    const c = asset({ id: 'aapl', class: 'Acción', sector: 'Tecnología' });
    const div = computeDiversificationView([a, b, c], [], makeView([[a, 60], [b, 20], [c, 20]]));

    const tech = div.by_sector.find((s) => s.name === 'Tecnología')!;
    expect(tech.value).toBe(80);
    expect(tech.asset_count).toBe(2);
    expect(tech.percentage).toBeCloseTo(80, 5);
    expect(div.by_sector.find((s) => s.name === 'Financiero')!.value).toBe(20);
  });

  it('agrupa activos sin sector en "Sin clasificar"', () => {
    const a = asset({ id: 'msft', class: 'Acción', sector: 'Tecnología' });
    const b = asset({ id: 'x', class: 'Acción' });
    const div = computeDiversificationView([a, b], [], makeView([[a, 70], [b, 30]]));

    const sinClas = div.by_sector.find((s) => s.name === 'Sin clasificar')!;
    expect(sinClas.value).toBe(30);
    expect(sinClas.asset_count).toBe(1);
    expect(div.unclassified_sector_count).toBe(1);
  });

  it('activo con 2 etiquetas aparece en ambas slices', () => {
    const l1 = label('l1', 'Tesis IA');
    const l2 = label('l2', 'Dividendos');
    const a = asset({ id: 'nvda', class: 'Acción', label_ids: ['l1', 'l2'] });
    const div = computeDiversificationView([a], [l1, l2], makeView([[a, 100]]));

    const s1 = div.by_label.find((s) => s.label_id === 'l1')!;
    const s2 = div.by_label.find((s) => s.label_id === 'l2')!;
    expect(s1.value).toBe(100);
    expect(s2.value).toBe(100);
    expect(s1.label_name).toBe('Tesis IA');
    expect(s1.percentage + s2.percentage).toBeCloseTo(100, 5);
  });

  it('activos con valor 0 no aparecen', () => {
    const a = asset({ id: 'a', class: 'Acción', sector: 'Tecnología' });
    const b = asset({ id: 'b', class: 'Acción', sector: 'Salud' });
    const div = computeDiversificationView([a, b], [], makeView([[a, 50], [b, 0]]));

    expect(div.by_sector).toHaveLength(1);
    expect(div.by_sector[0].name).toBe('Tecnología');
  });

  it('porcentajes suman 100 (tolerancia 0.01)', () => {
    const l1 = label('l1', 'A');
    const l2 = label('l2', 'B');
    const a = asset({ id: 'a', class: 'Acción', sector: 'Tecnología', label_ids: ['l1', 'l2'] });
    const b = asset({ id: 'b', class: 'Acción', sector: 'Salud', label_ids: ['l1'] });
    const c = asset({ id: 'c', class: 'Cripto' });
    const div = computeDiversificationView([a, b, c], [l1, l2], makeView([[a, 100], [b, 50], [c, 30]]));

    expect(div.by_sector.reduce((s, x) => s + x.percentage, 0)).toBeCloseTo(100, 2);
    expect(div.by_label.reduce((s, x) => s + x.percentage, 0)).toBeCloseTo(100, 2);
  });

  it('renta fija no aparece en by_sector (pero sí puede en by_label)', () => {
    const stock = asset({ id: 'msft', class: 'Acción', sector: 'Tecnología' });
    const bond = asset({ id: 'cetes', class: 'Renta Fija', fixed_income_type: 'discount' });
    const div = computeDiversificationView([stock, bond], [], makeView([[stock, 60]], [[bond, 40]]));

    expect(div.by_sector.every((s) => s.name !== 'Sin clasificar')).toBe(true);
    expect(div.by_sector.reduce((s, x) => s + x.value, 0)).toBe(60);
    expect(div.by_label.find((s) => s.label_id === null)!.value).toBe(100); // 60 + 40
  });

  it('maneja portafolio vacío sin error', () => {
    const div = computeDiversificationView([], [], makeView([]));
    expect(div.by_sector).toEqual([]);
    expect(div.by_label).toEqual([]);
    expect(div.unclassified_sector_count).toBe(0);
    expect(div.unclassified_label_count).toBe(0);
  });

  it('ordena las slices de mayor a menor porcentaje', () => {
    const a = asset({ id: 'a', class: 'Acción', sector: 'Salud' });
    const b = asset({ id: 'b', class: 'Acción', sector: 'Tecnología' });
    const div = computeDiversificationView([a, b], [], makeView([[a, 20], [b, 80]]));
    expect(div.by_sector[0].name).toBe('Tecnología');
    expect(div.by_sector[1].name).toBe('Salud');
  });
});
