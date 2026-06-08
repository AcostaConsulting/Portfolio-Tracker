import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../db/db';
import { useAssets, useRatesToBase, useSettings } from '../store/data';
import { useUi } from '../store/ui';
import { todayISO } from '../lib/dates';
import { downloadTemplate, readSheetRows } from '../lib/import-xlsx';
import { exportMovimientosTemplateXlsx } from '../lib/export-xlsx';
import {
  autoSuggestMapping,
  parseRows,
  parseSnapshotRows,
  IMPORT_FIELDS,
  REQUIRED_FIELDS,
  SNAPSHOT_FIELDS,
  SNAPSHOT_REQUIRED,
  type ColumnMapping,
  type ImportField,
  type SnapshotField,
  type SnapshotMapping,
} from '../lib/import';
import { PageHeader } from '../components/PageHeader';
import { Button, Card, cn, EmptyState, Field, SectionTitle, Select, TextInput } from '../components/ui';

type Mode = 'transactions' | 'snapshot';
type Banner = { tone: 'ok' | 'error'; text: string } | null;

export default function Importar() {
  const { t } = useTranslation();
  const assets = useAssets() ?? [];
  const settings = useSettings();
  const ratesToBase = useRatesToBase();
  const base = settings?.base_currency ?? 'MXN';
  const setScreen = useUi((s) => s.setScreen);

  const [mode, setMode] = useState<Mode>('transactions');
  const [step, setStep] = useState(1);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [snapMapping, setSnapMapping] = useState<SnapshotMapping>({});
  const [openingDate, setOpeningDate] = useState(todayISO());
  const [banner, setBanner] = useState<Banner>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Etiquetas de los campos destino. Para que la IDA Y VUELTA con el export
  // funcione (mapeo automático por coincidencia exacta), se usan las MISMAS claves
  // i18n que los encabezados del export (export.col*). 'class' no existe en el
  // export, así que conserva su etiqueta propia.
  const fieldLabel: Record<ImportField, string> = {
    date: t('export.colDate'),
    ticker: t('export.colTicker'),
    class: t('import.fClass'),
    type: t('export.colType'),
    quantity: t('export.colQuantity'),
    price: t('export.colUnitPrice'),
    currency: t('export.colCurrency'),
    fx_rate: t('export.colFxRate'),
    commission: t('export.colCommission'),
    withholding: t('export.colWithholding'),
    platform: t('export.colPlatform'),
    notes: t('export.colNotes'),
  };
  const snapLabel: Record<SnapshotField, string> = {
    ticker: t('import.fTicker'),
    class: t('import.fClass'),
    quantity: t('import.fQuantity'),
    avgCost: t('import.fAvgCost'),
    currency: t('import.fCurrency'),
  };

  const headers = useMemo(() => {
    if (!rawRows.length) return [] as string[];
    if (hasHeaders) return rawRows[0].map((c, i) => String(c || t('import.columnN', { n: i + 1 })));
    const width = Math.max(...rawRows.map((r) => r.length));
    return Array.from({ length: width }, (_, i) => t('import.columnN', { n: i + 1 }));
  }, [rawRows, hasHeaders, t]);

  const dataRows = useMemo(() => (hasHeaders ? rawRows.slice(1) : rawRows), [rawRows, hasHeaders]);

  // Auto-sugiere el mapeo al cargar/cambiar encabezados (coincidencia exacta con
  // nuestra plantilla localizada + heurística por nombre).
  useEffect(() => {
    if (!rawRows.length) return;
    if (mode === 'snapshot') {
      setSnapMapping(autoSuggestMapping(headers, snapLabel) as SnapshotMapping);
    } else {
      setMapping(autoSuggestMapping(headers, fieldLabel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, mode]);

  const parsed = useMemo(() => {
    if (!dataRows.length) return { transactions: [], newAssets: [], errors: [] };
    if (mode === 'snapshot') {
      return parseSnapshotRows(dataRows, snapMapping, { existingAssets: assets, baseCurrency: base, ratesToBase, openingDate });
    }
    return parseRows(dataRows, mapping, { existingAssets: assets, baseCurrency: base, ratesToBase });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRows, mapping, snapMapping, mode, openingDate, base]);

  const requiredOk =
    mode === 'snapshot'
      ? SNAPSHOT_REQUIRED.every((f) => snapMapping[f] !== undefined)
      : REQUIRED_FIELDS.every((f) => mapping[f] !== undefined);

  async function onFile(file: File) {
    try {
      const rows = await readSheetRows(file);
      if (!rows.length) {
        setBanner({ tone: 'error', text: t('import.errEmpty') });
        return;
      }
      setRawRows(rows);
      setBanner(null);
      setStep(2);
    } catch {
      setBanner({ tone: 'error', text: t('import.errRead') });
    }
  }

  function downloadTpl() {
    if (mode === 'snapshot') {
      downloadTemplate(SNAPSHOT_FIELDS.map((f) => snapLabel[f]), ['BTC', 'Cripto', 0.1, 55000, 'USD'], 'plantilla-posiciones.xlsx');
    } else {
      // Plantilla de Movimientos con formato (navy + ejemplo + instrucciones) y los
      // MISMOS encabezados de entrada que el export. Es escritura → ExcelJS.
      void exportMovimientosTemplateXlsx(base, t);
    }
  }

  async function doImport() {
    const { transactions, newAssets } = parsed;
    if (!transactions.length) return;
    if (newAssets.length) await db.assets.bulkAdd(newAssets);
    await db.transactions.bulkAdd(transactions);
    setBanner({ tone: 'ok', text: t('import.imported', { count: transactions.length, assets: newAssets.length }) });
    reset();
  }

  function reset() {
    setRawRows([]);
    setMapping({});
    setSnapMapping({});
    setStep(1);
    if (fileRef.current) fileRef.current.value = '';
  }

  const activeFields = mode === 'snapshot' ? SNAPSHOT_FIELDS : IMPORT_FIELDS;
  const activeLabel = (f: string) => (mode === 'snapshot' ? snapLabel[f as SnapshotField] : fieldLabel[f as ImportField]);
  const activeRequired = (mode === 'snapshot' ? SNAPSHOT_REQUIRED : REQUIRED_FIELDS) as string[];
  const activeMapping: Record<string, number | undefined> = mode === 'snapshot' ? snapMapping : mapping;
  function setFieldColumn(field: string, value: string) {
    const idx = value === '' ? undefined : Number(value);
    if (mode === 'snapshot') setSnapMapping((m) => ({ ...m, [field]: idx }));
    else setMapping((m) => ({ ...m, [field]: idx }));
  }

  return (
    <div>
      <PageHeader
        title={t('import.title')}
        capture
        subtitle={t('import.subtitle')}
        actions={
          <Button variant="secondary" onClick={downloadTpl}>
            {t('import.downloadTemplate')}
          </Button>
        }
      />

      {banner ? (
        <div
          className={cn(
            'mb-4 rounded-lg border px-4 py-2 text-sm',
            banner.tone === 'ok'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-loss dark:border-red-500/30 dark:bg-red-500/10',
          )}
        >
          {banner.text}
        </div>
      ) : null}

      {/* Stepper */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={cn(
              'rounded-full px-3 py-1 font-medium',
              step === s
                ? 'bg-brand-navy text-white'
                : step > s
                  ? 'bg-brand-gold/30 text-amber-800 dark:bg-brand-gold/15 dark:text-amber-200'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
            )}
          >
            {s}. {t(`import.step${s}Short`)}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <SectionTitle>{t('import.step1Title')}</SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t('import.step1Desc')}</p>

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('import.modeTitle')}</p>
            <div className="flex flex-wrap gap-2">
              <ModeButton active={mode === 'transactions'} onClick={() => setMode('transactions')} label={t('import.modeTransactions')} />
              <ModeButton active={mode === 'snapshot'} onClick={() => setMode('snapshot')} label={t('import.modeSnapshot')} />
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {mode === 'snapshot' ? t('import.modeSnapshotHint') : t('import.modeTransactionsHint')}
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()}>{t('import.chooseFile')}</Button>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <SectionTitle>{t('import.step2Title')}</SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            {t('import.step2Desc', { rows: rawRows.length })}
          </p>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={(e) => setHasHeaders(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('import.hasHeaders')}</span>
          </label>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <tbody>
                {rawRows.slice(0, 4).map((r, ri) => (
                  <tr key={ri} className={cn(ri === 0 && hasHeaders ? 'bg-slate-50 font-medium dark:bg-slate-700/50' : '')}>
                    {r.map((c, ci) => (
                      <td key={ci} className="border-b border-slate-100 px-2 py-1 dark:border-slate-700">
                        {String(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>{t('common.back')}</Button>
            <Button onClick={() => setStep(3)}>{t('common.next')}</Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <SectionTitle>{t('import.step3Title')}</SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{t('import.step3Desc')}</p>

          {mode === 'snapshot' ? (
            <div className="mb-4 sm:max-w-xs">
              <Field label={t('import.openingDate')} hint={t('import.openingDateHint')}>
                <TextInput type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {activeFields.map((f) => {
              const required = activeRequired.includes(f);
              return (
                <Field
                  key={f}
                  label={`${activeLabel(f)}${required ? ' *' : ''}`}
                >
                  <Select
                    value={activeMapping[f] ?? ''}
                    invalid={required && activeMapping[f] === undefined}
                    onChange={(e) => setFieldColumn(f, e.target.value)}
                  >
                    <option value="">{t('import.columnNone')}</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            })}
          </div>

          {!requiredOk ? (
            <p className="mt-3 text-xs text-loss">{t('import.missingRequired')}</p>
          ) : null}

          <div className="mt-5 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>{t('common.back')}</Button>
            <Button onClick={() => setStep(4)} disabled={!requiredOk}>{t('common.next')}</Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <SectionTitle>{t('import.step4Title')}</SectionTitle>
          <div className="mb-3 flex flex-wrap gap-4">
            <Stat label={t('import.willImport')} value={String(parsed.transactions.length)} tone="ok" />
            <Stat label={t('import.newAssets')} value={String(parsed.newAssets.length)} />
            <Stat label={t('import.withErrors')} value={String(parsed.errors.length)} tone={parsed.errors.length ? 'error' : undefined} />
          </div>

          {parsed.errors.length > 0 ? (
            <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs dark:border-red-500/30 dark:bg-red-500/10">
              {parsed.errors.slice(0, 50).map((e, i) => (
                <p key={i} className="text-loss">
                  {t('import.errorRow', { row: e.row, reason: t(`import.err_${e.code}`, { value: e.value ?? '' }) })}
                </p>
              ))}
              {parsed.errors.length > 50 ? <p className="mt-1 text-slate-400">…</p> : null}
            </div>
          ) : null}

          {parsed.transactions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('import.noValid')}</p>
          ) : null}

          <div className="mt-2 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>{t('common.back')}</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>{t('common.cancel')}</Button>
              <Button onClick={() => void doImport()} disabled={parsed.transactions.length === 0}>
                {t('import.importValid', { count: parsed.transactions.length })}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {assets.length === 0 && step === 1 ? (
        <div className="mt-4">
          <EmptyState title={t('import.emptyHint')} description={t('import.emptyHintDesc')} />
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <button type="button" className="underline" onClick={() => setScreen('movimientos')}>
          {t('import.goMovimientos')}
        </button>
      </p>
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-navy bg-brand-navy text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
      )}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'error' }) {
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', tone === 'ok' ? 'text-gain' : tone === 'error' ? 'text-loss' : 'text-heading')}>
        {value}
      </p>
    </div>
  );
}
