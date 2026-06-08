import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { useAssets, useCapability, useFixedIncomePositions, useFxRates, useLabels, useSettings, useTier, useTransactions } from '../store/data';
import { useUi } from '../store/ui';
import { todayISO } from '../lib/dates';
import { formatDate } from '../lib/format';
import { ASSET_CLASSES, CRYPTO_SECTORS, FI_TYPES, FI_TYPES_REQUIRING_PRO, PRICE_SOURCES, STOCK_SECTORS } from '../lib/labels';
import type { Asset, AssetClass, AssetSector, FixedIncomeType, PriceSource } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, Card, cn, EmptyState, Field, InlineNumberInput, Modal, SectionTitle, Select, TextInput } from '../components/ui';

const CLASS_TONE: Record<AssetClass, 'navy' | 'gold' | 'neutral'> = {
  Cripto: 'navy',
  Acción: 'neutral',
  'Renta Fija': 'gold',
};

export default function Activos() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const fxRates = useFxRates() ?? [];
  const txns = useTransactions() ?? [];
  const fiPositions = useFixedIncomePositions() ?? [];
  const settings = useSettings();
  const base = settings?.base_currency ?? 'MXN';
  const live = settings?.live_prices_enabled === true;

  const [assetModal, setAssetModal] = useState(false);
  const [fxModal, setFxModal] = useState(false);
  // S10 — edición de activo (sector/etiquetas). null = alta nueva.
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [focusSector, setFocusSector] = useState(false);

  // A.6 — Límite de activos por plan. No borra nada si bajas de nivel: solo
  // impide AGREGAR por encima del límite y ofrece el CTA de mejora.
  const maxAssets = useCapability('maxAssets');
  const openLicenseModal = useUi((s) => s.openLicenseModal);
  const atLimit = assets.length >= maxAssets;
  function handleNewAsset() {
    if (atLimit) {
      openLicenseModal();
      return;
    }
    setEditAsset(null);
    setFocusSector(false);
    setAssetModal(true);
  }

  function openEdit(asset: Asset, sectorFocus = false) {
    setEditAsset(asset);
    setFocusSector(sectorFocus);
    setAssetModal(true);
  }

  function closeAssetModal() {
    setAssetModal(false);
    setEditAsset(null);
    setFocusSector(false);
  }

  const refCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of txns) map.set(tx.asset_id, (map.get(tx.asset_id) ?? 0) + 1);
    for (const p of fiPositions) map.set(p.asset_id, (map.get(p.asset_id) ?? 0) + 1);
    return map;
  }, [txns, fiPositions]);

  async function updatePrice(id: string, price: number) {
    await db.assets.update(id, { current_price: price });
  }

  async function updatePriceSource(id: string, source: PriceSource) {
    await db.assets.update(id, { price_source: source });
  }

  async function deleteAsset(asset: Asset) {
    const refs = refCount.get(asset.id) ?? 0;
    if (refs > 0) {
      window.alert(t('activos.cannotDelete', { ticker: asset.ticker, refs }));
      return;
    }
    if (!window.confirm(t('activos.confirmDeleteAsset', { ticker: asset.ticker }))) return;
    await db.assets.delete(asset.id);
  }

  const sortedAssets = [...assets].sort((a, b) => a.ticker.localeCompare(b.ticker));

  return (
    <div>
      <PageHeader
        title={t('activos.title')}
        capture
        subtitle={t('activos.subtitle')}
        actions={<Button onClick={handleNewAsset}>{t('activos.new')}</Button>}
      />

      <Card className="mb-5">
        <SectionTitle hint={t('activos.assetsHint')}>{t('activos.assetsTitle')}</SectionTitle>
        {atLimit ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-gold/50 bg-brand-gold/15 px-4 py-2.5 text-sm dark:border-brand-gold/30 dark:bg-brand-gold/10">
            <span className="text-slate-700 dark:text-slate-200">{t('paywall.maxAssetsReached', { max: maxAssets })}</span>
            <button
              type="button"
              onClick={openLicenseModal}
              className="font-semibold text-brand-navy underline underline-offset-2 dark:text-brand-gold"
            >
              {t('paywall.maxAssetsCta')}
            </button>
          </div>
        ) : null}
        {sortedAssets.length === 0 ? (
          <EmptyState
            title={t('activos.emptyTitle')}
            description={t('activos.emptyDesc')}
            action={<Button onClick={handleNewAsset}>{t('activos.new')}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="py-2 pr-3">{t('activos.colTicker')}</th>
                  <th className="py-2 pr-3">{t('activos.colName')}</th>
                  <th className="py-2 pr-3">{t('activos.colClass')}</th>
                  <th className="py-2 pr-3">{t('activos.colCurrency')}</th>
                  {live ? <th className="py-2 pr-3">{t('activos.colSource')}</th> : null}
                  <th className="py-2 pr-3 text-right">{t('activos.colPrice')}</th>
                  <th className="py-2 pl-3 text-right">{t('activos.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedAssets.map((a) => {
                  const isRF = a.class === 'Renta Fija';
                  return (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <td className="py-2 pr-3 font-medium text-heading">{a.ticker}</td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{a.name}</td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={CLASS_TONE[a.class]}>{t(`assetClass.${a.class}`)}</Badge>
                          {!isRF ? (
                            a.sector ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500">{t(`sectors.${a.sector}`)}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEdit(a, true)}
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25"
                              >
                                {t('sectors.missing')}
                              </button>
                            )
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{a.currency}</td>
                      {live ? (
                        <td className="py-2 pr-3">
                          {isRF ? (
                            <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                          ) : (
                            <Select
                              value={a.price_source ?? 'manual'}
                              onChange={(e) =>
                                void updatePriceSource(a.id, e.target.value as PriceSource)
                              }
                              className="w-auto py-1 text-xs"
                            >
                              {PRICE_SOURCES.map((s) => (
                                <option key={s} value={s}>
                                  {t(`priceSource.${s}`)}
                                </option>
                              ))}
                            </Select>
                          )}
                        </td>
                      ) : null}
                      <td className="py-2 pr-3 text-right">
                        {isRF ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500">{t('activos.priceInRf')}</span>
                        ) : (
                          <InlineNumberInput
                            value={a.current_price}
                            min={0}
                            step={0.01}
                            onCommit={(v) => void updatePrice(a.id, v)}
                          />
                        )}
                      </td>
                      <td className="py-2 pl-3 text-right">
                        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => openEdit(a)}>
                          {t('common.edit')}
                        </Button>
                        <Button variant="ghost" className="px-2 py-1 text-xs text-loss" onClick={() => void deleteAsset(a)}>
                          {t('common.delete')}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle hint={t('activos.fxHint', { base })}>{t('activos.fxTitle')}</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-2 pr-3">{t('activos.fxColCurrency')}</th>
                <th className="py-2 pr-3 text-right">{t('activos.fxColValue', { base })}</th>
                <th className="py-2 pr-3">{t('activos.fxColUpdated')}</th>
                <th className="py-2 pl-3 text-right">{t('activos.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2 pr-3 font-medium text-heading">{base}</td>
                <td className="py-2 pr-3 text-right tabular-nums">1.00</td>
                <td className="py-2 pr-3 text-slate-400 dark:text-slate-500">{t('activos.fxBaseRow')}</td>
                <td className="py-2 pl-3 text-right text-xs text-slate-300 dark:text-slate-600">—</td>
              </tr>
              {fxRates
                .filter((fx) => fx.currency !== base)
                .map((fx) => (
                  <tr key={fx.currency} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <td className="py-2 pr-3 font-medium text-heading">{fx.currency}</td>
                    <td className="py-2 pr-3 text-right">
                      <InlineNumberInput
                        value={fx.rate_to_base}
                        min={0}
                        step={0.0001}
                        onCommit={(v) =>
                          void db.fx_rates.update(fx.currency, { rate_to_base: v, updated_at: todayISO() })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{formatDate(fx.updated_at)}</td>
                    <td className="py-2 pl-3 text-right">
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs text-loss"
                        onClick={() => {
                          if (window.confirm(t('activos.fxConfirmDelete', { cur: fx.currency }))) {
                            void db.fx_rates.delete(fx.currency);
                          }
                        }}
                      >
                        {t('common.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => setFxModal(true)}>
            {t('activos.fxAdd')}
          </Button>
        </div>
      </Card>

      <AssetModal open={assetModal} onClose={closeAssetModal} base={base} editAsset={editAsset} focusSector={focusSector} />
      <NewFxModal open={fxModal} onClose={() => setFxModal(false)} base={base} existing={fxRates.map((f) => f.currency)} />
    </div>
  );
}

function AssetModal({
  open,
  onClose,
  base,
  editAsset,
  focusSector,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  editAsset: Asset | null;
  focusSector: boolean;
}) {
  const { t } = useTranslation();
  const isPro = useTier() !== 'free'; // C.4 — pagaré/SoFIPO solo Pro+
  const allLabels = useLabels() ?? [];
  const canLabels = useCapability('canUseCustomLabels');
  const isEditing = editAsset !== null;

  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [cls, setCls] = useState<AssetClass>('Cripto');
  const [fiType, setFiType] = useState<FixedIncomeType>('discount');
  const [currency, setCurrency] = useState(base);
  const [price, setPrice] = useState('0');
  const [sector, setSector] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const isRF = cls === 'Renta Fija';
  const sectorOptions: AssetSector[] = cls === 'Cripto' ? CRYPTO_SECTORS : cls === 'Acción' ? STOCK_SECTORS : [];

  // Prefill al abrir: datos del activo en edición, o limpio para alta nueva.
  useEffect(() => {
    if (!open) return;
    setTicker(editAsset?.ticker ?? '');
    setName(editAsset?.name ?? '');
    setCls(editAsset?.class ?? 'Cripto');
    setFiType(editAsset?.fixed_income_type ?? 'discount');
    setCurrency(editAsset?.currency ?? base);
    setPrice(String(editAsset?.current_price ?? 0));
    setSector(editAsset?.sector ?? '');
    setLabelIds(editAsset?.label_ids ?? []);
    setError('');
  }, [open, editAsset, base]);

  function changeClass(next: AssetClass) {
    setCls(next);
    setSector(''); // el sector depende de la clase → al cambiarla se reinicia
  }

  function toggleLabel(id: string) {
    setLabelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function submit() {
    if (!ticker.trim() || !name.trim() || !currency.trim()) {
      setError(t('activos.errRequired'));
      return;
    }
    const fields = {
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      currency: currency.trim().toUpperCase(),
      current_price: isRF ? 0 : Number(price) || 0,
      sector: !isRF && sector ? (sector as AssetSector) : undefined,
      label_ids: labelIds.length > 0 ? labelIds : undefined,
    };
    if (editAsset) {
      await db.assets.update(editAsset.id, fields);
    } else {
      await db.assets.add({
        id: crypto.randomUUID(),
        class: cls,
        fixed_income_type: isRF ? fiType : undefined,
        ...fields,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      title={isEditing ? t('activos.modalEditAsset') : t('activos.modalNewAsset')}
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
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('activos.fTicker')}>
            <TextInput value={ticker} maxLength={24} onChange={(e) => setTicker(e.target.value)} placeholder="BTC" />
          </Field>
          <Field label={t('activos.fQuoteCurrency')}>
            <TextInput value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder={base} />
          </Field>
        </div>
        <Field label={t('activos.fName')}>
          <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Bitcoin" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('activos.fClass')}>
            <Select value={cls} disabled={isEditing} onChange={(e) => changeClass(e.target.value as AssetClass)}>
              {ASSET_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {t(`assetClass.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          {isRF ? (
            <Field label={t('activos.fFiType')}>
              <Select value={fiType} disabled={isEditing} onChange={(e) => setFiType(e.target.value as FixedIncomeType)}>
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
          ) : (
            <Field label={t('activos.fPrice')} hint={t('activos.fPriceHint', { cur: currency || base })}>
              <TextInput type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          )}
        </div>

        {/* S10 — Sector (opcional): solo acciones y cripto; la lista depende de la clase. */}
        {!isRF ? (
          <Field label={`${t('sectors.title')} ${t('common.optional')}`}>
            <Select autoFocus={focusSector} value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">{t('sectors.placeholder')}</option>
              {sectorOptions.map((s) => (
                <option key={s} value={s}>
                  {t(`sectors.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {/* S10 — Etiquetas (opcional): selección múltiple de las etiquetas existentes. */}
        <Field label={`${t('activos.fLabels')} ${t('common.optional')}`}>
          {allLabels.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {canLabels ? t('activos.labelsEmptyHint') : t('activos.labelsFreeHint')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {allLabels.map((l) => {
                const on = labelIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l.id)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      on
                        ? 'border-transparent text-white'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700',
                    )}
                    style={on ? { backgroundColor: l.color ?? '#1F3864' } : undefined}
                  >
                    {l.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        {isRF ? (
          <p className="rounded-lg bg-brand-gold/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">{t('activos.rfNote')}</p>
        ) : null}
        {error ? <p className="text-sm text-loss">{error}</p> : null}
      </div>
    </Modal>
  );
}

function NewFxModal({
  open,
  onClose,
  base,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  base: string;
  existing: string[];
}) {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState('');

  function close() {
    setCurrency('');
    setRate('');
    setError('');
    onClose();
  }

  async function submit() {
    const code = currency.trim().toUpperCase();
    const value = Number(rate);
    if (code.length < 2) {
      setError(t('activos.errFxCode'));
      return;
    }
    if (code === base.toUpperCase()) {
      setError(t('activos.errFxBase'));
      return;
    }
    if (existing.includes(code)) {
      setError(t('activos.errFxExists'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('activos.errFxValue'));
      return;
    }
    await db.fx_rates.put({ currency: code, rate_to_base: value, updated_at: todayISO() });
    close();
  }

  return (
    <Modal
      open={open}
      title={t('activos.modalNewFx')}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()}>{t('common.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('activos.fFxCurrency')} hint={t('activos.fFxCurrencyHint')}>
          <TextInput value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="USD" />
        </Field>
        <Field label={t('activos.fFxValue', { base })} hint={t('activos.fFxValueHint', { base })}>
          <TextInput type="number" min={0} step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="18.50" />
        </Field>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
      </div>
    </Modal>
  );
}
