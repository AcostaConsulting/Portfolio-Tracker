import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAssets, useFixedIncomePositions, useFxRates, useSettings, useTransactions } from '../store/data';
import { computePortfolioView } from '../lib/selectors';
import type { PositionSummary } from '../lib/portfolio-engine';
import { todayISO } from '../lib/dates';
import { formatMoney, formatPercent, formatQty, formatSignedMoney } from '../lib/format';
import type { AssetClass } from '../types';
import { useUi } from '../store/ui';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, Card, EmptyState, Select, SignedValue, TextInput } from '../components/ui';
import { ASSET_CLASSES } from '../lib/labels';

const CLASS_TONE: Record<AssetClass, 'navy' | 'gold' | 'neutral'> = {
  Cripto: 'navy',
  Acción: 'neutral',
  'Renta Fija': 'gold',
};

const EPS = 1e-9;

export default function Posiciones() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const txns = useTransactions() ?? [];
  const fiPositions = useFixedIncomePositions() ?? [];
  const fxRates = useFxRates() ?? [];
  const settings = useSettings();
  const setScreen = useUi((s) => s.setScreen);

  // T2 — filtros (estado local, en memoria).
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [gainFilter, setGainFilter] = useState<'all' | 'gain' | 'loss' | 'neutral'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilter = search.trim() !== '' || filterClass !== 'all' || gainFilter !== 'all';
  function clearFilters() {
    setSearch('');
    setFilterClass('all');
    setGainFilter('all');
  }

  const base = settings?.base_currency ?? 'MXN';
  const targets = settings?.allocation_targets ?? { cripto: 0, accion: 0, renta_fija: 0 };
  const today = todayISO();

  const view = useMemo(
    () => computePortfolioView(assets, txns, fiPositions, fxRates, base, targets, today),
    [assets, txns, fiPositions, fxRates, base, targets, today],
  );

  const positions = useMemo(
    () =>
      view.marketPositions
        .filter(
          (p) =>
            Math.abs(p.qtyNet) > EPS ||
            Math.abs(p.realizedPnlTotal) > EPS ||
            Math.abs(p.totalCostBase) > EPS,
        )
        .sort((a, b) => b.marketValue - a.marketValue),
    [view.marketPositions],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return positions.filter((p) => {
      if (filterClass !== 'all' && p.asset.class !== filterClass) return false;
      if (gainFilter === 'gain' && !(p.unrealizedPnl > EPS)) return false;
      if (gainFilter === 'loss' && !(p.unrealizedPnl < -EPS)) return false;
      if (gainFilter === 'neutral' && Math.abs(p.unrealizedPnl) > EPS) return false;
      if (q && !`${p.asset.ticker} ${p.asset.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [positions, search, filterClass, gainFilter]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, p) => ({
          invested: acc.invested + p.avgCost * p.qtyNet,
          mv: acc.mv + p.marketValue,
          unreal: acc.unreal + p.unrealizedPnl,
          realized: acc.realized + p.realizedPnlTotal,
        }),
        { invested: 0, mv: 0, unreal: 0, realized: 0 },
      ),
    [visible],
  );

  const rfTotal = view.fixedIncome.reduce((a, v) => a + v.currentValueBase, 0);
  const hasRf = view.fixedIncome.length > 0;

  return (
    <div>
      <PageHeader title={t('posiciones.title')} subtitle={t('posiciones.subtitle')} />

      {positions.length === 0 ? (
        <EmptyState
          title={t('posiciones.emptyTitle')}
          description={t('posiciones.emptyDesc')}
          action={<Button onClick={() => setScreen('movimientos')}>{t('posiciones.emptyAction')}</Button>}
        />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t('posiciones.statMv')} value={formatMoney(totals.mv, base)} />
            <Stat label={t('posiciones.statCost')} value={formatMoney(totals.invested, base)} />
            <Stat label={t('posiciones.statUnreal')} signed={totals.unreal} value={formatSignedMoney(totals.unreal, base)} />
            <Stat label={t('posiciones.statRealized')} signed={totals.realized} value={formatSignedMoney(totals.realized, base)} />
          </div>

          {/* T2 — Filtros (colapsable) */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" className="text-xs" onClick={() => setShowFilters((v) => !v)}>
                {showFilters ? '▴' : '▾'} {t('filters.filterBy')}
              </Button>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {hasActiveFilter
                  ? t('filters.showingOf', { shown: visible.length, total: positions.length })
                  : t('filters.showingCount', { count: positions.length })}
              </span>
            </div>
            {showFilters ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('filters.search')}</span>
                  <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('filters.searchPlaceholder')} />
                </div>
                <div className="w-40">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('filters.assetClass')}</span>
                  <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                    <option value="all">{t('filters.allClasses')}</option>
                    {ASSET_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {t(`assetClass.${c}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-44">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('filters.gainLoss')}</span>
                  <Select value={gainFilter} onChange={(e) => setGainFilter(e.target.value as typeof gainFilter)}>
                    <option value="all">{t('filters.allPositions')}</option>
                    <option value="gain">{t('filters.withGain')}</option>
                    <option value="loss">{t('filters.withLoss')}</option>
                    <option value="neutral">{t('filters.neutral')}</option>
                  </Select>
                </div>
                {hasActiveFilter ? (
                  <Button variant="ghost" className="text-xs" onClick={clearFilters}>
                    {t('filters.clear')}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card>
            {visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('filters.noResults')}</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <th className="py-2 pr-3">{t('posiciones.colAsset')}</th>
                    <th className="py-2 pr-3 text-right">{t('posiciones.colQty')}</th>
                    <th className="py-2 pr-3 text-right">{t('posiciones.colAvgCost')}</th>
                    <th className="py-2 pr-3 text-right">{t('posiciones.colPrice')}</th>
                    <th className="py-2 pr-3 text-right">{t('posiciones.colValue')}</th>
                    <th className="py-2 pl-3 text-right">{t('posiciones.colUnrealized')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <PositionRow key={p.asset.id} p={p} base={base} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-medium dark:border-slate-700">
                    <td className="py-2 pr-3 text-heading">{t('posiciones.total')}</td>
                    <td className="py-2 pr-3"></td>
                    <td className="py-2 pr-3"></td>
                    <td className="py-2 pr-3"></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">
                      {formatMoney(totals.mv, base)}
                    </td>
                    <td className="py-2 pl-3 text-right">
                      <SignedValue value={totals.unreal}>{formatSignedMoney(totals.unreal, base)}</SignedValue>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
          </Card>

          {hasRf ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                {t('posiciones.rfNote', { value: formatMoney(rfTotal, base) })}
              </p>
              <Button variant="secondary" onClick={() => setScreen('renta-fija')}>
                {t('posiciones.rfNoteAction')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, signed }: { label: string; value: string; signed?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
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

function PositionRow({ p, base }: { p: PositionSummary; base: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pctScaled = p.unrealizedPct * 100;

  const detail: Array<{ label: string; node: ReactNode }> = [
    { label: t('posiciones.detailAvgBuy'), node: formatMoney(p.avgCost, base) },
    { label: t('posiciones.detailCostHeld'), node: formatMoney(p.avgCost * p.qtyNet, base) },
  ];
  if (Math.abs(p.realizedSalesPnl) > EPS) {
    detail.push({
      label: t('posiciones.detailRealizedSales'),
      node: <SignedValue value={p.realizedSalesPnl}>{formatSignedMoney(p.realizedSalesPnl, base)}</SignedValue>,
    });
  }
  if (p.dividendsIncome > EPS) {
    detail.push({ label: t('posiciones.detailDividends'), node: formatMoney(p.dividendsIncome, base) });
  }
  if (p.interestIncome > EPS) {
    detail.push({ label: t('posiciones.detailInterest'), node: formatMoney(p.interestIncome, base) });
  }
  if (p.stakingQty > EPS) {
    detail.push({
      label: t('posiciones.detailStaking'),
      node: `${formatQty(p.stakingQty)} · ${formatMoney(p.stakingValue, base)}`,
    });
  }

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 dark:text-slate-600">{open ? '▾' : '▸'}</span>
            <div>
              <div className="font-medium text-heading">{p.asset.ticker}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{p.asset.name}</div>
            </div>
            <Badge tone={CLASS_TONE[p.asset.class]}>{t(`assetClass.${p.asset.class}`)}</Badge>
          </div>
        </td>
        <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatQty(p.qtyNet)}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatMoney(p.avgCost, base)}</td>
        <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">{formatMoney(p.priceInBase, base)}</td>
        <td className="py-2 pr-3 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
          {formatMoney(p.marketValue, base)}
        </td>
        <td className="py-2 pl-3 text-right">
          <SignedValue value={p.unrealizedPnl}>{formatSignedMoney(p.unrealizedPnl, base)}</SignedValue>
          <div className="text-xs">
            <SignedValue value={p.unrealizedPnl}>{formatPercent(pctScaled)}</SignedValue>
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              {detail.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{d.label}</span>
                  <span className="tabular-nums text-slate-800 dark:text-slate-100">{d.node}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
