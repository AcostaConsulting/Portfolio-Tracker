import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import {
  useAssets,
  useFixedIncomePositions,
  useFxRates,
  useRatesToBase,
  useSettings,
  useTier,
  useTransactions,
} from '../store/data';
import { computeFixedIncomeView, netContributionsLocal, type FixedIncomeView } from '../lib/selectors';
import {
  ISR_WITHHOLDING_RATE,
  computeMaturityAlerts,
  type MaturityAlert,
  type MaturityStatus,
} from '../lib/fixed-income-engine';
import { todayISO } from '../lib/dates';
import { formatDate, formatMoney, formatPercent, formatSignedMoney } from '../lib/format';
import { FI_TYPES, FI_TYPES_REQUIRING_PRO, FREQUENCIES, RF_INSTITUTIONS } from '../lib/labels';
import type { Asset, CouponFrequency, FixedIncomePosition, FixedIncomeType, Transaction } from '../types';
import { useUi } from '../store/ui';
import { PageHeader } from '../components/PageHeader';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Select,
  Textarea,
  TextInput,
} from '../components/ui';

function num(s: string): number {
  if (s.trim() === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Cupones (fecha de pago) ya transcurridos que aún no tienen una transacción de Interés. */
function unrecordedPaidCoupons(view: FixedIncomeView, txns: Transaction[]): string[] {
  let paid: string[] = [];
  if (view.detail.kind === 'fixed_rate_coupon' || view.detail.kind === 'inflation_linked') {
    paid = view.detail.result.paidCoupons;
  }
  if (paid.length === 0) return [];
  const recorded = new Set(
    txns.filter((t) => t.asset_id === view.asset.id && t.type === 'Interés').map((t) => t.date),
  );
  return paid.filter((d) => !recorded.has(d));
}

function couponPerPayment(view: FixedIncomeView): number {
  if (view.detail.kind === 'fixed_rate_coupon' || view.detail.kind === 'inflation_linked') {
    return view.detail.result.couponPerPayment;
  }
  return 0;
}

// T3 — Presentación de los estados de vencimiento (emoji + color + texto).
const MATURITY_EMOJI: Record<MaturityStatus, string> = {
  overdue: '🔴',
  urgent: '🟡',
  upcoming: '🟠',
  ok: '🟢',
};
const MATURITY_COLOR: Record<MaturityStatus, string> = {
  overdue: 'text-loss',
  urgent: 'text-yellow-600 dark:text-yellow-500',
  upcoming: 'text-orange-500',
  ok: 'text-gain',
};
function maturityLabel(t: TFunction, a: MaturityAlert): string {
  if (a.status === 'overdue') return t('maturity.overdue', { days: Math.abs(a.daysUntilMaturity) });
  if (a.status === 'urgent') return t('maturity.urgentDays', { days: a.daysUntilMaturity });
  return t('maturity.upcomingDays', { days: a.daysUntilMaturity });
}

export default function RentaFija() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const txns = useTransactions() ?? [];
  const fiPositions = useFixedIncomePositions() ?? [];
  const fxRates = useFxRates() ?? [];
  const settings = useSettings();
  const ratesToBase = useRatesToBase();
  const setScreen = useUi((s) => s.setScreen);

  const base = settings?.base_currency ?? 'MXN';
  const today = todayISO();

  const rfAssets = useMemo(
    () =>
      assets
        .filter((a) => a.class === 'Renta Fija')
        .sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [assets],
  );
  const posByAsset = useMemo(() => new Map(fiPositions.map((p) => [p.asset_id, p])), [fiPositions]);

  const views = useMemo(() => {
    const map = new Map<string, FixedIncomeView>();
    for (const a of rfAssets) {
      const pos = posByAsset.get(a.id);
      if (pos) map.set(a.id, computeFixedIncomeView(pos, a, txns, ratesToBase, today));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfAssets, posByAsset, txns, fxRates, settings, today]);

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    let pnl = 0;
    let coupons = 0;
    for (const v of views.values()) {
      invested += v.investedBase;
      current += v.currentValueBase;
      pnl += v.unrealizedPnlBase;
      coupons += v.realizedIncomeBase;
    }
    return { invested, current, pnl, coupons };
  }, [views]);

  // T3 — Alertas de vencimiento (todas las posiciones con fecha de vencimiento).
  const maturityAlerts = useMemo(
    () => computeMaturityAlerts(fiPositions, assets, today),
    [fiPositions, assets, today],
  );

  const [editing, setEditing] = useState<{ asset: Asset; position: FixedIncomePosition | null } | null>(
    null,
  );

  async function registerCoupon(view: FixedIncomeView, date: string, amount: number) {
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date,
      asset_id: view.asset.id,
      type: 'Interés',
      quantity: 0,
      price_per_unit: amount,
      operation_currency: view.currency,
      fx_rate: ratesToBase[view.currency] ?? 1,
      commission: 0,
      withholding: 0,
      notes: t('rentaFija.couponNote'),
    };
    await db.transactions.add(tx);
  }

  async function deletePosition(pos: FixedIncomePosition, ticker: string) {
    if (!window.confirm(t('rentaFija.confirmDelete', { ticker }))) {
      return;
    }
    await db.fixed_income_positions.delete(pos.id);
  }

  const hasRfAssets = rfAssets.length > 0;
  const capturedCount = views.size;

  return (
    <div>
      <PageHeader title={t('rentaFija.title')} capture subtitle={t('rentaFija.subtitle')} />

      {!hasRfAssets ? (
        <EmptyState
          title={t('rentaFija.emptyTitle')}
          description={t('rentaFija.emptyDesc')}
          action={<Button onClick={() => setScreen('activos')}>{t('rentaFija.emptyAction')}</Button>}
        />
      ) : (
        <>
          {capturedCount > 0 ? (
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label={t('rentaFija.statInvested')} value={formatMoney(totals.invested, base)} />
              <Stat label={t('rentaFija.statCurrent')} value={formatMoney(totals.current, base)} />
              <Stat label={t('rentaFija.statPnl')} signed={totals.pnl} value={formatSignedMoney(totals.pnl, base)} />
              <Stat label={t('rentaFija.statCoupons')} value={formatMoney(totals.coupons, base)} />
            </div>
          ) : null}

          {/* T3 — Próximos vencimientos (siempre visible) */}
          <Card className="mb-4">
            <h2 className="mb-3 text-lg font-semibold text-heading">{t('maturity.sectionTitle')}</h2>
            {maturityAlerts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('maturity.noMaturity')}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {maturityAlerts.map((a) => (
                  <li
                    key={a.positionId}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-700"
                  >
                    <span className="text-slate-700 dark:text-slate-200">
                      {MATURITY_EMOJI[a.status]} {a.instrumentName}
                    </span>
                    <span className={`font-medium ${MATURITY_COLOR[a.status]}`}>{maturityLabel(t, a)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-4">
            {rfAssets.map((a) => {
              const view = views.get(a.id);
              if (!view) {
                return (
                  <PendingCard
                    key={a.id}
                    asset={a}
                    onCapture={() => setEditing({ asset: a, position: null })}
                  />
                );
              }
              return (
                <FiCard
                  key={a.id}
                  view={view}
                  base={base}
                  txns={txns}
                  onEdit={() => setEditing({ asset: a, position: view.position })}
                  onDelete={() => void deletePosition(view.position, a.ticker)}
                  onRegisterCoupon={(date, amount) => void registerCoupon(view, date, amount)}
                />
              );
            })}
          </div>
        </>
      )}

      {editing ? (
        <PositionModal
          open={!!editing}
          onClose={() => setEditing(null)}
          asset={editing.asset}
          position={editing.position}
          txns={txns}
          today={today}
        />
      ) : null}
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
        <p
          className={`mt-1 text-lg font-semibold tabular-nums ${
            signed > 0 ? 'text-gain' : signed < 0 ? 'text-loss' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function PendingCard({ asset, onCapture }: { asset: Asset; onCapture: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-heading">{asset.ticker}</span>
            <Badge tone="gold">
              {asset.fixed_income_type
                ? t(`fiTypeShort.${asset.fixed_income_type}`)
                : t('rentaFija.pendingFallback')}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('rentaFija.pendingNote', { name: asset.name })}</p>
        </div>
        <Button onClick={onCapture}>{t('rentaFija.capture')}</Button>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-700">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="tabular-nums text-slate-800 dark:text-slate-100">{children}</span>
    </div>
  );
}

function FiCard({
  view,
  base,
  txns,
  onEdit,
  onDelete,
  onRegisterCoupon,
}: {
  view: FixedIncomeView;
  base: string;
  txns: Transaction[];
  onEdit: () => void;
  onDelete: () => void;
  onRegisterCoupon: (date: string, amount: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const cur = view.currency;
  const unrecorded = unrecordedPaidCoupons(view, txns);
  const perPayment = couponPerPayment(view);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-heading">{view.asset.ticker}</span>
            <Badge tone="gold">{t(`fiTypeShort.${view.type}`)}</Badge>
            {view.status ? (
              <Badge tone={view.status === 'Vigente' ? 'navy' : 'neutral'}>
                {t(`fiStatus.${view.status}`)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{view.asset.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onEdit}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" className="px-2 py-1 text-xs text-loss" onClick={onDelete}>
            {t('common.remove')}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label={t('rentaFija.miniInvested')} value={formatMoney(view.investedBase, base)} />
        <MiniStat label={t('rentaFija.miniCurrent')} value={formatMoney(view.currentValueBase, base)} />
        <MiniStat
          label={t('rentaFija.miniReturn')}
          value={formatSignedMoney(view.unrealizedPnlBase, base)}
          signed={view.unrealizedPnlBase}
        />
        <MiniStat label={t('rentaFija.miniCoupons')} value={formatMoney(view.realizedIncomeBase, base)} />
      </div>

      {unrecorded.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-gold/15 px-3 py-2">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {t('rentaFija.unrecorded', {
              count: unrecorded.length,
              date: formatDate(unrecorded[0]),
              amount: formatMoney(perPayment, cur),
            })}
          </p>
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => onRegisterCoupon(unrecorded[0], perPayment)}
          >
            {t('rentaFija.registerCoupon')}
          </Button>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 text-xs font-medium text-heading hover:underline"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? t('rentaFija.hideDetail') : t('rentaFija.showDetail')}
      </button>

      {open ? <div className="mt-2 text-sm">{renderDetail(view, t)}</div> : null}
    </Card>
  );
}

function MiniStat({ label, value, signed }: { label: string; value: string; signed?: number }) {
  const tone = signed === undefined ? 'text-slate-800 dark:text-slate-100' : signed > 0 ? 'text-gain' : signed < 0 ? 'text-loss' : 'text-slate-600 dark:text-slate-300';
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function renderDetail(view: FixedIncomeView, t: TFunction): ReactNode {
  const cur = view.currency;
  const d = view.detail;

  if (d.kind === 'discount') {
    const r = d.result;
    return (
      <div>
        <Row label={t('rentaFija.rAnnualRate')}>{formatPercent(view.position.annual_rate ?? 0)}</Row>
        <Row label={t('rentaFija.rTerm')}>{t('rentaFija.rTermDays', { days: view.position.term_days ?? 0 })}</Row>
        <Row label={t('rentaFija.rPurchaseDate')}>{formatDate(view.position.purchase_date ?? '')}</Row>
        <Row label={t('rentaFija.rMaturity')}>{formatDate(r.maturityDate)}</Row>
        <Row label={t('rentaFija.rDaysElapsedRemaining')}>
          {r.daysElapsed} / {r.daysRemaining}
        </Row>
        <Row label={t('rentaFija.rAccruedInterest')}>{formatMoney(r.accruedInterest, cur)}</Row>
        <Row label={t('rentaFija.rValueAtMaturity')}>{formatMoney(r.valueAtMaturity, cur)}</Row>
      </div>
    );
  }

  if (d.kind === 'money_market') {
    const r = d.result;
    return (
      <div>
        <Row label={t('rentaFija.rNetContrib')}>{formatMoney(r.netContributions, cur)}</Row>
        <Row label={t('rentaFija.rReportedBalance')}>{formatMoney(r.currentValue, cur)}</Row>
        <Row label={t('rentaFija.rAccruedReturn')}>{formatMoney(r.accruedReturn, cur)}</Row>
      </div>
    );
  }

  if (d.kind === 'fixed_rate_coupon') {
    const r = d.result;
    return (
      <div>
        <Row label={t('rentaFija.rFaceValue')}>{formatMoney(view.position.face_value_total ?? 0, cur)}</Row>
        <Row label={t('rentaFija.rCouponRate')}>{formatPercent(view.position.coupon_rate ?? 0)}</Row>
        <Row label={t('rentaFija.rFrequency')}>
          {view.position.coupon_frequency ? t(`freq.${view.position.coupon_frequency}`) : '—'}
        </Row>
        <Row label={t('rentaFija.rCouponPerPayment')}>{formatMoney(r.couponPerPayment, cur)}</Row>
        <Row label={t('rentaFija.rMaturity')}>{formatDate(view.position.maturity_date ?? '')}</Row>
        <Row label={t('rentaFija.rNextCoupon')}>
          {r.nextCouponDate ? formatDate(r.nextCouponDate) : t('common.noPending')}
        </Row>
        <Row label={t('rentaFija.rCouponsPaidPending')}>
          {r.paidCoupons.length} / {r.pendingCoupons.length}
        </Row>
        <Row label={t('rentaFija.rAccruedCoupons')}>{formatMoney(r.accruedCouponIncome, cur)}</Row>
      </div>
    );
  }

  // C.1 — Pagaré bancario / SoFIPO: bruto vs. neto tras retención ISR.
  if (d.kind === 'promissory_note' || d.kind === 'sofipo') {
    const r = d.result;
    return (
      <div>
        {view.position.institution ? (
          <Row label={t('rentaFija.rInstitution')}>{view.position.institution}</Row>
        ) : null}
        <Row label={t('rentaFija.rAnnualRate')}>{formatPercent(view.position.annual_rate ?? 0)}</Row>
        <Row label={t('rentaFija.rTerm')}>{t('rentaFija.rTermDays', { days: view.position.term_days ?? 0 })}</Row>
        <Row label={t('rentaFija.rPurchaseDate')}>{formatDate(view.position.purchase_date ?? '')}</Row>
        <Row label={t('rentaFija.rMaturity')}>{formatDate(r.maturityDate)}</Row>
        <Row label={t('rentaFija.rDaysElapsedRemaining')}>
          {r.daysElapsed} / {r.daysRemaining}
        </Row>
        <Row label={t('rentaFija.rGrossInterest')}>{formatMoney(r.accruedInterestGross, cur)}</Row>
        <Row label={t('rentaFija.rWithholding')}>− {formatMoney(r.withholding, cur)}</Row>
        <Row label={t('rentaFija.rNetInterest')}>{formatMoney(r.accruedInterestNet, cur)}</Row>
        <Row label={t('rentaFija.rValueAtMaturity')}>{formatMoney(r.valueAtMaturity, cur)}</Row>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t('rentaFija.isrNote', { rate: (ISR_WITHHOLDING_RATE * 100).toFixed(1) })}
        </p>
        {d.kind === 'sofipo' ? (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            {t('rentaFija.ipabWarning')}
          </p>
        ) : null}
      </div>
    );
  }

  // C.1 — Nu / Ahorros: saldo + interés proyectado.
  if (d.kind === 'savings') {
    const r = d.result;
    return (
      <div>
        {view.position.institution ? (
          <Row label={t('rentaFija.rInstitution')}>{view.position.institution}</Row>
        ) : null}
        <Row label={t('rentaFija.rBalance')}>{formatMoney(view.currentValueLocal, cur)}</Row>
        <Row label={t('rentaFija.rAnnualRate')}>{formatPercent(view.position.annual_rate ?? 0)}</Row>
        <Row label={t('rentaFija.rMonthlyInterest')}>{formatMoney(r.monthlyInterest, cur)}</Row>
        <Row label={t('rentaFija.rAnnualInterestEst')}>{formatMoney(r.annualInterest, cur)}</Row>
        {r.daysElapsed > 0 ? (
          <Row label={t('rentaFija.rAccruedSince')}>{formatMoney(r.accruedInterest, cur)}</Row>
        ) : null}
      </div>
    );
  }

  // inflation_linked
  const r = d.result;
  return (
    <div>
      <Row label={t('rentaFija.rFaceValueUnits')}>
        {view.position.face_value_in_units ?? 0} {t('rentaFija.udis')}
      </Row>
      <Row label={t('rentaFija.rUnitValue')}>
        {formatMoney(view.position.unit_value_at_purchase ?? 0, cur)} →{' '}
        {formatMoney(view.position.unit_value_current ?? 0, cur)}
      </Row>
      <Row label={t('rentaFija.rInflationAdj')}>{formatMoney(r.inflationAdjustment, cur)}</Row>
      <Row label={t('rentaFija.rCouponRateReal')}>{formatPercent(view.position.coupon_rate ?? 0)}</Row>
      <Row label={t('rentaFija.rCouponPerPayment')}>{formatMoney(r.couponPerPayment, cur)}</Row>
      <Row label={t('rentaFija.rMaturity')}>{formatDate(view.position.maturity_date ?? '')}</Row>
      <Row label={t('rentaFija.rNextCoupon')}>
        {r.nextCouponDate ? formatDate(r.nextCouponDate) : t('common.noPending')}
      </Row>
      <Row label={t('rentaFija.rCouponsPaidPending')}>
        {r.paidCoupons.length} / {r.pendingCoupons.length}
      </Row>
    </div>
  );
}

function PositionModal({
  open,
  onClose,
  asset,
  position,
  txns,
  today,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset;
  position: FixedIncomePosition | null;
  txns: Transaction[];
  today: string;
}) {
  const { t } = useTranslation();
  const tier = useTier();
  const isPro = tier !== 'free'; // C.4 — pagaré/SoFIPO requieren Pro+
  const [type, setType] = useState<FixedIncomeType>(asset.fixed_income_type ?? 'discount');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [capitalInvested, setCapitalInvested] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [termDays, setTermDays] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [faceValuePerTitle, setFaceValuePerTitle] = useState('');
  const [reportedBalance, setReportedBalance] = useState('');
  const [faceValueTotal, setFaceValueTotal] = useState('');
  const [couponRate, setCouponRate] = useState('');
  const [couponFrequency, setCouponFrequency] = useState<CouponFrequency>('semestral');
  const [firstCouponDate, setFirstCouponDate] = useState('');
  const [faceValueInUnits, setFaceValueInUnits] = useState('');
  const [unitValueAtPurchase, setUnitValueAtPurchase] = useState('');
  const [unitValueCurrent, setUnitValueCurrent] = useState('');
  const [institution, setInstitution] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const str = (n: number | undefined) => (n === undefined ? '' : String(n));
    setType(position?.type ?? asset.fixed_income_type ?? 'discount');
    setPurchaseDate(position?.purchase_date ?? today);
    setCapitalInvested(str(position?.capital_invested));
    setAnnualRate(str(position?.annual_rate));
    setTermDays(str(position?.term_days));
    setMaturityDate(position?.maturity_date ?? '');
    setFaceValuePerTitle(str(position?.face_value_per_title));
    setReportedBalance(str(position?.reported_balance));
    setFaceValueTotal(str(position?.face_value_total));
    setCouponRate(str(position?.coupon_rate));
    setCouponFrequency(position?.coupon_frequency ?? 'semestral');
    setFirstCouponDate(position?.first_coupon_date ?? '');
    setFaceValueInUnits(str(position?.face_value_in_units));
    setUnitValueAtPurchase(str(position?.unit_value_at_purchase));
    setUnitValueCurrent(str(position?.unit_value_current));
    setInstitution(position?.institution ?? '');
    setNotes(position?.notes ?? '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position?.id]);

  const netContrib = useMemo(() => netContributionsLocal(txns, asset.id), [txns, asset.id]);

  function buildPosition(): FixedIncomePosition {
    const p: FixedIncomePosition = {
      id: position?.id ?? crypto.randomUUID(),
      asset_id: asset.id,
      type,
      currency: asset.currency,
      notes: notes.trim() || undefined,
    };
    if (institution.trim()) p.institution = institution.trim();
    if (type === 'discount') {
      p.purchase_date = purchaseDate || today;
      p.capital_invested = num(capitalInvested);
      p.annual_rate = num(annualRate);
      p.term_days = num(termDays);
      if (maturityDate) p.maturity_date = maturityDate;
      if (faceValuePerTitle.trim()) p.face_value_per_title = num(faceValuePerTitle);
    } else if (type === 'money_market') {
      p.reported_balance = num(reportedBalance);
      if (purchaseDate) p.purchase_date = purchaseDate;
    } else if (type === 'fixed_rate_coupon') {
      p.purchase_date = purchaseDate || today;
      p.capital_invested = num(capitalInvested);
      p.face_value_total = num(faceValueTotal);
      p.coupon_rate = num(couponRate);
      p.coupon_frequency = couponFrequency;
      p.first_coupon_date = firstCouponDate;
      p.maturity_date = maturityDate;
    } else if (type === 'promissory_note' || type === 'sofipo') {
      p.purchase_date = purchaseDate || today;
      p.capital_invested = num(capitalInvested);
      p.annual_rate = num(annualRate);
      p.term_days = num(termDays);
      if (maturityDate) p.maturity_date = maturityDate;
    } else if (type === 'savings') {
      p.reported_balance = num(reportedBalance);
      p.annual_rate = num(annualRate);
      if (purchaseDate) p.purchase_date = purchaseDate;
    } else {
      p.purchase_date = purchaseDate || today;
      p.capital_invested = num(capitalInvested);
      p.face_value_in_units = num(faceValueInUnits);
      p.unit_value_at_purchase = num(unitValueAtPurchase);
      p.unit_value_current = num(unitValueCurrent);
      p.coupon_rate = num(couponRate);
      p.coupon_frequency = couponFrequency;
      p.first_coupon_date = firstCouponDate;
      p.maturity_date = maturityDate;
    }
    return p;
  }

  function validate(p: FixedIncomePosition): string | null {
    if (type === 'discount') {
      if ((p.capital_invested ?? 0) <= 0) return t('rentaFija.errCapital');
      if ((p.annual_rate ?? 0) <= 0) return t('rentaFija.errAnnualRate');
      if ((p.term_days ?? 0) <= 0) return t('rentaFija.errTerm');
      if (!p.purchase_date) return t('rentaFija.errPurchaseDate');
    } else if (type === 'money_market') {
      if ((p.reported_balance ?? 0) < 0) return t('rentaFija.errBalanceNonneg');
    } else if (type === 'fixed_rate_coupon') {
      if ((p.capital_invested ?? 0) <= 0) return t('rentaFija.errCapital');
      if ((p.face_value_total ?? 0) <= 0) return t('rentaFija.errFaceValue');
      if ((p.coupon_rate ?? 0) <= 0) return t('rentaFija.errCouponRate');
      if (!p.first_coupon_date) return t('rentaFija.errFirstCoupon');
      if (!p.maturity_date) return t('rentaFija.errMaturity');
    } else if (type === 'promissory_note' || type === 'sofipo') {
      if ((p.capital_invested ?? 0) <= 0) return t('rentaFija.errCapital');
      if ((p.annual_rate ?? 0) <= 0) return t('rentaFija.errAnnualRate');
      if ((p.term_days ?? 0) <= 0) return t('rentaFija.errTerm');
      if (!p.purchase_date) return t('rentaFija.errPurchaseDate');
    } else if (type === 'savings') {
      if ((p.reported_balance ?? 0) < 0) return t('rentaFija.errBalanceNonneg');
      if ((p.annual_rate ?? 0) <= 0) return t('rentaFija.errAnnualRate');
    } else {
      if ((p.capital_invested ?? 0) <= 0) return t('rentaFija.errCapital');
      if ((p.face_value_in_units ?? 0) <= 0) return t('rentaFija.errFaceValueUnits');
      if ((p.unit_value_at_purchase ?? 0) <= 0) return t('rentaFija.errUnitAtPurchase');
      if ((p.unit_value_current ?? 0) <= 0) return t('rentaFija.errUnitCurrent');
      if ((p.coupon_rate ?? 0) <= 0) return t('rentaFija.errCouponRate');
      if (!p.first_coupon_date) return t('rentaFija.errFirstCoupon');
      if (!p.maturity_date) return t('rentaFija.errMaturity');
    }
    return null;
  }

  async function submit() {
    const p = buildPosition();
    const err = validate(p);
    if (err) {
      setError(err);
      return;
    }
    await db.fixed_income_positions.put(p);
    // Mantén sincronizado el tipo del activo con el de su posición.
    if (asset.fixed_income_type !== type) {
      await db.assets.update(asset.id, { fixed_income_type: type });
    }
    onClose();
  }

  const isCoupon = type === 'fixed_rate_coupon';
  const isInflation = type === 'inflation_linked';
  const isTermDeposit = type === 'promissory_note' || type === 'sofipo';
  const isSavings = type === 'savings';
  const showCapital = type !== 'money_market' && type !== 'savings';

  return (
    <Modal
      open={open}
      title={
        position
          ? t('rentaFija.modalEditTitle', { ticker: asset.ticker })
          : t('rentaFija.modalCaptureTitle', { ticker: asset.ticker })
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('rentaFija.fInstrumentType')} hint={t('rentaFija.fInstrumentHint')}>
          <Select value={type} onChange={(e) => setType(e.target.value as FixedIncomeType)}>
            {FI_TYPES.map((ft) => {
              const locked = !isPro && FI_TYPES_REQUIRING_PRO.includes(ft);
              return (
                <option key={ft} value={ft} disabled={locked}>
                  {t(`fiTypeLabel.${ft}`)}
                  {locked ? ` 🔒 ${t('paywall.proTag')}` : ''}
                </option>
              );
            })}
          </Select>
        </Field>

        <Field label={t('rentaFija.fInstitution')}>
          <Select value={institution} onChange={(e) => setInstitution(e.target.value)}>
            <option value="">{t('common.none')}</option>
            {RF_INSTITUTIONS.map((inst) => (
              <option key={inst} value={inst}>
                {inst === 'Otro' ? t('rentaFija.instOther') : inst}
              </option>
            ))}
          </Select>
        </Field>

        {type === 'money_market' ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
            {t('rentaFija.mmNote', { value: formatMoney(netContrib, asset.currency) })}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {showCapital ? (
            <Field label={t('rentaFija.fCapital')} hint={t('rentaFija.fCapitalHint', { cur: asset.currency })}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={capitalInvested}
                onChange={(e) => setCapitalInvested(e.target.value)}
              />
            </Field>
          ) : null}

          {type === 'money_market' || type === 'savings' ? (
            <Field label={t('rentaFija.fReportedBalance')} hint={t('rentaFija.fReportedBalanceHint', { cur: asset.currency })}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={reportedBalance}
                onChange={(e) => setReportedBalance(e.target.value)}
              />
            </Field>
          ) : null}

          {type !== 'money_market' ? (
            <Field label={t('rentaFija.fPurchaseDate')}>
              <TextInput type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </Field>
          ) : null}
        </div>

        {type === 'discount' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fAnnualRate')}>
                <TextInput type="number" min={0} step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fTermDays')}>
                <TextInput type="number" min={0} step="1" value={termDays} onChange={(e) => setTermDays(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fMaturityOptional')} hint={t('rentaFija.fMaturityHint')}>
                <TextInput type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fFaceValuePerTitle')}>
                <TextInput type="number" min={0} step="0.01" value={faceValuePerTitle} onChange={(e) => setFaceValuePerTitle(e.target.value)} placeholder="10" />
              </Field>
            </div>
          </>
        ) : null}

        {isTermDeposit ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fAnnualRate')}>
                <TextInput type="number" min={0} step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fTermDays')}>
                <TextInput type="number" min={0} step="1" value={termDays} onChange={(e) => setTermDays(e.target.value)} />
              </Field>
            </div>
            <Field label={t('rentaFija.fMaturityOptional')} hint={t('rentaFija.fMaturityHint')}>
              <TextInput type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              {t('rentaFija.isrNote', { rate: (ISR_WITHHOLDING_RATE * 100).toFixed(1) })}
            </p>
            {type === 'sofipo' ? (
              <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                {t('rentaFija.ipabWarning')}
              </p>
            ) : null}
          </>
        ) : null}

        {isSavings ? (
          <>
            <Field label={t('rentaFija.fAnnualRate')} hint={t('rentaFija.fSavingsRateHint')}>
              <TextInput type="number" min={0} step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
            </Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              {t('rentaFija.savingsNote')}
            </p>
          </>
        ) : null}

        {isCoupon ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fFaceValueTotal')} hint={t('rentaFija.fFaceValueTotalHint')}>
                <TextInput type="number" min={0} step="0.01" value={faceValueTotal} onChange={(e) => setFaceValueTotal(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fCouponRateAnnual')}>
                <TextInput type="number" min={0} step="0.01" value={couponRate} onChange={(e) => setCouponRate(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fCouponFreq')}>
                <Select value={couponFrequency} onChange={(e) => setCouponFrequency(e.target.value as CouponFrequency)}>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {t(`freq.${f}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('rentaFija.fFirstCoupon')}>
                <TextInput type="date" value={firstCouponDate} onChange={(e) => setFirstCouponDate(e.target.value)} />
              </Field>
            </div>
            <Field label={t('rentaFija.fMaturity')}>
              <TextInput type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </Field>
          </>
        ) : null}

        {isInflation ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fFaceValueUnits')}>
                <TextInput type="number" min={0} step="0.01" value={faceValueInUnits} onChange={(e) => setFaceValueInUnits(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fCouponRateReal')}>
                <TextInput type="number" min={0} step="0.01" value={couponRate} onChange={(e) => setCouponRate(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fUnitAtPurchase')}>
                <TextInput type="number" min={0} step="0.000001" value={unitValueAtPurchase} onChange={(e) => setUnitValueAtPurchase(e.target.value)} />
              </Field>
              <Field label={t('rentaFija.fUnitCurrent')}>
                <TextInput type="number" min={0} step="0.000001" value={unitValueCurrent} onChange={(e) => setUnitValueCurrent(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('rentaFija.fCouponFreq')}>
                <Select value={couponFrequency} onChange={(e) => setCouponFrequency(e.target.value as CouponFrequency)}>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {t(`freq.${f}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('rentaFija.fFirstCoupon')}>
                <TextInput type="date" value={firstCouponDate} onChange={(e) => setFirstCouponDate(e.target.value)} />
              </Field>
            </div>
            <Field label={t('rentaFija.fMaturity')}>
              <TextInput type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
            </Field>
          </>
        ) : null}

        <Field label={t('rentaFija.fNotes')}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error ? <p className="text-sm text-loss">{error}</p> : null}
      </div>
    </Modal>
  );
}
