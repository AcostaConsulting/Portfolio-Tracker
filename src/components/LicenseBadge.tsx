// A.6 — Badge de nivel en la barra lateral (junto al logo). Al pulsarlo abre el
// modal de licencias. Colores de marca (navy/gold).

import { useTranslation } from 'react-i18next';
import { useTier } from '../store/data';
import { useUi } from '../store/ui';
import { cn } from './ui';

const TIER_STYLE: Record<string, string> = {
  free: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pro: 'bg-brand-navy text-brand-gold',
  premium: 'bg-brand-gold text-brand-navy',
  lifetime: 'bg-brand-navy text-brand-gold ring-1 ring-brand-gold',
};

export function LicenseBadge() {
  const { t } = useTranslation();
  const tier = useTier();
  const openLicenseModal = useUi((s) => s.openLicenseModal);
  return (
    <button
      type="button"
      onClick={openLicenseModal}
      title={t('license.manage')}
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-transform hover:scale-105',
        TIER_STYLE[tier] ?? TIER_STYLE.free,
      )}
    >
      {t(`tier.${tier}`)}
    </button>
  );
}
