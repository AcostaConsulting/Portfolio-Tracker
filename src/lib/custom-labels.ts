// S10 — Motor PURO de gating de etiquetas personalizadas (sin React ni Dexie).
// Recibe el tier y el conteo actual por parámetro; la UI inyecta los datos.
//
// Nota de nombre: el archivo se llama `custom-labels` (no `labels`) porque
// `src/lib/labels.ts` ya existe con otro propósito (arreglos de valores de los
// enums del dominio para los <select>). Aquí "etiqueta" = tag libre del usuario.

import type { Tier } from '../config/tiers';

/** Free y Pro: 1 etiqueta gratis incluida. */
export const MAX_LABELS_FREE = 1;

/** Premium y Lifetime: etiquetas ilimitadas. */
export const MAX_LABELS_PREMIUM = Infinity;

/**
 * ¿Puede el plan actual crear una etiqueta más?
 * Premium/Lifetime siempre; Free/Pro solo mientras no superen MAX_LABELS_FREE.
 */
export function canAddLabel(tier: Tier, currentCount: number): boolean {
  if (tier === 'premium' || tier === 'lifetime') return true;
  return currentCount < MAX_LABELS_FREE;
}
