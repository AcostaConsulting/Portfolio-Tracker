// T2 — Precio de la asesoría fiscal de pago, con descuento según el plan activo.
//
// Módulo PURO: no importa React ni Dexie. El plan (Tier) se pasa como argumento
// —la UI lo lee con useTier() y lo inyecta— para que el cálculo siga siendo
// testable sin montar React. El precio base está en MXN (el servicio se cobra en
// pesos); el espejo USD reutiliza USD_MXN_DISPLAY de tiers.ts para NO introducir
// un segundo tipo de cambio de display en la app.

import { USD_MXN_DISPLAY, type Tier } from '../config/tiers';

/** Precio base de la sesión de asesoría, en MXN. Ajustable a mano. */
export const CONSULTING_BASE_MXN = 720;

/**
 * Página de PAGO del asesor (Odoo). El usuario paga primero y luego agenda.
 * El host ya está en la allowlist de lib/external.ts. Paco lo actualizará al
 * enlace exacto del producto cuando configure el pago en Odoo.
 */
export const CONSULTING_BOOKING_URL = 'https://franscisco-acosta.odoo.com/shop';

/** Descuento por plan sobre el precio base (0 = sin descuento). */
const CONSULTING_DISCOUNTS: Record<Tier, number> = {
  free: 0,
  pro: 0.1, //       10%
  premium: 0.15, //  15%
  lifetime: 0.15, // 15% (igual que Premium)
};

export interface ConsultingPrice {
  baseMxn: number; //     precio sin descuento (para tacharlo si aplica)
  finalMxn: number; //    precio con el descuento aplicado
  finalUsd: number; //    espejo aproximado en USD (USD_MXN_DISPLAY)
  discountPct: number; // 0, 10 o 15
  hasDiscount: boolean;
}

/** Calcula el precio de la asesoría para un plan dado. */
export function getConsultingPrice(tier: Tier): ConsultingPrice {
  const discount = CONSULTING_DISCOUNTS[tier];
  const finalMxn = Math.round(CONSULTING_BASE_MXN * (1 - discount));
  const finalUsd = Math.round(finalMxn / USD_MXN_DISPLAY);
  return {
    baseMxn: CONSULTING_BASE_MXN,
    finalMxn,
    finalUsd,
    discountPct: Math.round(discount * 100),
    hasDiscount: discount > 0,
  };
}
