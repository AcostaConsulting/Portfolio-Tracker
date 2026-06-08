import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../db/db';
import {
  useAssets,
  useCapability,
  useFixedIncomePositions,
  useFxRates,
  useLabels,
  useSettings,
  useSnapshots,
  useTransactions,
} from '../store/data';
import { computePortfolioView } from '../lib/selectors';
import { computeDiversificationView } from '../lib/diversification';
import { computeAlerts } from '../lib/insights';
import { detectTaxEvents } from '../lib/tax-events';
import { computeMaturityAlerts } from '../lib/fixed-income-engine';
import type { AllocationClassKey } from '../lib/portfolio-engine';
import { todayISO } from '../lib/dates';
import { formatMoney, formatPercent, formatSignedMoney } from '../lib/format';
import { exportResumenXlsx } from '../lib/export-xlsx';
import { printToPdf } from '../lib/print';
import type { AssetClass } from '../types';
import { useUi } from '../store/ui';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, Card, EmptyState, SectionTitle, SignedValue } from '../components/ui';
import { ConsultingCard } from '../components/ConsultingCard';
import { DiversificationDonut, toLabelSlices, toSectorSlices } from '../components/DiversificationChart';

const EPS = 1e-9;

// Colores por variable CSS (definidas en index.css): se adaptan al tema y
// Recharts las repinta solo al togglear, sin re-render de React.
const ALLOC_COLOR: Record<AllocationClassKey, string> = {
  cripto: 'var(--alloc-cripto)',
  accion: 'var(--alloc-accion)',
  renta_fija: 'var(--alloc-renta)',
};

const CLASS_TONE: Record<AssetClass, 'navy' | 'gold' | 'neutral'> = {
  Cripto: 'navy',
  Acción: 'neutral',
  'Renta Fija': 'gold',
};

interface Holding {
  id: string;
  ticker: string;
  name: string;
  cls: AssetClass;
  value: number;
  pnl: number;
  pct: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const txns = useTransactions() ?? [];
  const fiPositions = useFixedIncomePositions() ?? [];
  const fxRates = useFxRates() ?? [];
  const snapshots = useSnapshots() ?? [];
  const settings = useSettings();
  const setScreen = useUi((s) => s.setScreen);

  const base = settings?.base_currency ?? 'MXN';
  const targets = settings?.allocation_targets ?? { cripto: 0, accion: 0, renta_fija: 0 };
  const today = todayISO();

  const [snapMsg, setSnapMsg] = useState<string | null>(null);

  const view = useMemo(
    () => computePortfolioView(assets, txns, fiPositions, fxRates, base, targets, today),
    [assets, txns, fiPositions, fxRates, base, targets, today],
  );

  const { totals, allocation, pnlBreakdown } = view;

  // D.1 — Alertas (Pro+): panel resumen con enlace a Análisis.
  const canAlerts = useCapability('canUseAlerts');
  const alerts = useMemo(
    () => (canAlerts ? computeAlerts({ allocation: view.allocation, fixedIncome: view.fixedIncome, snapshots, today }) : []),
    [canAlerts, view.allocation, view.fixedIncome, snapshots, today],
  );

  // E.3 — Eventos fiscales (Pro+; Free ve un teaser bloqueado).
  const canTax = useCapability('canReviewCommissions');
  const taxEvents = useMemo(
    () => detectTaxEvents(txns, assets, view.ratesToBase),
    [txns, assets, view.ratesToBase],
  );

  // T3 — Vencimientos de renta fija; en el Dashboard solo se avisa de overdue/urgent.
  const urgentMaturities = useMemo(
    () =>
      computeMaturityAlerts(fiPositions, assets, today).filter(
        (a) => a.status === 'overdue' || a.status === 'urgent',
      ),
    [fiPositions, assets, today],
  );

  const holdings = useMemo<Holding[]>(() => {
    const market: Holding[] = view.marketPositions
      .filter((p) => p.marketValue > EPS)
      .map((p) => ({
        id: p.asset.id,
        ticker: p.asset.ticker,
        name: p.asset.name,
        cls: p.asset.class,
        value: p.marketValue,
        pnl: p.unrealizedPnl,
        pct: p.unrealizedPct * 100,
      }));
    const fixed: Holding[] = view.fixedIncome
      .filter((v) => v.currentValueBase > EPS)
      .map((v) => ({
        id: v.asset.id,
        ticker: v.asset.ticker,
        name: v.asset.name,
        cls: 'Renta Fija' as const,
        value: v.currentValueBase,
        pnl: v.unrealizedPnlBase,
        pct: v.investedBase > 0 ? (v.unrealizedPnlBase / v.investedBase) * 100 : 0,
      }));
    return [...market, ...fixed].sort((a, b) => b.value - a.value).slice(0, 6);
  }, [view.marketPositions, view.fixedIncome]);

  const allocData = useMemo(
    () =>
      allocation
        .filter((r) => r.marketValue > EPS)
        .map((r) => ({ key: r.key, value: r.marketValue })),
    [allocation],
  );

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        label: shortDate(s.date),
        valor: s.total_market_value,
        invertido: s.total_invested,
      })),
    [snapshots],
  );

  const hasData = holdings.length > 0 || totals.totalMarketValue > EPS;

  // S10 — Diversificación por sector y por etiqueta (solo con ≥2 activos con valor).
  const labels = useLabels() ?? [];
  const canLabels = useCapability('canUseCustomLabels');
  const div = useMemo(() => computeDiversificationView(assets, labels, view), [assets, labels, view]);
  const valuedCount =
    view.marketPositions.filter((p) => p.marketValue > EPS).length +
    view.fixedIncome.filter((v) => v.currentValueBase > EPS).length;
  const showDiversification = valuedCount >= 2;
  const sectorSlices = toSectorSlices(div, t);
  const labelSlices = toLabelSlices(div, labels, t);
  // Free/Pro sin etiquetas propias: la dona de etiquetas va bloqueada (overlay → Premium).
  const labelLocked = !canLabels && labels.length === 0;

  async function takeSnapshot() {
    await db.historical_snapshots.put({
      id: `snap-${today}`,
      date: today,
      total_invested: totals.totalInvested,
      total_market_value: totals.totalMarketValue,
      total_pnl: totals.totalPnl,
      return_pct: totals.returnPct,
    });
    setSnapMsg(t('dashboard.snapshotSaved'));
    window.setTimeout(() => setSnapMsg(null), 2500);
  }

  function exportExcel() {
    void exportResumenXlsx(view, base, txns, assets, t);
  }

  function exportPdf() {
    printToPdf(`Portafolio — Dashboard — ${today}`);
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          hasData ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={exportExcel}>
                  {t('dashboard.exportExcel')}
                </Button>
                <Button variant="secondary" onClick={exportPdf}>
                  {t('dashboard.exportPdf')}
                </Button>
                <Button variant="secondary" onClick={takeSnapshot}>
                  {t('dashboard.snapshot')}
                </Button>
              </div>
              {snapMsg ? <span className="text-xs text-gain">{snapMsg}</span> : null}
            </div>
          ) : undefined
        }
      />

      {!hasData ? (
        <EmptyState
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDesc')}
          action={<Button onClick={() => setScreen('movimientos')}>{t('dashboard.emptyAction')}</Button>}
        />
      ) : (
        <>
          {alerts.length > 0 ? (
            <button
              type="button"
              onClick={() => setScreen('analisis')}
              className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              <span>🔔 {t('dashboard.alertsCount', { count: alerts.length })}</span>
              <span className="font-medium underline">{t('dashboard.alertsView')}</span>
            </button>
          ) : null}

          {canTax ? (
            taxEvents.length > 0 ? (
              <button
                type="button"
                onClick={() => setScreen('analisis')}
                className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl border border-brand-navy/20 bg-brand-navy/5 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-brand-navy/10 dark:border-brand-navy/40 dark:bg-brand-navy/20 dark:text-slate-200"
              >
                <span>🧾 {t('dashboard.taxCount', { count: taxEvents.length })}</span>
                <span className="font-medium underline">{t('dashboard.taxView')}</span>
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={() => setScreen('analisis')}
              className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <span>🔒 {t('dashboard.taxTeaser')}</span>
              <span className="font-medium underline">{t('dashboard.taxView')}</span>
            </button>
          )}

          <ConsultingCard />

          {urgentMaturities.length > 0 ? (
            <div
              className={`mb-5 rounded-xl border px-4 py-3 ${
                urgentMaturities.some((a) => a.status === 'overdue')
                  ? 'border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10'
                  : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'
              }`}
            >
              <p className="text-sm font-semibold text-heading">⚠️ {t('maturity.alertTitle')}</p>
              <ul className="mt-2 space-y-1">
                {urgentMaturities.map((a) => (
                  <li key={a.positionId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700 dark:text-slate-200">{a.instrumentName}</span>
                    <span
                      className={`font-medium ${a.status === 'overdue' ? 'text-loss' : 'text-yellow-600 dark:text-yellow-500'}`}
                    >
                      {a.status === 'overdue'
                        ? `${t('maturity.overdue', { days: Math.abs(a.daysUntilMaturity) })} 🔴`
                        : `${t('maturity.urgentDays', { days: a.daysUntilMaturity })} 🟡`}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setScreen('renta-fija')}
                className="mt-2 text-sm font-medium text-brand-navy underline dark:text-brand-gold"
              >
                {t('maturity.viewAll')}
              </button>
            </div>
          ) : null}

          <div data-tour="dashboard" className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={t('dashboard.kpiValue')} value={formatMoney(totals.totalMarketValue, base)} />
            <Kpi label={t('dashboard.kpiInvested')} value={formatMoney(totals.totalInvested, base)} />
            <Kpi label={t('dashboard.kpiPnl')} signed={totals.totalPnl} value={formatSignedMoney(totals.totalPnl, base)} />
            <Kpi
              label={t('dashboard.kpiReturn')}
              signed={totals.totalPnl}
              value={`${totals.totalPnl >= 0 ? '+' : ''}${formatPercent(totals.returnPct)}`}
            />
          </div>

          {showDiversification ? (
            <Card className="mb-4">
              <SectionTitle>📊 {t('diversification.title')}</SectionTitle>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('diversification.by_sector')}
                  </p>
                  {sectorSlices.length > 0 ? (
                    <DiversificationDonut slices={sectorSlices} base={base} />
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      {t('diversification.no_sector')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('diversification.by_label')}
                  </p>
                  <DiversificationDonut
                    slices={labelSlices}
                    base={base}
                    locked={labelLocked}
                    lockedMsg={t('diversification.upgrade_labels')}
                  />
                </div>
              </div>
              {div.unclassified_sector_count > 0 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
                  <span className="text-amber-900 dark:text-amber-200">
                    ⚠️ {t('diversification.unclassified_hint', { count: div.unclassified_sector_count })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setScreen('activos')}
                    className="font-medium text-brand-navy underline dark:text-brand-gold"
                  >
                    {t('diversification.classify_now')}
                  </button>
                </div>
              ) : null}
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle hint={t('dashboard.allocHint')}>{t('dashboard.allocTitle')}</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocData.map((d) => ({ ...d, name: t(`allocClass.${d.key}`) }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {allocData.map((d) => (
                          <Cell key={d.key} fill={ALLOC_COLOR[d.key]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(Number(v), base)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {allocation.map((r) => (
                    <div key={r.key} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: ALLOC_COLOR[r.key] }}
                          />
                          {t(`allocClass.${r.key}`)}
                        </span>
                        <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                          {formatPercent(r.weightPct)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-[18px] text-xs text-slate-400 dark:text-slate-500">
                        <span>{t('dashboard.allocTarget', { pct: formatPercent(r.targetPct, 0) })}</span>
                        <span className="tabular-nums">{formatMoney(r.marketValue, base)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <SectionTitle
                hint={chartData.length > 0 ? t('dashboard.evolutionRecords', { count: chartData.length }) : undefined}
              >
                {t('dashboard.evolutionTitle')}
              </SectionTitle>
              {chartData.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.evolutionEmpty')}</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">{t('dashboard.evolutionEmptyHint')}</p>
                </div>
              ) : (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tickFormatter={(v) => compactNumber(Number(v))}
                      />
                      <Tooltip formatter={(v) => formatMoney(Number(v), base)} />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        stroke="var(--chart-line)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name={t('dashboard.kpiValue')}
                      />
                      <Line
                        type="monotone"
                        dataKey="invertido"
                        stroke="var(--chart-invested)"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        name={t('dashboard.kpiInvested')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle hint={t('dashboard.topHint')}>{t('dashboard.topTitle')}</SectionTitle>
              <div className="space-y-1">
                {holdings.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-heading">{h.ticker}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{h.name}</div>
                      </div>
                      <Badge tone={CLASS_TONE[h.cls]}>{t(`assetClass.${h.cls}`)}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{formatMoney(h.value, base)}</div>
                      <div className="text-xs">
                        <SignedValue value={h.pnl}>{formatSignedMoney(h.pnl, base)}</SignedValue>
                        <span className="text-slate-300 dark:text-slate-600"> · </span>
                        <SignedValue value={h.pnl}>{formatPercent(h.pct)}</SignedValue>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle hint={t('dashboard.pnlHint')}>{t('dashboard.pnlTitle')}</SectionTitle>
              <div className="space-y-1 text-sm">
                <PnlRow label={t('dashboard.pnlUnrealized')} value={pnlBreakdown.unrealized} base={base} />
                <PnlRow label={t('dashboard.pnlRealizedSales')} value={pnlBreakdown.realizedSales} base={base} />
                <PnlRow label={t('dashboard.pnlDividends')} value={pnlBreakdown.dividends} base={base} />
                <PnlRow label={t('dashboard.pnlInterest')} value={pnlBreakdown.interest} base={base} />
                <div className="mt-1 flex items-center justify-between border-t-2 border-slate-200 pt-2 font-medium dark:border-slate-700">
                  <span className="text-heading">{t('dashboard.pnlTotal')}</span>
                  <SignedValue value={totals.totalPnl}>{formatSignedMoney(totals.totalPnl, base)}</SignedValue>
                </div>
                {pnlBreakdown.stakingValue > EPS ? (
                  <p className="pt-2 text-xs text-slate-400 dark:text-slate-500">
                    {t('dashboard.pnlStakingNote', { value: formatMoney(pnlBreakdown.stakingValue, base) })}
                  </p>
                ) : null}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, signed }: { label: string; value: string; signed?: number }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      {signed === undefined ? (
        <p className="mt-1 text-lg font-semibold tabular-nums text-heading">{value}</p>
      ) : (
        <SignedValue value={signed} className="mt-1 block text-lg">
          {value}
        </SignedValue>
      )}
    </div>
  );
}

function PnlRow({ label, value, base }: { label: string; value: number; base: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <SignedValue value={value}>{formatSignedMoney(value, base)}</SignedValue>
    </div>
  );
}

/** 'YYYY-MM-DD' -> 'dd/MM' compacto para el eje del gráfico. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Número compacto para el eje Y (ej. 1.2k, 283k, 1.5M). */
function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}
