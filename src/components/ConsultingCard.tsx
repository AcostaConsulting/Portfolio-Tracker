// T2 — Tarjeta de asesoría fiscal de pago en el Dashboard. Dinámica: lee el plan
// activo (useTier, la fuente de verdad en Dexie) y muestra el precio con el
// descuento que corresponde. El botón abre la página de PAGO del asesor (Odoo)
// vía la allowlist de lib/external. Colores de marca (navy/gold), mobile-first.

import { useTranslation } from 'react-i18next';
import { useTier } from '../store/data';
import { openExternal } from '../lib/external';
import { CONSULTING_BOOKING_URL, getConsultingPrice } from '../lib/consulting';

export function ConsultingCard() {
  const { t } = useTranslation();
  const tier = useTier();
  const price = getConsultingPrice(tier);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-brand-navy text-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{t('consulting.title')}</h2>
          <p className="mt-1 max-w-md text-sm text-white/70">{t('consulting.subtitle')}</p>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {price.hasDiscount ? (
              <span className="text-sm text-white/50 line-through tabular-nums">
                {t('consulting.priceMxn', { mxn: price.baseMxn })}
              </span>
            ) : null}
            <span className="text-2xl font-bold tabular-nums text-brand-gold">
              {t('consulting.priceMxn', { mxn: price.finalMxn })}
            </span>
            <span className="text-sm text-white/60 tabular-nums">
              {t('consulting.usdApprox', { usd: price.finalUsd })}
            </span>
          </div>

          {price.hasDiscount ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-gold px-2 py-0.5 text-xs font-semibold text-brand-navy">
              {t('consulting.discount', { pct: price.discountPct, tier: t(`tier.${tier}`) })} ✓
            </span>
          ) : null}
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => openExternal(CONSULTING_BOOKING_URL)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:bg-brand-gold/85 sm:w-auto"
          >
            {t('consulting.book')} →
          </button>
          <p className="mt-2 max-w-[15rem] text-[11px] leading-snug text-white/50">
            {t('consulting.payNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
