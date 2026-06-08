import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { db } from '../db/db';
import {
  useAssets,
  useCapabilities,
  useFixedIncomePositions,
  useFxRates,
  useGoals,
  useLabels,
  useRatesToBase,
  useSettings,
  useSnapshots,
  useTransactions,
} from '../store/data';
import { computePortfolioView } from '../lib/selectors';
import { computeDiversificationView } from '../lib/diversification';
import {
  computeAlerts,
  computeCommissions,
  computeLiquiditySuggestions,
  computeRebalance,
  type Alert,
} from '../lib/insights';
import { computeGoalProgress } from '../lib/goals';
import { detectTaxEvents } from '../lib/tax-events';
import { openExternal } from '../lib/external';
import { todayISO } from '../lib/dates';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import type { Goal } from '../types';
import { PageHeader } from '../components/PageHeader';
import { UpgradeLock } from '../components/UpgradeLock';
import {
  DiversificationBars,
  DiversificationDonut,
  toLabelSlices,
  toSectorSlices,
} from '../components/DiversificationChart';
import { Button, Card, Field, SectionTitle, TextInput, cn } from '../components/ui';

// E.2 — Enlaces del asesor (Odoo). Se abren con allowlist (lib/external).
const ODOO_APPOINTMENT = 'https://franscisco-acosta.odoo.com/appointment/3';
const ODOO_CONTACT = 'https://franscisco-acosta.odoo.com/contactus';

export default function Analisis() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const txns = useTransactions() ?? [];
  const fiPositions = useFixedIncomePositions() ?? [];
  const fxRates = useFxRates() ?? [];
  const snapshots = useSnapshots() ?? [];
  const goals = useGoals() ?? [];
  const settings = useSettings();
  const caps = useCapabilities();
  const ratesToBase = useRatesToBase();
  const base = settings?.base_currency ?? 'MXN';
  const targets = settings?.allocation_targets ?? { cripto: 0, accion: 0, renta_fija: 0 };
  const today = todayISO();

  const view = useMemo(
    () => computePortfolioView(assets, txns, fiPositions, fxRates, base, targets, today),
    [assets, txns, fiPositions, fxRates, base, targets, today],
  );

  const alerts = useMemo(
    () => computeAlerts({ allocation: view.allocation, fixedIncome: view.fixedIncome, snapshots, today }),
    [view, snapshots, today],
  );
  const commissions = useMemo(
    () => computeCommissions(txns, ratesToBase, view.totals.totalInvested),
    [txns, ratesToBase, view.totals.totalInvested],
  );
  const liquidity = useMemo(() => computeLiquiditySuggestions(view.fixedIncome, today), [view.fixedIncome, today]);
  const rebalance = useMemo(
    () => computeRebalance(view.allocation, view.totals.totalMarketValue),
    [view.allocation, view.totals.totalMarketValue],
  );
  const rebalanceMoves = rebalance.filter((r) => r.action !== 'hold');

  // E.1 — Eventos fiscales (Pro+). Solo describe; el botón dirige al asesor humano.
  const taxEvents = useMemo(() => detectTaxEvents(txns, assets, ratesToBase), [txns, assets, ratesToBase]);
  const isPro = caps.canUseAlerts; // cualquier capacidad Pro+ sirve de gate

  // S10 — Diversificación (sector = todos los planes; etiquetas = Premium+).
  const labels = useLabels() ?? [];
  const div = useMemo(() => computeDiversificationView(assets, labels, view), [assets, labels, view]);
  const sectorSlices = toSectorSlices(div, t);
  const labelSlices = toLabelSlices(div, labels, t);
  const labelLocked = !caps.canUseCustomLabels && labels.length === 0;
  const hasValues = view.totals.totalMarketValue > 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t('analisis.title')} subtitle={t('analisis.subtitle')} />

      {/* S10 — Diversificación por sector (disponible en todos los planes) */}
      <Card>
        <SectionTitle>📊 {t('diversification.sectorSection')}</SectionTitle>
        {sectorSlices.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasValues ? t('diversification.no_sector') : t('diversification.no_data')}
          </p>
        ) : (
          <div className="space-y-4">
            <DiversificationDonut slices={sectorSlices} base={base} showValue />
            <DiversificationBars slices={sectorSlices} base={base} />
            {div.unclassified_sector_count > 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ {t('diversification.unclassified_hint', { count: div.unclassified_sector_count })}
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {/* S10 — Diversificación por etiqueta (etiquetas personalizadas: Premium+) */}
      <Card>
        <SectionTitle>🏷️ {t('diversification.labelSection')}</SectionTitle>
        {labelSlices.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('diversification.no_data')}</p>
        ) : (
          <div className="space-y-4">
            <DiversificationDonut
              slices={labelSlices}
              base={base}
              showValue
              locked={labelLocked}
              lockedMsg={t('diversification.upgrade_labels')}
            />
            {!labelLocked ? <DiversificationBars slices={labelSlices} base={base} /> : null}
          </div>
        )}
      </Card>

      {/* D.1 — Alertas (Pro+) */}
      <Card>
        <SectionTitle hint={caps.canUseAlerts ? t('analisis.alertsCount', { count: alerts.length }) : t('paywall.needPro')}>
          {t('analisis.alertsTitle')}
        </SectionTitle>
        {!caps.canUseAlerts ? (
          <UpgradeLock capability="canUseAlerts" requiredTier="pro" />
        ) : alerts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.alertsEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <AlertRow key={a.id} a={a} t={t} />
            ))}
          </div>
        )}
      </Card>

      {/* D.2 — Revisión de comisiones (Pro+) */}
      <Card>
        <SectionTitle>{t('analisis.commissionsTitle')}</SectionTitle>
        {!caps.canReviewCommissions ? (
          <UpgradeLock capability="canReviewCommissions" requiredTier="pro" />
        ) : commissions.rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.commissionsEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <th className="py-2 pr-3">{t('analisis.colPlatform')}</th>
                  <th className="py-2 pr-3 text-right">{t('analisis.colCount')}</th>
                  <th className="py-2 pr-3 text-right">{t('analisis.colTotal', { base })}</th>
                </tr>
              </thead>
              <tbody>
                {commissions.rows.map((r) => (
                  <tr key={r.platform} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
                    <td className="py-2 pr-3 font-medium text-heading">{r.platform}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{r.txCount}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-800 dark:text-slate-100">{formatMoney(r.totalBase, base)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {t('analisis.commTotal', { value: formatMoney(commissions.totalBase, base) })} ·{' '}
              {t('analisis.commImplied', { pct: formatPercent(commissions.impliedPct) })}
            </p>
          </div>
        )}
      </Card>

      {/* D.3 — Sugerencia de liquidez (Pro+) */}
      <Card>
        <SectionTitle>{t('analisis.liquidityTitle')}</SectionTitle>
        {!caps.canSuggestLiquidity ? (
          <UpgradeLock capability="canSuggestLiquidity" requiredTier="pro" />
        ) : liquidity.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.liquidityEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {liquidity.map((s) => (
              <div key={s.ticker} className="rounded-lg bg-brand-gold/15 px-3 py-2 text-sm text-amber-900 dark:bg-brand-gold/10 dark:text-amber-200">
                {t('analisis.liquiditySuggest', { ticker: s.ticker, days: s.days, value: formatMoney(s.valueBase, base) })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* E — Eventos fiscales para revisar con asesor (Pro+) */}
      <Card>
        <SectionTitle hint={isPro ? t('tax.count', { count: taxEvents.length }) : t('paywall.needPro')}>
          {t('tax.title')}
        </SectionTitle>
        {!isPro ? (
          <UpgradeLock capability="canReviewCommissions" requiredTier="pro" />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t('tax.intro')}</p>
            {taxEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('tax.empty')}</p>
            ) : (
              <div className="space-y-2">
                {taxEvents.slice(0, 30).map((e) => (
                  <div
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                  >
                    <div>
                      <span className="font-medium text-heading">{t(`tax.type.${e.type}`)}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        · {e.ticker} · {formatDate(e.date)}
                      </span>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {formatMoney(e.amountBase, base)} · {t('tax.review')}
                      </div>
                    </div>
                    <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openExternal(ODOO_APPOINTMENT)}>
                      {t('tax.consult')} ↗
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => openExternal(ODOO_APPOINTMENT)}>
                {t('tax.bookAppointment')} ↗
              </Button>
              <button
                type="button"
                onClick={() => openExternal(ODOO_CONTACT)}
                className="text-sm text-brand-navy underline dark:text-brand-gold"
              >
                {t('tax.contact')} ↗
              </button>
            </div>
          </>
        )}
      </Card>

      {/* D.6 — Detección de rebalanceo (Premium+) */}
      <Card>
        <SectionTitle hint={t('analisis.rebalanceInfo')}>{t('analisis.rebalanceTitle')}</SectionTitle>
        {!caps.canUseRebalancing ? (
          <UpgradeLock capability="canUseRebalancing" requiredTier="premium" />
        ) : view.totals.totalMarketValue <= 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.rebalanceEmpty')}</p>
        ) : rebalanceMoves.length === 0 ? (
          <p className="text-sm text-gain">{t('analisis.rebalanceBalanced')}</p>
        ) : (
          <div className="space-y-2">
            {rebalanceMoves.map((r) => (
              <div key={r.key} className="text-sm text-slate-700 dark:text-slate-200">
                {t(r.action === 'buy' ? 'analisis.rebalanceBuy' : 'analisis.rebalanceSell', {
                  amount: formatMoney(r.amountBase, base),
                  class: t(`allocClass.${r.key}`),
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* D.4 — Benchmarks (Premium+) */}
      <Card>
        <SectionTitle hint={t('analisis.benchHint')}>{t('analisis.benchmarksTitle')}</SectionTitle>
        {!caps.canUseBenchmarks ? (
          <UpgradeLock capability="canUseBenchmarks" requiredTier="premium" />
        ) : (
          <BenchmarksSection portfolioReturn={view.totals.returnPct} hasData={view.totals.totalInvested > 0} t={t} />
        )}
      </Card>

      {/* D.5 — Metas financieras (Premium+) */}
      <Card>
        <SectionTitle hint={t('analisis.goalsDisclaimer')}>{t('analisis.goalsTitle')}</SectionTitle>
        {!caps.canUseGoals ? (
          <UpgradeLock capability="canUseGoals" requiredTier="premium" />
        ) : (
          <GoalsSection goals={goals} currentValue={view.totals.totalMarketValue} base={base} today={today} t={t} />
        )}
      </Card>
    </div>
  );
}

function AlertRow({ a, t }: { a: Alert; t: TFunction }) {
  const params: Record<string, string | number> = { ...(a.params ?? {}) };
  if (typeof params.class === 'string') params.class = t(`allocClass.${params.class}`);
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 text-sm',
        a.severity === 'warn'
          ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200',
      )}
    >
      {t(`alerts.${a.code}`, params)}
    </div>
  );
}

function BenchmarksSection({
  portfolioReturn,
  hasData,
  t,
}: {
  portfolioReturn: number;
  hasData: boolean;
  t: TFunction;
}) {
  const [sp, setSp] = useState('');
  const [btc, setBtc] = useState('');
  const [cetes, setCetes] = useState('');

  if (!hasData) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.benchmarksEmpty')}</p>;
  }

  const data = [
    { name: t('analisis.benchPortfolio'), value: Math.round(portfolioReturn * 100) / 100, me: true },
    { name: t('analisis.benchSp'), value: sp === '' ? null : Number(sp) },
    { name: t('analisis.benchBtc'), value: btc === '' ? null : Number(btc) },
    { name: t('analisis.benchCetes'), value: cetes === '' ? null : Number(cetes) },
  ].filter((d) => d.value != null && Number.isFinite(d.value)) as Array<{ name: string; value: number; me?: boolean }>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t('analisis.benchYourReturn', { pct: formatPercent(portfolioReturn) })}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('analisis.benchSp')}>
          <TextInput type="number" step="0.1" value={sp} onChange={(e) => setSp(e.target.value)} placeholder="%" />
        </Field>
        <Field label={t('analisis.benchBtc')}>
          <TextInput type="number" step="0.1" value={btc} onChange={(e) => setBtc(e.target.value)} placeholder="%" />
        </Field>
        <Field label={t('analisis.benchCetes')}>
          <TextInput type="number" step="0.1" value={cetes} onChange={(e) => setCetes(e.target.value)} placeholder="%" />
        </Field>
      </div>
      {data.length > 1 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={false} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} className="fill-slate-500 text-xs" />
                {data.map((d, i) => (
                  <Cell key={i} fill={d.me ? 'var(--chart-line)' : 'var(--chart-invested)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

function GoalsSection({
  goals,
  currentValue,
  base,
  today,
  t,
}: {
  goals: Goal[];
  currentValue: number;
  base: string;
  today: string;
  t: TFunction;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');

  async function addGoal() {
    const amount = Number(target);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) return;
    await db.goals.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      target_amount: amount,
      target_date: date || undefined,
      created_at: today,
    });
    setName('');
    setTarget('');
    setDate('');
  }

  async function removeGoal(g: Goal) {
    if (!window.confirm(t('analisis.goalConfirmDelete', { name: g.name }))) return;
    await db.goals.delete(g.id);
  }

  return (
    <div className="space-y-4">
      {goals.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('analisis.goalsEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const p = computeGoalProgress(g, currentValue, today);
            return (
              <div key={g.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-heading">{g.name}</span>
                  <button
                    type="button"
                    onClick={() => void removeGoal(g)}
                    className="text-xs text-slate-400 hover:text-loss"
                  >
                    {t('common.delete')}
                  </button>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={cn('h-full rounded-full', p.onTrack === false ? 'bg-loss' : 'bg-gain')}
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatMoney(currentValue, base)} / {formatMoney(g.target_amount, base)} ({formatPercent(p.pct)})
                  </span>
                  {p.daysLeft != null ? (
                    <span className={p.onTrack === false ? 'text-loss' : 'text-gain'}>
                      {p.onTrack === false ? t('analisis.goalBehind') : t('analisis.goalOnTrack')} ·{' '}
                      {t('analisis.goalDaysLeft', { days: Math.max(0, p.daysLeft) })}
                    </span>
                  ) : null}
                </div>
                {p.requiredPerMonth != null && p.remaining > 0 ? (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {t('analisis.goalRequiredMonth', { amount: formatMoney(p.requiredPerMonth, base) })}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('analisis.goalName')}>
            <TextInput value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t('analisis.goalNamePlaceholder')} />
          </Field>
          <Field label={t('analisis.goalTarget', { base })}>
            <TextInput type="number" min={0} step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label={t('analisis.goalDate')}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Button className="mt-3" onClick={() => void addGoal()} disabled={!name.trim() || !(Number(target) > 0)}>
          {t('analisis.goalAdd')}
        </Button>
      </div>
    </div>
  );
}
