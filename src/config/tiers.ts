// A.0 — Modelo de niveles (la fuente de verdad para el gating por plan).
// Módulo de CONFIGURACIÓN: puede importar tipos, pero NO Dexie ni React.
// No tiene dependencias internas (los tipos de dominio que lo necesiten lo
// importan a él), así que no hay riesgo de import circular.

export type Tier = 'free' | 'pro' | 'premium' | 'lifetime';

export interface TierCapabilities {
  maxAssets: number; //            Free: 15, Pro: 30, Premium/Lifetime: Infinity
  canExport: boolean; //           Excel/PDF (F1/F2). Free: false, resto: true
  canUseAlerts: boolean; //        Bloque D (P1). Pro+
  canReviewCommissions: boolean; // D (P2). Pro+
  canSuggestLiquidity: boolean; //  D (P3). Pro+
  canUseLivePrices: boolean; //    F3. Pro+
  canUseBenchmarks: boolean; //    D (M1). Premium + Lifetime
  canUseGoals: boolean; //         D (M2). Premium + Lifetime
  canUseRebalancing: boolean; //   D (M3). Premium + Lifetime
  canUseCustomLabels: boolean; //  S10. Etiquetas personalizadas. Premium + Lifetime
  prioritySupport: boolean; //     Premium (24h) + Lifetime (VIP)
}

/** Llave de capacidad, para tipar el helper useCapability('canUseBenchmarks'). */
export type Capability = keyof TierCapabilities;

export const TIER_CAPS: Record<Tier, TierCapabilities> = {
  free: {
    maxAssets: 15,
    canExport: false,
    canUseAlerts: false,
    canReviewCommissions: false,
    canSuggestLiquidity: false,
    canUseLivePrices: false,
    canUseBenchmarks: false,
    canUseGoals: false,
    canUseRebalancing: false,
    canUseCustomLabels: false,
    prioritySupport: false,
  },
  pro: {
    maxAssets: 30,
    canExport: true,
    canUseAlerts: true,
    canReviewCommissions: true,
    canSuggestLiquidity: true,
    canUseLivePrices: true,
    canUseBenchmarks: false,
    canUseGoals: false,
    canUseRebalancing: false,
    canUseCustomLabels: false,
    prioritySupport: false,
  },
  premium: {
    maxAssets: Infinity,
    canExport: true,
    canUseAlerts: true,
    canReviewCommissions: true,
    canSuggestLiquidity: true,
    canUseLivePrices: true,
    canUseBenchmarks: true,
    canUseGoals: true,
    canUseRebalancing: true,
    canUseCustomLabels: true,
    prioritySupport: true,
  },
  lifetime: {
    maxAssets: Infinity,
    canExport: true,
    canUseAlerts: true,
    canReviewCommissions: true,
    canSuggestLiquidity: true,
    canUseLivePrices: true,
    canUseBenchmarks: true,
    canUseGoals: true,
    canUseRebalancing: true,
    canUseCustomLabels: true,
    prioritySupport: true,
  },
};

// --- Precios (solo para mostrar en UI) -------------------------------------
// USD con espejo MXN. El tipo de cambio MXN es un valor FIJO y configurable a
// mano; NO se calcula en vivo (nada de red para esto).
export const USD_MXN_DISPLAY = 18;

export type PricePeriod = 'free' | 'once' | 'month';

export interface TierPricing {
  usd: number; //        precio en USD (0 = gratis)
  period: PricePeriod;
}

export const TIER_PRICING: Record<Tier, TierPricing> = {
  free: { usd: 0, period: 'free' },
  pro: { usd: 24.99, period: 'once' }, //        MXN ~$450 — pago único
  premium: { usd: 6.99, period: 'month' }, //    MXN ~$130/mes — suscripción
  lifetime: { usd: 89.99, period: 'once' }, //   MXN ~$1,600 — pago único
};

/** Orden de presentación de los planes (de menor a mayor). */
export const TIER_ORDER: Tier[] = ['free', 'pro', 'premium', 'lifetime'];

/** Enlace de compra (Gumroad). */
export const GUMROAD_URL = 'https://acostafconsulting.gumroad.com/l/portfoliotracker';

/** Espejo MXN aproximado para mostrar junto al precio USD (redondeado a la decena). */
export function mxnMirror(usd: number): number {
  return Math.round((usd * USD_MXN_DISPLAY) / 10) * 10;
}
