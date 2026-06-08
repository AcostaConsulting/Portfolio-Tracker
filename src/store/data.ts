// Hooks reactivos sobre IndexedDB (Dexie). useLiveQuery re-renderiza la UI
// automáticamente cuando cambian los datos, así que las pantallas de solo
// lectura se mantienen al día sin estado manual.

import { useLiveQuery } from 'dexie-react-hooks';
import { db, SETTINGS_ID, LICENSE_ID } from '../db/db';
import { buildRatesToBase } from '../lib/selectors';
import { TIER_CAPS, type Tier, type Capability, type TierCapabilities } from '../config/tiers';

export function useSettings() {
  return useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
}

export function useAssets() {
  return useLiveQuery(() => db.assets.toArray(), [], []);
}

export function useTransactions() {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), [], []);
}

export function useFxRates() {
  return useLiveQuery(() => db.fx_rates.toArray(), [], []);
}

export function useFixedIncomePositions() {
  return useLiveQuery(() => db.fixed_income_positions.toArray(), [], []);
}

export function useSnapshots() {
  return useLiveQuery(() => db.historical_snapshots.orderBy('date').toArray(), [], []);
}

/** D.5 — Metas financieras. */
export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), [], []);
}

/** S10 — Etiquetas personalizadas (tags libres del usuario). */
export function useLabels() {
  return useLiveQuery(() => db.labels.toArray(), [], []);
}

/** Mapa { moneda -> rate_to_base } derivado de la base + tipos de cambio. */
export function useRatesToBase(): Record<string, number> {
  const settings = useSettings();
  const fxRates = useFxRates();
  const base = settings?.base_currency ?? 'MXN';
  return buildRatesToBase(fxRates ?? [], base);
}

// --- A.6 — Licencia / niveles ----------------------------------------------

/** Licencia activa (singleton id=1) o undefined si no hay (= Free). */
export function useLicense() {
  return useLiveQuery(() => db.license.get(LICENSE_ID), []);
}

/** Tier actual, con Free por defecto cuando no hay licencia. */
export function useTier(): Tier {
  const license = useLicense();
  return license?.tier ?? 'free';
}

/** Capacidades completas del tier actual. */
export function useCapabilities(): TierCapabilities {
  return TIER_CAPS[useTier()];
}

/** Lee una capacidad concreta del tier actual, p. ej. useCapability('canUseBenchmarks'). */
export function useCapability<K extends Capability>(cap: K): TierCapabilities[K] {
  return TIER_CAPS[useTier()][cap];
}
