// S10 — Motor PURO de diversificación (sin React ni Dexie).
// Agrupa el valor de mercado del portafolio en dos capas independientes:
//   • by_sector  — por `Asset.sector` (lista fija). La RENTA FIJA NO participa
//                  (no tiene sector); las acciones/cripto sin sector caen en
//                  "Sin clasificar".
//   • by_label   — por `Asset.label_ids` (etiquetas libres). Un activo con N
//                  etiquetas suma su valor en las N slices; los activos sin
//                  etiqueta caen en "Sin etiqueta". TODAS las clases participan.
//
// Los valores en moneda base vienen de una PortfolioView ya calculada
// (computePortfolioView): mercado en `marketPositions`, RF en `fixedIncome`.

import type { Asset, Label } from '../types';
import type { PortfolioView } from './selectors';

/** Valor de los slices "sin clasificar / sin etiqueta" (claves estables, no UI). */
export const UNCLASSIFIED_SECTOR = 'Sin clasificar';
export const UNLABELED = 'Sin etiqueta';

export interface SectorSlice {
  name: string; //        nombre del sector o "Sin clasificar"
  value: number; //       valor total en moneda base
  percentage: number; //  0-100
  asset_count: number;
}

export interface LabelSlice {
  label_id: string | null; // null = "Sin etiqueta"
  label_name: string;
  value: number;
  percentage: number;
  asset_count: number;
}

export interface DiversificationView {
  by_sector: SectorSlice[]; //         incluye "Sin clasificar" si aplica
  by_label: LabelSlice[]; //           incluye "Sin etiqueta" si aplica
  unclassified_sector_count: number; // acciones/cripto con valor sin sector
  unclassified_label_count: number; //  activos con valor sin etiqueta
}

/** Mapa asset_id -> valor de mercado en base, tomado de la vista ya calculada. */
function valueByAssetId(view: PortfolioView): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of view.marketPositions) map.set(p.asset.id, p.marketValue);
  for (const v of view.fixedIncome) map.set(v.asset.id, v.currentValueBase);
  return map;
}

export function computeDiversificationView(
  assets: Asset[],
  labels: Label[],
  portfolioView: PortfolioView,
): DiversificationView {
  const values = valueByAssetId(portfolioView);
  const labelNameById = new Map(labels.map((l) => [l.id, l.name]));

  // --- by_sector: solo acciones/cripto con valor > 0 -----------------------
  const sectorAgg = new Map<string, { value: number; count: number }>();
  let unclassifiedSectorCount = 0;
  for (const a of assets) {
    if (a.class === 'Renta Fija') continue; // la RF no tiene sector
    const value = values.get(a.id) ?? 0;
    if (value <= 0) continue;
    const key = a.sector ?? UNCLASSIFIED_SECTOR;
    if (key === UNCLASSIFIED_SECTOR) unclassifiedSectorCount += 1;
    const cur = sectorAgg.get(key) ?? { value: 0, count: 0 };
    cur.value += value;
    cur.count += 1;
    sectorAgg.set(key, cur);
  }
  const sectorTotal = [...sectorAgg.values()].reduce((s, x) => s + x.value, 0);
  const by_sector: SectorSlice[] = [...sectorAgg.entries()]
    .map(([name, { value, count }]) => ({
      name,
      value,
      asset_count: count,
      percentage: sectorTotal > 0 ? (value / sectorTotal) * 100 : 0,
    }))
    .sort((x, y) => y.percentage - x.percentage);

  // --- by_label: todas las clases; un activo con N etiquetas cuenta N veces --
  const labelAgg = new Map<string | null, { name: string; value: number; count: number }>();
  let unclassifiedLabelCount = 0;
  let labelTotal = 0;
  for (const a of assets) {
    const value = values.get(a.id) ?? 0;
    if (value <= 0) continue;
    const ids = (a.label_ids ?? []).filter((id) => labelNameById.has(id));
    if (ids.length === 0) {
      const cur = labelAgg.get(null) ?? { name: UNLABELED, value: 0, count: 0 };
      cur.value += value;
      cur.count += 1;
      labelAgg.set(null, cur);
      labelTotal += value;
      unclassifiedLabelCount += 1;
    } else {
      for (const id of ids) {
        const cur = labelAgg.get(id) ?? { name: labelNameById.get(id)!, value: 0, count: 0 };
        cur.value += value;
        cur.count += 1;
        labelAgg.set(id, cur);
        labelTotal += value; // doble conteo intencional: cada slice es su parte del total etiquetado
      }
    }
  }
  const by_label: LabelSlice[] = [...labelAgg.entries()]
    .map(([label_id, { name, value, count }]) => ({
      label_id,
      label_name: name,
      value,
      asset_count: count,
      percentage: labelTotal > 0 ? (value / labelTotal) * 100 : 0,
    }))
    .sort((x, y) => y.percentage - x.percentage);

  return {
    by_sector,
    by_label,
    unclassified_sector_count: unclassifiedSectorCount,
    unclassified_label_count: unclassifiedLabelCount,
  };
}
