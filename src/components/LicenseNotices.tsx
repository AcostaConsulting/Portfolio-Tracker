// A.5 / A.4 — Avisos de licencia en la parte superior del contenido:
//  - Banner amistoso de anomalía (código usado en otra máquina, < 7 días). No bloquea.
//  - Banner "estás en Free" con CTA para activar (ocultable durante la sesión).

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLicense, useTier } from '../store/data';
import { useUi } from '../store/ui';
import { shouldWarnAnomaly } from '../lib/license-guard';
import { getLocalMachineId } from '../lib/machine-id';
import { openExternal } from '../lib/external';

const ODOO_CONTACT = 'https://franscisco-acosta.odoo.com/contactus';
const FREE_BANNER_KEY = 'pt-free-banner-dismissed';

export function LicenseNotices() {
  const { t } = useTranslation();
  const tier = useTier();
  const license = useLicense();
  const openLicenseModal = useUi((s) => s.openLicenseModal);
  const [freeDismissed, setFreeDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(FREE_BANNER_KEY) === '1';
    } catch {
      return false;
    }
  });

  const anomaly = license
    ? shouldWarnAnomaly({
        storedMachineId: license.machine_id,
        currentMachineId: getLocalMachineId(),
        activatedAt: license.activated_at,
      })
    : false;

  function dismissFree() {
    setFreeDismissed(true);
    try {
      sessionStorage.setItem(FREE_BANNER_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  const showFree = tier === 'free' && !freeDismissed;
  if (!anomaly && !showFree) return null;

  return (
    <div className="app-no-print mb-4 space-y-2">
      {anomaly && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="font-medium">⚠️ {t('anomaly.title')}</span>
          <span>{t('anomaly.body')}</span>
          <button
            type="button"
            onClick={() => openExternal(ODOO_CONTACT)}
            className="font-medium underline underline-offset-2"
          >
            {t('anomaly.support')} ↗
          </button>
        </div>
      )}
      {showFree && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-gold/50 bg-brand-gold/15 px-4 py-2.5 text-sm dark:border-brand-gold/30 dark:bg-brand-gold/10">
          <span className="text-slate-700 dark:text-slate-200">{t('license.freeBanner')}</span>
          <button
            type="button"
            onClick={openLicenseModal}
            className="font-semibold text-brand-navy underline underline-offset-2 dark:text-brand-gold"
          >
            {t('license.freeBannerCta')}
          </button>
          <button
            type="button"
            onClick={dismissFree}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {t('license.dismiss')}
          </button>
        </div>
      )}
    </div>
  );
}
