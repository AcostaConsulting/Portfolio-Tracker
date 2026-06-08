// A.6 — Estado "candado" amable y reutilizable para funciones bloqueadas por plan.
// NO esconde la función: muestra qué se gana al subir de nivel y un CTA al modal.
// Lo usan los Bloques C/D/E donde una feature requiere Pro+ o Premium+.

import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { useUi } from '../store/ui';
import type { Capability } from '../config/tiers';

export function UpgradeLock({
  capability,
  requiredTier = 'pro',
}: {
  capability?: Capability;
  requiredTier?: 'pro' | 'premium';
}) {
  const { t } = useTranslation();
  const openLicenseModal = useUi((s) => s.openLicenseModal);
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center dark:border-slate-600 dark:bg-slate-800">
      <div className="text-2xl" aria-hidden="true">
        🔒
      </div>
      <p className="mt-1 font-medium text-heading">{t('paywall.lockedTitle')}</p>
      {capability ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(`capability.${capability}`)}</p>
      ) : null}
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        {t(requiredTier === 'premium' ? 'paywall.needPremium' : 'paywall.needPro')}
      </p>
      <Button className="mt-3" onClick={openLicenseModal}>
        {t('paywall.upgrade')}
      </Button>
    </div>
  );
}
