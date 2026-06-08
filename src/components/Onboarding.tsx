// Guía rápida de primera apertura. Explica la filosofía de la app (capturar
// operaciones y precios; el resto se calcula) y ofrece configurar la moneda
// base y los objetivos de asignación. Se marca como vista en localStorage para
// no volver a mostrarla. Cerrar / saltar también la marca como vista.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { db, SETTINGS_ID } from '../db/db';
import { useSettings } from '../store/data';
import type { AllocationTargets } from '../types';
import { Button, cn, Field, Select, TextInput } from './ui';

const ONBOARDED_FLAG = 'pt-onboarded';
const CURRENCIES = ['MXN', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'BRL', 'ARS', 'CLP', 'COP'];

const TARGET_KEYS: Array<{ key: keyof AllocationTargets; labelKey: string }> = [
  { key: 'cripto', labelKey: 'config.tCripto' },
  { key: 'accion', labelKey: 'config.tAccion' },
  { key: 'renta_fija', labelKey: 'config.tRentaFija' },
];

const STEP_TITLE_KEYS = [
  'onboarding.step1Title',
  'onboarding.step2Title',
  'onboarding.step3Title',
  'onboarding.step4Title',
];

export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [base, setBase] = useState('MXN');
  const [targets, setTargets] = useState<AllocationTargets>({ cripto: 40, accion: 30, renta_fija: 30 });

  useEffect(() => {
    if (settings) {
      setBase(settings.base_currency);
      setTargets(settings.allocation_targets);
    }
  }, [settings]);

  const last = STEP_TITLE_KEYS.length - 1;
  const sum = targets.cripto + targets.accion + targets.renta_fija;
  const sumOk = Math.round(sum * 100) / 100 === 100;
  const baseOk = base.trim().length >= 2;
  const canFinish = sumOk && baseOk;

  const currencyOptions = Array.from(new Set([...CURRENCIES, base.toUpperCase()].filter(Boolean)));

  function setTarget(key: keyof AllocationTargets, raw: string) {
    const value = raw === '' ? 0 : Number(raw);
    setTargets((tg) => ({ ...tg, [key]: Number.isFinite(value) ? value : 0 }));
  }

  function dismiss() {
    try {
      localStorage.setItem(ONBOARDED_FLAG, '1');
    } catch {
      /* localStorage no disponible */
    }
    onClose();
  }

  async function finish() {
    if (!canFinish) return;
    // update (no put) para preservar campos como language / live_prices_enabled.
    await db.settings.update(SETTINGS_ID, {
      base_currency: base.trim().toUpperCase(),
      allocation_targets: { ...targets },
    });
    dismiss();
  }

  function renderBody(): ReactNode {
    if (step === 0) {
      return (
        <>
          <p>{t('onboarding.step1p1')}</p>
          <p className="mt-3">{t('onboarding.step1p2')}</p>
          <p className="mt-3 rounded-lg bg-brand-gold/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            {t('onboarding.step1p3')}
          </p>
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <p>{t('onboarding.step2intro')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{t('onboarding.step2li1')}</li>
            <li>{t('onboarding.step2li2')}</li>
            <li>{t('onboarding.step2li3')}</li>
          </ul>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('onboarding.step2note')}</p>
        </>
      );
    }
    return (
      <>
        <p>{t('onboarding.step3p1')}</p>
        <p className="mt-3">{t('onboarding.step3p2')}</p>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 dark:bg-black/60" onClick={dismiss} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-gold">
            {t('onboarding.header', { step: step + 1, total: STEP_TITLE_KEYS.length })}
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label={t('onboarding.closeAria')}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-xl font-bold text-heading">{t(STEP_TITLE_KEYS[step])}</h2>
          <div className="mt-3 text-slate-600 dark:text-slate-300">
            {step === last ? (
              <div className="space-y-4">
                <p className="text-sm">{t('onboarding.step4intro')}</p>
                <Field label={t('onboarding.step4BaseCurrency')}>
                  <Select value={base} onChange={(e) => setBase(e.target.value)}>
                    {currencyOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div>
                  <div className="grid grid-cols-3 gap-3">
                    {TARGET_KEYS.map(({ key, labelKey }) => (
                      <Field key={key} label={t(labelKey)}>
                        <TextInput
                          type="number"
                          inputMode="decimal"
                          value={String(targets[key])}
                          min={0}
                          max={100}
                          invalid={!sumOk}
                          onChange={(e) => setTarget(key, e.target.value)}
                        />
                      </Field>
                    ))}
                  </div>
                  <p className={cn('mt-2 text-xs', sumOk ? 'text-slate-400 dark:text-slate-500' : 'text-loss')}>
                    {sumOk ? t('onboarding.step4SumOk') : t('onboarding.step4SumBad', { sum })}
                  </p>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t('onboarding.step4Footer')}</p>
              </div>
            ) : (
              renderBody()
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
          >
            {t('onboarding.skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                {t('common.back')}
              </Button>
            ) : null}
            {step < last ? (
              <Button onClick={() => setStep((s) => s + 1)}>{t('common.next')}</Button>
            ) : (
              <Button onClick={finish} disabled={!canFinish}>
                {t('common.start')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ¿Debe mostrarse la guía? (no se ha completado / saltado antes). */
export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_FLAG) !== '1';
  } catch {
    return false;
  }
}
