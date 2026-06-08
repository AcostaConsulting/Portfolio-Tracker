import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { useAssets, useRatesToBase, useSettings, useTransactions } from '../store/data';
import { todayISO } from '../lib/dates';
import { formatDate, formatMoney, formatQty } from '../lib/format';
import { ASSET_CLASSES, TX_TYPES } from '../lib/labels';
import { exportMovimientosXlsx } from '../lib/export-xlsx';
import { printToPdf } from '../lib/print';
import { fetchHistoricalFxRate } from '../lib/price-fetcher';
import { netAmountBase, netAmountOp, netQuantity } from '../lib/portfolio-engine';
import type { Asset, Transaction, TransactionType } from '../types';
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

type BadgeTone = 'neutral' | 'gain' | 'loss' | 'gold' | 'navy';

const TYPE_TONE: Record<TransactionType, BadgeTone> = {
  Compra: 'navy',
  Venta: 'gold',
  Dividendo: 'gain',
  Interés: 'gain',
  Staking: 'navy',
  Ajuste: 'neutral',
  Airdrop: 'navy',
  Recompensa: 'gain',
};

const PAGE_SIZE = 12;

/** Convierte texto de input a número (vacío => 0, inválido => 0). */
function num(s: string): number {
  if (s.trim() === '') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default function Movimientos() {
  const { t: tr } = useTranslation();
  const assets = useAssets() ?? [];
  const txns = useTransactions() ?? [];
  const settings = useSettings();
  const ratesToBase = useRatesToBase();
  const base = settings?.base_currency ?? 'MXN';

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // T2 — búsqueda, filtros y orden (estado local; filtrado en memoria).
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'asset' | 'amount' | 'type'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  // G.3 — TC fijo recordado para una fecha (solo estado React; no se persiste en Dexie).
  const [lockedFx, setLockedFx] = useState<{ date: string; rate: number } | null>(null);

  const hasActiveFilter = search.trim() !== '' || filterType !== 'all' || filterClass !== 'all';
  function clearFilters() {
    setSearch('');
    setFilterType('all');
    setFilterClass('all');
    setSortBy('date');
    setSortDir('desc');
  }

  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => a.ticker.localeCompare(b.ticker)),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = txns.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      const a = assetById.get(t.asset_id);
      if (filterClass !== 'all' && a?.class !== filterClass) return false;
      if (q && !`${a?.ticker ?? ''} ${a?.name ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((x, y) => {
      const ax = assetById.get(x.asset_id);
      const ay = assetById.get(y.asset_id);
      let cmp = 0;
      if (sortBy === 'date') cmp = x.date.localeCompare(y.date);
      else if (sortBy === 'asset') cmp = (ax?.ticker ?? '').localeCompare(ay?.ticker ?? '');
      else if (sortBy === 'amount') cmp = Math.abs(netAmountBase(x)) - Math.abs(netAmountBase(y));
      else cmp = x.type.localeCompare(y.type);
      if (cmp === 0) cmp = x.date.localeCompare(y.date); // desempate estable por fecha
      return cmp * dir;
    });
  }, [txns, search, filterType, filterClass, sortBy, sortDir, assetById]);

  // Reinicia la paginación cuando cambian filtros u orden.
  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterClass, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setModalOpen(true);
  }

  async function remove(tx: Transaction) {
    const a = assetById.get(tx.asset_id);
    const label = a ? a.ticker : tr('movimientos.thisAsset');
    if (
      !window.confirm(
        tr('movimientos.confirmDelete', {
          type: tr(`txType.${tx.type}`),
          label,
          date: formatDate(tx.date),
        }),
      )
    ) {
      return;
    }
    await db.transactions.delete(tx.id);
  }

  function exportExcel() {
    void exportMovimientosXlsx(filtered, assets, base, tr);
  }

  function exportPdf() {
    printToPdf(`Portafolio — Movimientos — ${todayISO()}`);
  }

  const hasAssets = assets.length > 0;

  return (
    <div>
      <PageHeader
        title={tr('movimientos.title')}
        capture
        subtitle={tr('movimientos.subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={exportExcel} disabled={filtered.length === 0}>
              {tr('movimientos.exportExcel')}
            </Button>
            <Button variant="secondary" onClick={exportPdf}>
              {tr('movimientos.exportPdf')}
            </Button>
            <span data-tour="add-btn" className="inline-flex">
              <Button onClick={openNew} disabled={!hasAssets}>
                {tr('movimientos.new')}
              </Button>
            </span>
          </>
        }
      />

      {!hasAssets ? (
        <EmptyState
          title={tr('movimientos.emptyAssetsTitle')}
          description={tr('movimientos.emptyAssetsDesc')}
        />
      ) : (
        <Card>
          {/* T2 — Búsqueda, filtros y orden (colapsable) */}
          <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" className="text-xs" onClick={() => setShowFilters((v) => !v)}>
                {showFilters ? '▴' : '▾'} {tr('filters.filterBy')}
              </Button>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {hasActiveFilter
                  ? tr('filters.showingOf', { shown: filtered.length, total: txns.length })
                  : tr('movimientos.count', { count: filtered.length })}
              </span>
            </div>

            {showFilters ? (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="w-56">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{tr('filters.search')}</span>
                  <TextInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('filters.searchPlaceholder')}
                  />
                </div>
                <div className="w-40">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{tr('filters.type')}</span>
                  <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">{tr('filters.allTypes')}</option>
                    {TX_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {tr(`txType.${t}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{tr('filters.assetClass')}</span>
                  <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                    <option value="all">{tr('filters.allClasses')}</option>
                    {ASSET_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {tr(`assetClass.${c}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{tr('filters.sortBy')}</span>
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
                    <option value="date">{tr('filters.sortDate')}</option>
                    <option value="asset">{tr('filters.sortAsset')}</option>
                    <option value="amount">{tr('filters.sortAmount')}</option>
                    <option value="type">{tr('filters.sortType')}</option>
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  title={sortDir === 'asc' ? tr('filters.ascending') : tr('filters.descending')}
                >
                  {sortDir === 'asc' ? `↑ ${tr('filters.ascending')}` : `↓ ${tr('filters.descending')}`}
                </Button>
                {hasActiveFilter ? (
                  <Button variant="ghost" className="text-xs" onClick={clearFilters}>
                    {tr('filters.clear')}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={tr('movimientos.emptyNoneTitle')}
              description={
                txns.length === 0 ? tr('movimientos.emptyNoneFirst') : tr('movimientos.emptyNoneFiltered')
              }
              action={
                txns.length === 0 ? <Button onClick={openNew}>{tr('movimientos.new')}</Button> : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <th className="py-2 pr-3">{tr('movimientos.colDate')}</th>
                      <th className="py-2 pr-3">{tr('movimientos.colAsset')}</th>
                      <th className="py-2 pr-3">{tr('movimientos.colType')}</th>
                      <th className="py-2 pr-3 text-right">{tr('movimientos.colQty')}</th>
                      <th className="py-2 pr-3 text-right">{tr('movimientos.colPrice')}</th>
                      <th className="py-2 pr-3 text-right">{tr('movimientos.colNet', { base })}</th>
                      <th className="py-2 pl-3 text-right">{tr('movimientos.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((t) => {
                      const a = assetById.get(t.asset_id);
                      const opCur = t.operation_currency;
                      const isBase = opCur.toUpperCase() === base.toUpperCase();
                      const showQty = t.type !== 'Dividendo' && t.type !== 'Interés';
                      const showPrice = t.type === 'Compra' || t.type === 'Venta';
                      const netOp = netAmountOp(t);
                      const netBase = netAmountBase(t);
                      const noFlow =
                        t.type === 'Staking' ||
                        t.type === 'Ajuste' ||
                        t.type === 'Airdrop' ||
                        t.type === 'Recompensa';
                      return (
                        <tr key={t.id} className="border-b border-slate-100 last:border-0 align-top dark:border-slate-700">
                          <td className="py-2 pr-3 text-slate-600 dark:text-slate-300 tabular-nums">{formatDate(t.date)}</td>
                          <td className="py-2 pr-3">
                            <div className="font-medium text-heading">{a?.ticker ?? '—'}</div>
                            {a ? <div className="text-xs text-slate-400 dark:text-slate-500">{a.name}</div> : null}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge tone={TYPE_TONE[t.type]}>{tr(`txType.${t.type}`)}</Badge>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {showQty ? formatQty(t.quantity) : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                            {showPrice ? formatMoney(t.price_per_unit, opCur) : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {noFlow ? (
                              <span className="text-slate-400 dark:text-slate-500">—</span>
                            ) : (
                              <div>
                                <div className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                                  {formatMoney(netBase, base)}
                                </div>
                                {!isBase ? (
                                  <div className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                                    {formatMoney(netOp, opCur)} · TC {t.fx_rate}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pl-3 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              onClick={() => openEdit(t)}
                            >
                              {tr('common.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs text-loss"
                              onClick={() => void remove(t)}
                            >
                              {tr('common.delete')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {tr('movimientos.pagination', {
                      from: start + 1,
                      to: Math.min(start + PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {tr('movimientos.prev')}
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {safePage} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {tr('movimientos.nextPage')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        assets={sortedAssets}
        txns={txns}
        ratesToBase={ratesToBase}
        base={base}
        lockedFx={lockedFx}
        onLockFx={setLockedFx}
      />
    </div>
  );
}

function TransactionModal({
  open,
  onClose,
  editing,
  assets,
  txns,
  ratesToBase,
  base,
  lockedFx,
  onLockFx,
}: {
  open: boolean;
  onClose: () => void;
  editing: Transaction | null;
  assets: Asset[];
  txns: Transaction[];
  ratesToBase: Record<string, number>;
  base: string;
  lockedFx: { date: string; rate: number } | null;
  onLockFx: (v: { date: string; rate: number } | null) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState<TransactionType>('Compra');
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [operationCurrency, setOperationCurrency] = useState(base);
  const [fxRate, setFxRate] = useState('1');
  const [commission, setCommission] = useState('0');
  const [withholding, setWithholding] = useState('0');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  // G.2 — recomendación de TC histórico (a demanda).
  const [fxSug, setFxSug] = useState<number | null>(null);
  const [fxBusy, setFxBusy] = useState(false);
  const [fxFailed, setFxFailed] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const { t: tr } = useTranslation();

  // Inicializa el formulario al abrir (nuevo o edición).
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setAssetId(editing.asset_id);
      setType(editing.type);
      setQuantity(String(editing.quantity));
      setPricePerUnit(String(editing.price_per_unit));
      setOperationCurrency(editing.operation_currency);
      setFxRate(String(editing.fx_rate));
      setCommission(String(editing.commission));
      setWithholding(String(editing.withholding));
      setPlatform(editing.platform ?? '');
      setNotes(editing.notes ?? '');
    } else {
      const first = assets[0];
      const cur = first?.currency ?? base;
      const isBase = cur.toUpperCase() === base.toUpperCase();
      setDate(todayISO());
      setAssetId(first?.id ?? '');
      setType('Compra');
      setQuantity('');
      setPricePerUnit('');
      setOperationCurrency(cur);
      setFxRate(isBase ? '1' : String(ratesToBase[cur] ?? 1));
      setCommission('0');
      setWithholding('0');
      setPlatform('');
      setNotes('');
    }
    setError('');
    setFxSug(null);
    setFxBusy(false);
    setFxFailed(false);
    setLockChecked(false);
    // Solo dependemos de open/editing para no pisar lo que el usuario escribe.
  }, [open, editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const opIsBase = operationCurrency.trim().toUpperCase() === base.toUpperCase();

  // G.2/G.3 — al cambiar fecha o moneda: descarta una sugerencia obsoleta y, si hay
  // un TC fijo recordado para esa fecha (solo en alta nueva), lo aplica.
  useEffect(() => {
    if (!open) return;
    setFxSug(null);
    setFxFailed(false);
    setLockChecked(false);
    if (!editing && lockedFx && lockedFx.date === date && operationCurrency.trim().toUpperCase() !== base.toUpperCase()) {
      setFxRate(String(lockedFx.rate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, operationCurrency]);

  // Campos visibles según el tipo de movimiento.
  const isIncome = type === 'Dividendo' || type === 'Interés';
  const isCryptoReward = type === 'Airdrop' || type === 'Recompensa'; // v0.6.0 — solo cripto
  const showQty =
    type === 'Compra' || type === 'Venta' || type === 'Staking' || type === 'Ajuste' || isCryptoReward;
  const showPrice = type === 'Compra' || type === 'Venta';
  const showOptionalPrice = isCryptoReward; // v0.6.0 — precio de entrada opcional
  const showCommission = type === 'Compra' || type === 'Venta';
  const showWithholding = type === 'Venta' || isIncome;

  // v0.6.0 — Airdrop/Recompensa solo aplican a cripto: filtra el catálogo y, al
  // cambiar a estos tipos, descarta una selección que no sea cripto.
  const cryptoAssets = useMemo(() => assets.filter((a) => a.class === 'Cripto'), [assets]);
  const availableAssets = isCryptoReward ? cryptoAssets : assets;
  useEffect(() => {
    if (!open || !isCryptoReward) return;
    const sel = assets.find((a) => a.id === assetId);
    if (sel && sel.class === 'Cripto') return;
    const firstCrypto = cryptoAssets[0];
    setAssetId(firstCrypto?.id ?? '');
    if (firstCrypto) {
      const isBase = firstCrypto.currency.toUpperCase() === base.toUpperCase();
      setOperationCurrency(firstCrypto.currency);
      setFxRate(isBase ? '1' : String(ratesToBase[firstCrypto.currency] ?? 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, open]);

  function onAssetChange(id: string) {
    setAssetId(id);
    const a = assets.find((x) => x.id === id);
    if (a) {
      const isBase = a.currency.toUpperCase() === base.toUpperCase();
      setOperationCurrency(a.currency);
      setFxRate(isBase ? '1' : String(ratesToBase[a.currency] ?? 1));
    }
  }

  function onCurrencyChange(value: string) {
    const up = value.toUpperCase();
    setOperationCurrency(up);
    if (up === base.toUpperCase()) {
      setFxRate('1');
    } else if (ratesToBase[up] != null) {
      setFxRate(String(ratesToBase[up]));
    }
  }

  // G.2 — pide a Frankfurter el TC histórico de la fecha (a demanda, opt-in).
  async function fetchFxSuggestion() {
    setFxBusy(true);
    setFxFailed(false);
    const rate = await fetchHistoricalFxRate(date, operationCurrency, base);
    setFxBusy(false);
    if (rate && rate > 0) setFxSug(Math.round(rate * 10000) / 10000);
    else setFxFailed(true);
  }
  function useSuggestedFx() {
    if (fxSug != null) setFxRate(String(fxSug));
  }
  function toggleLockFx(checked: boolean) {
    setLockChecked(checked);
    if (checked && fxSug != null) {
      setFxRate(String(fxSug));
      onLockFx({ date, rate: fxSug });
    } else {
      onLockFx(null);
    }
  }

  function buildTx(): Transaction {
    return {
      id: editing?.id ?? crypto.randomUUID(),
      date,
      asset_id: assetId,
      type,
      quantity: isIncome ? 0 : num(quantity),
      price_per_unit: type === 'Staking' || type === 'Ajuste' ? 0 : num(pricePerUnit),
      operation_currency: operationCurrency.trim().toUpperCase() || base,
      fx_rate: opIsBase ? 1 : num(fxRate),
      commission: showCommission ? num(commission) : 0,
      withholding: showWithholding ? num(withholding) : 0,
      platform: platform.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  function validate(tx: Transaction): string | null {
    if (!tx.asset_id) return tr('movimientos.errAsset');
    if (!tx.date) return tr('movimientos.errDate');
    if (!tx.operation_currency) return tr('movimientos.errCurrency');
    if (!Number.isFinite(tx.fx_rate) || tx.fx_rate <= 0) {
      return tr('movimientos.errFxRate');
    }
    if ((type === 'Compra' || type === 'Venta' || type === 'Staking' || isCryptoReward) && tx.quantity <= 0) {
      return tr('movimientos.errQtyPositive');
    }
    if (type === 'Ajuste' && tx.quantity === 0) {
      return tr('movimientos.errAdjustNonzero');
    }
    if ((type === 'Compra' || type === 'Venta') && tx.price_per_unit <= 0) {
      return tr('movimientos.errPricePositive');
    }
    if (isIncome && tx.price_per_unit <= 0) {
      return tr('movimientos.errAmountPositive');
    }
    if (tx.commission < 0 || tx.withholding < 0) {
      return tr('movimientos.errFeesNonneg');
    }
    if (type === 'Venta') {
      const others = txns.filter((t) => t.asset_id === tx.asset_id && t.id !== tx.id);
      const available = netQuantity(others);
      if (tx.quantity > available + 1e-9) {
        return tr('movimientos.errSellExceeds', {
          qty: formatQty(tx.quantity),
          available: formatQty(available),
        });
      }
    }
    return null;
  }

  async function submit() {
    const tx = buildTx();
    const err = validate(tx);
    if (err) {
      setError(err);
      return;
    }
    await db.transactions.put(tx);
    onClose();
  }

  // Vista previa del neto calculado.
  const preview = buildTx();
  const previewOk = !!assetId && (showPrice || isIncome ? num(pricePerUnit) > 0 : true);
  const netOpPreview = netAmountOp(preview);
  const netBasePreview = netAmountBase(preview);
  const hasFlow = type !== 'Staking' && type !== 'Ajuste' && !isCryptoReward;

  const qtyLabel =
    type === 'Ajuste'
      ? tr('movimientos.fQtyAdjust')
      : type === 'Staking'
        ? tr('movimientos.fQtyStaking')
        : tr('movimientos.fQty');
  const amountLabel =
    type === 'Dividendo' ? tr('movimientos.fDividendAmount') : tr('movimientos.fInterestAmount');

  return (
    <Modal
      open={open}
      title={editing ? tr('movimientos.modalEdit') : tr('movimientos.modalNew')}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tr('common.cancel')}
          </Button>
          <Button onClick={() => void submit()}>{tr('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('movimientos.fDate')}>
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field
            label={tr('movimientos.fAsset')}
            hint={isCryptoReward ? tr('movimientos.cryptoOnlyHint') : undefined}
          >
            <Select value={assetId} onChange={(e) => onAssetChange(e.target.value)}>
              {availableAssets.length === 0 ? <option value="">(sin activos)</option> : null}
              {availableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ticker} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('movimientos.fType')}>
            <Select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              {TX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {tr(`txType.${t}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={tr('movimientos.fOpCurrency')}
            hint={opIsBase ? tr('movimientos.fOpCurrencyHint') : undefined}
          >
            <TextInput
              value={operationCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              placeholder={base}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showQty ? (
            <Field label={qtyLabel}>
              <TextInput
                type="number"
                step="0.00000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </Field>
          ) : null}
          {showPrice ? (
            <Field label={tr('movimientos.fPrice')} hint={tr('movimientos.fPriceHint', { cur: operationCurrency || base })}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          ) : null}
          {isIncome ? (
            <Field label={amountLabel} hint={tr('movimientos.fPriceHint', { cur: operationCurrency || base })}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="0.00"
              />
            </Field>
          ) : null}
          {showOptionalPrice ? (
            <Field label={tr('movimientos.fEntryPriceOptional')} hint={tr('movimientos.fEntryPriceHint')}>
              <TextInput
                type="number"
                min={0}
                step="0.01"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                placeholder="0"
              />
            </Field>
          ) : null}
        </div>

        {(showCommission || showWithholding) && (
          <div className="grid grid-cols-2 gap-3">
            {showCommission ? (
              <Field label={tr('movimientos.fCommission')} hint={tr('movimientos.fPriceHint', { cur: operationCurrency || base })}>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
              </Field>
            ) : null}
            {showWithholding ? (
              <Field label={tr('movimientos.fWithholding')} hint={tr('movimientos.fPriceHint', { cur: operationCurrency || base })}>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={withholding}
                  onChange={(e) => setWithholding(e.target.value)}
                />
              </Field>
            ) : null}
          </div>
        )}

        {!opIsBase ? (
          <Field
            label={tr('movimientos.fFxRate', { cur: operationCurrency || '?', base })}
            hint={tr('movimientos.fFxRateHint')}
          >
            <TextInput
              type="number"
              min={0}
              step="0.0001"
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
            />
            {date < todayISO() ? (
              <div className="mt-1.5 text-xs">
                {fxSug != null ? (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">
                      {tr('movimientos.fxSuggest', {
                        date: formatDate(date),
                        pair: `${operationCurrency.toUpperCase()}→${base}`,
                        value: fxSug,
                      })}
                    </span>{' '}
                    <button
                      type="button"
                      onClick={useSuggestedFx}
                      className="font-medium text-brand-navy underline dark:text-brand-gold"
                    >
                      {tr('movimientos.fxUse')}
                    </button>
                    <label className="mt-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={lockChecked}
                        onChange={(e) => toggleLockFx(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      {tr('movimientos.fxLockDate')}
                    </label>
                  </>
                ) : fxFailed ? (
                  <span className="text-slate-400 dark:text-slate-500">{tr('movimientos.fxUnavailable')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void fetchFxSuggestion()}
                    disabled={fxBusy}
                    className="text-brand-navy underline disabled:text-slate-300 disabled:no-underline dark:text-brand-gold"
                  >
                    {fxBusy ? tr('movimientos.fxLoading') : tr('movimientos.fxAsk', { date: formatDate(date) })}
                  </button>
                )}
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{tr('movimientos.fxPrivacy')}</p>
              </div>
            ) : null}
          </Field>
        ) : null}

        <Field label={tr('movimientos.fPlatform')}>
          <TextInput value={platform} maxLength={60} onChange={(e) => setPlatform(e.target.value)} placeholder={tr('movimientos.fPlatformPlaceholder')} />
        </Field>

        <Field label={tr('movimientos.fNotes')}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {hasFlow && previewOk ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 dark:bg-slate-700/50">
            {tr('movimientos.previewNet')}{' '}
            <strong className="text-slate-800 dark:text-slate-100">{formatMoney(netOpPreview, operationCurrency || base)}</strong>
            {!opIsBase ? <span> ≈ {formatMoney(netBasePreview, base)}</span> : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-loss">{error}</p> : null}
      </div>
    </Modal>
  );
}
