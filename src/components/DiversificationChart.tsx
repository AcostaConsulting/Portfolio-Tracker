// S10 — Gráficas de diversificación (presentacional, reutilizable).
// Los nombres de los slices llegan YA localizados por la pantalla (la i18n vive
// en las screens). Dashboard usa 2 donas compactas; Análisis usa dona + barras.

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { formatMoney, formatPercent } from '../lib/format';
import { type DiversificationView, UNCLASSIFIED_SECTOR } from '../lib/diversification';
import type { Label } from '../types';
import { useUi } from '../store/ui';
import { Button } from './ui';

export interface DivSlice {
  id: string;
  name: string; //        ya localizado por el caller
  value: number; //       en moneda base
  percentage: number; //  0-100
  color?: string; //      opcional (etiquetas con color); si falta, usa la paleta
}

/** Mapea las slices de sector del motor a slices de gráfica (con nombre localizado). */
export function toSectorSlices(div: DiversificationView, t: TFunction): DivSlice[] {
  return div.by_sector.map((s) => ({
    id: s.name,
    name: s.name === UNCLASSIFIED_SECTOR ? t('sectors.unclassified') : t(`sectors.${s.name}`),
    value: s.value,
    percentage: s.percentage,
  }));
}

/** Mapea las slices de etiqueta del motor a slices de gráfica (nombre + color propio). */
export function toLabelSlices(div: DiversificationView, labels: Label[], t: TFunction): DivSlice[] {
  const byId = new Map(labels.map((l) => [l.id, l]));
  return div.by_label.map((s) => ({
    id: s.label_id ?? '__unlabeled__',
    name: s.label_id === null ? t('labels.unlabeled') : s.label_name,
    value: s.value,
    percentage: s.percentage,
    color: s.label_id ? byId.get(s.label_id)?.color : undefined,
  }));
}

/** Paleta para slices sin color propio (brand-navy/gold + acentos distinguibles). */
const PALETTE = [
  '#1F3864', '#0EA5E9', '#16A34A', '#F59E0B', '#8B5CF6',
  '#14B8A6', '#DC2626', '#64748B', '#A855F7', '#F0CDA1',
];

function colorFor(slice: DivSlice, i: number): string {
  return slice.color ?? PALETTE[i % PALETTE.length];
}

/** Dona + leyenda. Opcional: monto por slice y overlay de bloqueo (etiquetas Free/Pro). */
export function DiversificationDonut({
  slices,
  base,
  showValue = false,
  locked = false,
  lockedMsg,
}: {
  slices: DivSlice[];
  base: string;
  showValue?: boolean;
  locked?: boolean;
  lockedMsg?: string;
}) {
  const { t } = useTranslation();
  const openLicenseModal = useUi((s) => s.openLicenseModal);

  return (
    <div className="relative">
      <div className="grid gap-3 sm:grid-cols-[140px_1fr] sm:items-center">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={slices} dataKey="value" nameKey="name" innerRadius={38} outerRadius={64} paddingAngle={2} stroke="none">
                {slices.map((s, i) => (
                  <Cell key={s.id} fill={colorFor(s, i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(Number(v), base)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5">
          {slices.map((s, i) => (
            <li key={s.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(s, i) }} />
                  <span className="truncate">{s.name}</span>
                </span>
                <span className="shrink-0 tabular-nums font-medium text-slate-800 dark:text-slate-100">
                  {formatPercent(s.percentage)}
                </span>
              </div>
              {showValue ? (
                <div className="pl-[18px] text-xs tabular-nums text-slate-400 dark:text-slate-500">
                  {formatMoney(s.value, base)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/80 px-4 text-center backdrop-blur-[1px] dark:bg-slate-800/80">
          <span className="text-xl" aria-hidden="true">🔒</span>
          <p className="max-w-[15rem] text-sm font-medium text-heading">{lockedMsg}</p>
          <Button onClick={openLicenseModal}>{t('paywall.upgrade')}</Button>
        </div>
      ) : null}
    </div>
  );
}

/** Barras horizontales (Recharts). El eje es el porcentaje; el tooltip, el monto. */
export function DiversificationBars({ slices, base }: { slices: DivSlice[]; base: string }) {
  const data = slices.map((s, i) => ({ ...s, fill: colorFor(s, i) }));
  const height = Math.max(120, data.length * 40);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatPercent(Number(v), 0)}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const slice = (item as { payload?: DivSlice }).payload;
              return [`${formatPercent(Number(value))} · ${formatMoney(slice?.value ?? 0, base)}`, ''];
            }}
          />
          <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
