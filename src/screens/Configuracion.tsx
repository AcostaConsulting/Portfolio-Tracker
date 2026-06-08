import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { db, SETTINGS_ID } from '../db/db';
import { exportAllData, importAllData, isBackupData, resetAll, type BackupData } from '../db/backup';
import { decryptString, encryptString, isEncryptedBlob, type EncryptedBlob } from '../lib/crypto';
import { useSettings, useTier } from '../store/data';
import { useUi } from '../store/ui';
import { runPriceSync } from '../store/price-syncer';
import { usePriceSync } from '../store/prices';
import { applyLanguage, LANGUAGES } from '../i18n';
import { applyTheme } from '../lib/theme';
import { changePin, disableEncryption, enableEncryption, lockNow, useVault } from '../store/vault';
import type { AllocationTargets, Language, PriceUpdateFrequency, Theme } from '../types';
import { PRICE_FREQUENCIES } from '../lib/labels';
import { PageHeader } from '../components/PageHeader';
import { PriceStatus } from '../components/PriceStatus';
import { LabelManager } from '../components/LabelManager';
import { Badge, Button, Card, cn, Field, Modal, SectionTitle, Select, TextInput } from '../components/ui';
import { resetTourSeen } from '../components/TourOnboarding';
import { APP_VERSION } from '../config/version';
import { getUpdaterBridge, useUpdateStore } from '../store/updates';
import { runUpdateCheck } from '../store/update-syncer';

const COMMON_CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'BRL', 'ARS', 'CLP', 'COP'];

type Banner = { tone: 'ok' | 'error'; text: string } | null;

const TARGET_KEYS: Array<{ key: keyof AllocationTargets; labelKey: string }> = [
  { key: 'cripto', labelKey: 'config.tCripto' },
  { key: 'accion', labelKey: 'config.tAccion' },
  { key: 'renta_fija', labelKey: 'config.tRentaFija' },
];

export default function Configuracion() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [base, setBase] = useState('MXN');
  const [targets, setTargets] = useState<AllocationTargets>({
    cripto: 40,
    accion: 30,
    renta_fija: 30,
  });
  const [banner, setBanner] = useState<Banner>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // S5 — respaldo cifrado (opcional)
  const [encExportOpen, setEncExportOpen] = useState(false);
  const [encPw, setEncPw] = useState('');
  const [pendingBlob, setPendingBlob] = useState<EncryptedBlob | null>(null);
  const [importPw, setImportPw] = useState('');
  const [encErr, setEncErr] = useState('');

  useEffect(() => {
    if (settings) {
      setBase(settings.base_currency);
      setTargets(settings.allocation_targets);
    }
  }, [settings]);

  const sum = targets.cripto + targets.accion + targets.renta_fija;
  const sumOk = Math.round(sum * 100) / 100 === 100;
  const baseOk = base.trim().length >= 2;
  const canSave = sumOk && baseOk;

  const currencyOptions = Array.from(new Set([...COMMON_CURRENCIES, base.toUpperCase()].filter(Boolean)));

  function setTarget(key: keyof AllocationTargets, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    setTargets((tg) => ({ ...tg, [key]: Number.isFinite(value) ? value : 0 }));
  }

  async function save() {
    if (!canSave) return;
    // update (no put) para preservar campos como live_prices_enabled / language.
    await db.settings.update(SETTINGS_ID, {
      base_currency: base.trim().toUpperCase(),
      allocation_targets: { ...targets },
    });
    setBanner({ tone: 'ok', text: t('config.saved') });
  }

  function downloadJson(obj: unknown, name: string) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function backupName(suffix = '') {
    return `portafolio-respaldo${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  }

  async function handleExport() {
    downloadJson(await exportAllData(), backupName());
    setBanner({ tone: 'ok', text: t('config.exported') });
  }

  // S5 — Exporta el respaldo cifrado con una contraseña (mismo AES-GCM que el PIN).
  async function handleExportEncrypted() {
    if (encPw.length < 4) {
      setEncErr(t('security.errPinShort'));
      return;
    }
    const { blob } = await encryptString(JSON.stringify(await exportAllData()), encPw);
    downloadJson(blob, backupName('-cifrado'));
    setEncExportOpen(false);
    setEncPw('');
    setEncErr('');
    setBanner({ tone: 'ok', text: t('config.encExported') });
  }

  async function applyImport(data: BackupData) {
    const ok = window.confirm(
      t('config.importConfirm', { assets: data.assets.length, txns: data.transactions.length }),
    );
    if (!ok) return;
    await importAllData(data);
    setBanner({ tone: 'ok', text: t('config.imported') });
  }

  async function handleImportFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (isEncryptedBlob(parsed)) {
        // S5 — respaldo cifrado: pide la contraseña para descifrarlo antes de importar.
        setPendingBlob(parsed);
        setImportPw('');
        setEncErr('');
        return;
      }
      if (!isBackupData(parsed)) {
        setBanner({ tone: 'error', text: t('config.invalidFile') });
        return;
      }
      await applyImport(parsed);
    } catch {
      setBanner({ tone: 'error', text: t('config.readError') });
    }
  }

  async function doImportEncrypted() {
    if (!pendingBlob) return;
    try {
      const { text } = await decryptString(pendingBlob, importPw);
      const data = JSON.parse(text) as unknown;
      if (!isBackupData(data)) {
        setEncErr(t('config.invalidFile'));
        return;
      }
      setPendingBlob(null);
      await applyImport(data);
    } catch {
      setEncErr(t('config.encWrongPw'));
    }
  }

  async function handleReset() {
    if (!window.confirm(t('config.dangerConfirm1'))) {
      return;
    }
    if (!window.confirm(t('config.dangerConfirm2'))) {
      return;
    }
    await resetAll();
    try {
      localStorage.removeItem('pt-onboarded');
    } catch {
      /* localStorage no disponible */
    }
    setBanner({ tone: 'ok', text: t('config.dangerDone') });
  }

  function changeLanguage(lang: Language) {
    applyLanguage(lang); // cambio inmediato, sin recargar
    void db.settings.update(SETTINGS_ID, { language: lang });
  }

  function changeTheme(theme: Theme) {
    applyTheme(theme); // cambio inmediato, sin recargar
    void db.settings.update(SETTINGS_ID, { theme });
  }

  return (
    <div>
      <PageHeader title={t('config.title')} capture subtitle={t('config.subtitle')} />

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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('config.currencyTitle')}</SectionTitle>
          <div className="space-y-4">
            <Field label={t('config.baseCurrency')} hint={t('config.baseCurrencyHint')}>
              <Select value={base.toUpperCase()} onChange={(e) => setBase(e.target.value)}>
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('config.targetsLabel')}</p>
              <div className="grid grid-cols-3 gap-3">
                {TARGET_KEYS.map(({ key, labelKey }) => (
                  <Field key={key} label={t(labelKey)}>
                    <TextInput
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={String(targets[key])}
                      invalid={!sumOk}
                      onChange={(e) => setTarget(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <p className={cn('mt-2 text-sm', sumOk ? 'text-slate-500 dark:text-slate-400' : 'text-loss')}>
                {sumOk ? t('config.sumOk', { sum }) : t('config.sumBad', { sum })}
              </p>
            </div>

            <Button onClick={save} disabled={!canSave}>
              {t('config.save')}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle>{t('config.backupTitle')}</SectionTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('config.backupDesc')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExport}>
              {t('config.export')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEncPw('');
                setEncErr('');
                setEncExportOpen(true);
              }}
            >
              {t('config.exportEncrypted')}
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {t('config.import')}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportFile(file);
                e.target.value = '';
              }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{t('config.importNote')}</p>

          <Modal
            open={encExportOpen}
            title={t('config.exportEncrypted')}
            onClose={() => {
              setEncExportOpen(false);
              setEncErr('');
            }}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEncExportOpen(false);
                    setEncErr('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => void handleExportEncrypted()}>{t('config.export')}</Button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('config.encExportDesc')}</p>
              <Field label={t('config.encPwLabel')} hint={t('security.pinHint')}>
                <TextInput
                  type="password"
                  value={encPw}
                  onChange={(e) => {
                    setEncPw(e.target.value);
                    setEncErr('');
                  }}
                />
              </Field>
              {encErr ? <p className="text-sm text-loss">{encErr}</p> : null}
            </div>
          </Modal>

          <Modal
            open={pendingBlob !== null}
            title={t('config.import')}
            onClose={() => {
              setPendingBlob(null);
              setEncErr('');
            }}
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPendingBlob(null);
                    setEncErr('');
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => void doImportEncrypted()}>{t('config.import')}</Button>
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('config.encImportDesc')}</p>
              <Field label={t('config.encPwLabel')}>
                <TextInput
                  type="password"
                  value={importPw}
                  onChange={(e) => {
                    setImportPw(e.target.value);
                    setEncErr('');
                  }}
                />
              </Field>
              {encErr ? <p className="text-sm text-loss">{encErr}</p> : null}
            </div>
          </Modal>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>{t('config.languageTitle')}</SectionTitle>
          <div className="sm:max-w-xs">
            <Field label={t('config.languageLabel')}>
              <Select
                value={settings?.language ?? 'es'}
                onChange={(e) => changeLanguage(e.target.value as Language)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {t(`language.${l}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <SectionTitle>{t('config.appearanceTitle')}</SectionTitle>
          <div className="sm:max-w-xs">
            <Field label={t('config.appearanceLabel')}>
              <Select
                value={settings?.theme ?? 'system'}
                onChange={(e) => changeTheme(e.target.value as Theme)}
              >
                <option value="light">{t('config.themeLight')}</option>
                <option value="dark">{t('config.themeDark')}</option>
                <option value="system">{t('config.themeSystem')}</option>
              </Select>
            </Field>
          </div>
        </Card>

        <TourCard />

        <UpdatesCard />

        <LabelManager />

        <LicenseCard />

        <PrivacyCard />

        <LivePricesCard />

        <SecurityCard />

        <Card className="lg:col-span-2 border-red-200 dark:border-red-500/30">
          <SectionTitle>{t('config.dangerTitle')}</SectionTitle>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('config.dangerDesc')}</p>
          <div className="mt-4">
            <Button variant="danger" onClick={handleReset}>
              {t('config.dangerButton')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/** F.2 — Sección "Privacidad": qué se guarda (local) y qué NO (nada personal). */
function PrivacyCard() {
  const { t } = useTranslation();
  return (
    <Card className="lg:col-span-2">
      <SectionTitle>{t('config.privacySectionTitle')}</SectionTitle>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('acerca.privacyBody')}</p>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('config.privacyNetwork')}</p>
    </Card>
  );
}

/** T4 — Sección "Recorrido guiado": reinicia la marca y vuelve a abrir el tour. */
function TourCard() {
  const { t } = useTranslation();
  const openTour = useUi((s) => s.openTour);
  function replay() {
    resetTourSeen();
    openTour();
  }
  return (
    <Card className="lg:col-span-2">
      <SectionTitle hint={t('tour.sectionDesc')}>{t('tour.sectionTitle')}</SectionTitle>
      <Button variant="secondary" onClick={replay}>
        ▶ {t('tour.replay')}
      </Button>
    </Card>
  );
}

/** S9 — Sección "Actualizaciones": versión actual, estado, búsqueda manual,
 *  preferencias (2 casillas independientes) e historial de versiones. */
function UpdatesCard() {
  const { t } = useTranslation();
  const settings = useSettings();
  const status = useUpdateStore((s) => s.status);
  const availableVersion = useUpdateStore((s) => s.availableVersion);
  const progressPct = useUpdateStore((s) => s.progressPct);
  const supported = getUpdaterBridge() !== undefined;

  const autoCheck = settings?.auto_check_updates === true;
  const autoDownload = settings?.auto_download_updates === true;
  const lastChecked = settings?.updates_last_checked;

  const historyRaw = t('updates.changelog.items', { returnObjects: true }) as unknown;
  const history = Array.isArray(historyRaw)
    ? (historyRaw as Array<{ version: string; date: string; notes: string[] }>)
    : [];

  async function setAutoCheck(v: boolean) {
    await db.settings.update(SETTINGS_ID, { auto_check_updates: v });
  }
  async function setAutoDownload(v: boolean) {
    await db.settings.update(SETTINGS_ID, { auto_download_updates: v });
  }

  const when = lastChecked ? new Date(lastChecked).toLocaleString() : null;
  const vNew = availableVersion ? `v${availableVersion}` : '';

  let statusNode: ReactNode = null;
  if (!supported) statusNode = <Badge tone="neutral">{t('updates.unsupported')}</Badge>;
  else if (status === 'checking')
    statusNode = <span className="text-sm text-slate-500 dark:text-slate-400">{t('updates.checking')}</span>;
  else if (status === 'downloading')
    statusNode = <Badge tone="gold">{t('updates.downloading', { version: vNew, percent: progressPct })}</Badge>;
  else if (status === 'downloaded')
    statusNode = <Badge tone="gain">{t('updates.downloaded', { version: vNew })}</Badge>;
  else if (status === 'available')
    statusNode = <Badge tone="gain">🔴 {t('updates.available', { version: vNew })}</Badge>;
  else if (status === 'upToDate') statusNode = <Badge tone="gain">✅ {t('updates.upToDate')}</Badge>;
  else if (status === 'error') statusNode = <Badge tone="loss">{t('updates.error')}</Badge>;

  return (
    <Card className="lg:col-span-2">
      <SectionTitle>{t('updates.title')}</SectionTitle>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('updates.currentVersion')}: <span className="font-semibold text-heading">v{APP_VERSION}</span>
          </p>
          {statusNode}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void runUpdateCheck(autoDownload)}
            disabled={!supported || status === 'checking'}
          >
            🔍 {status === 'checking' ? t('updates.checking') : t('updates.checkNow')}
          </Button>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {when ? t('updates.lastChecked', { when }) : t('updates.neverChecked')}
          </span>
        </div>

        {!supported ? (
          <p className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-3 py-2 text-xs text-slate-600 dark:border-brand-navy/40 dark:bg-brand-navy/20 dark:text-slate-300">
            {t('updates.unsupported')}
          </p>
        ) : null}

        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(e) => void setAutoCheck(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-heading focus:ring-brand-navy/30"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('updates.autoCheck.label')}
              </span>
              <span className="block text-xs text-slate-400 dark:text-slate-500">
                {t('updates.autoCheck.description')}
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={(e) => void setAutoDownload(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-heading focus:ring-brand-navy/30"
            />
            <span>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('updates.autoDownload.label')}
              </span>
              <span className="block text-xs text-slate-400 dark:text-slate-500">
                {t('updates.autoDownload.description')}
              </span>
            </span>
          </label>
        </div>

        <div className="border-t border-slate-100 pt-4 dark:border-slate-700">
          <p className="mb-2 text-sm font-semibold text-heading">📋 {t('updates.changelog.title')}</p>
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.version}>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  v{h.version} — {h.date}
                  {h.version === APP_VERSION ? ` (${t('updates.current')})` : ''}
                </p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs text-slate-500 dark:text-slate-400">
                  {h.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/** A.4 — Sección "Licencia": muestra el plan actual y abre el modal de activación. */
function LicenseCard() {
  const { t } = useTranslation();
  const tier = useTier();
  const openLicenseModal = useUi((s) => s.openLicenseModal);
  return (
    <Card className="lg:col-span-2">
      <SectionTitle hint={t('license.sectionHint')}>{t('license.sectionTitle')}</SectionTitle>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('license.currentPlan')}:{' '}
          <span className="font-semibold text-heading">{t(`tier.${tier}`)}</span>
        </p>
        <Button variant="secondary" onClick={openLicenseModal}>
          {t('license.viewPlans')}
        </Button>
      </div>
    </Card>
  );
}

/** F3 — Sección "Precios en tiempo real" (opt-in). */
function LivePricesCard() {
  const { t } = useTranslation();
  const settings = useSettings();
  const setScreen = useUi((s) => s.setScreen);
  const status = usePriceSync((s) => s.status);
  const enabled = settings?.live_prices_enabled === true;
  const frequency: PriceUpdateFrequency = settings?.price_update_frequency ?? 'manual';

  async function setEnabled(value: boolean) {
    await db.settings.update(SETTINGS_ID, { live_prices_enabled: value });
  }
  async function setFrequency(value: PriceUpdateFrequency) {
    await db.settings.update(SETTINGS_ID, { price_update_frequency: value });
  }

  return (
    <Card className="lg:col-span-2">
      <SectionTitle hint={t('config.liveHint')}>{t('config.liveTitle')}</SectionTitle>

      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => void setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-heading focus:ring-brand-navy/30"
        />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('config.liveToggle')}</span>
      </label>

      {enabled ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm dark:border-brand-gold/30 dark:bg-brand-gold/10">
            <p className="text-slate-700 dark:text-slate-200">{t('config.liveGuide')}</p>
            <button
              type="button"
              onClick={() => setScreen('activos')}
              className="mt-1.5 font-semibold text-brand-navy underline dark:text-brand-gold"
            >
              {t('config.liveGuideCta')}
            </button>
          </div>
          <div className="rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300 dark:border-brand-navy/40 dark:bg-brand-navy/20">
            <p className="font-semibold text-heading">{t('config.privacyTitle')}</p>
            <p className="mt-1">{t('config.privacyBody')}</p>
            <p className="mt-2">{t('config.privacySources')}</p>
          </div>

          <div className="sm:max-w-xs">
            <Field label={t('config.frequency')}>
              <Select
                value={frequency}
                onChange={(e) => void setFrequency(e.target.value as PriceUpdateFrequency)}
              >
                {PRICE_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {t(`priceFreq.${f}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void runPriceSync()}
              disabled={status === 'syncing'}
            >
              {status === 'syncing' ? t('config.updating') : t('config.updateNow')}
            </Button>
            <PriceStatus />
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">{t('config.assignNote')}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('config.liveOff')}</p>
      )}
    </Card>
  );
}

/** S1 — Sección "Seguridad": PIN + cifrado opt-in (apagado por defecto). */
function SecurityCard() {
  const { t } = useTranslation();
  const status = useVault((s) => s.status);
  const [mode, setMode] = useState<null | 'enable' | 'change' | 'disable'>(null);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  function close() {
    setMode(null);
    setPin('');
    setPin2('');
    setOldPin('');
    setErr('');
  }

  async function startEnable() {
    // Red de seguridad (decisión del dueño): exporta un respaldo ANTES de cifrar.
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portafolio-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('');
    setMode('enable');
  }

  async function doEnable() {
    if (pin.length < 4) return setErr(t('security.errPinShort'));
    if (pin !== pin2) return setErr(t('security.errPinMismatch'));
    await enableEncryption(pin);
    close();
    setMsg(t('security.enabledOk'));
  }

  async function doChange() {
    if (pin.length < 4) return setErr(t('security.errPinShort'));
    if (pin !== pin2) return setErr(t('security.errPinMismatch'));
    const ok = await changePin(oldPin, pin);
    if (!ok) return setErr(t('security.errWrongPin'));
    close();
    setMsg(t('security.changedOk'));
  }

  async function doDisable() {
    const ok = await disableEncryption(oldPin);
    if (!ok) return setErr(t('security.errWrongPin'));
    close();
    setMsg(t('security.disabledOk'));
  }

  return (
    <Card className="lg:col-span-2">
      <SectionTitle hint={t('security.hint')}>{t('security.title')}</SectionTitle>

      {msg ? <p className="mb-3 text-sm text-gain">{msg}</p> : null}

      {status === 'unencrypted' ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('security.descOff')}</p>
          <div className="mt-3 rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            {t('security.warnBody')}
          </div>
          <Button className="mt-4" onClick={() => void startEnable()}>
            {t('security.enable')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('security.descOn')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMsg('');
                setMode('change');
              }}
            >
              {t('security.changePin')}
            </Button>
            <Button variant="secondary" onClick={() => void lockNow()}>
              {t('security.lockNow')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setMsg('');
                setMode('disable');
              }}
            >
              {t('security.disable')}
            </Button>
          </div>
        </>
      )}

      <Modal
        open={mode === 'enable'}
        title={t('security.enable')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void doEnable()}>{t('security.activate')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            {t('security.backupFirst')}
          </div>
          <Field label={t('security.pinLabel')} hint={t('security.pinHint')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErr('');
              }}
            />
          </Field>
          <Field label={t('security.pinConfirm')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin2}
              onChange={(e) => {
                setPin2(e.target.value);
                setErr('');
              }}
            />
          </Field>
          {err ? <p className="text-sm text-loss">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        open={mode === 'change'}
        title={t('security.changePin')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void doChange()}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('security.pinOld')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => {
                setOldPin(e.target.value);
                setErr('');
              }}
            />
          </Field>
          <Field label={t('security.pinNew')} hint={t('security.pinHint')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErr('');
              }}
            />
          </Field>
          <Field label={t('security.pinConfirm')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={pin2}
              onChange={(e) => {
                setPin2(e.target.value);
                setErr('');
              }}
            />
          </Field>
          {err ? <p className="text-sm text-loss">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        open={mode === 'disable'}
        title={t('security.disable')}
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => void doDisable()}>
              {t('security.disable')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('security.disableBody')}</p>
          <Field label={t('security.pinLabel')}>
            <TextInput
              type="password"
              inputMode="numeric"
              value={oldPin}
              onChange={(e) => {
                setOldPin(e.target.value);
                setErr('');
              }}
            />
          </Field>
          {err ? <p className="text-sm text-loss">{err}</p> : null}
        </div>
      </Modal>
    </Card>
  );
}
