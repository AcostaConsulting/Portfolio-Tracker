// F3 — Orquestación de la sincronización de precios en vivo.
// Lee la configuración y los datos desde Dexie, llama al módulo puro
// `price-fetcher`, y escribe los precios/tasas de vuelta (la MISMA escritura que
// hace el usuario manualmente en Activos). El estado del indicador vive en
// `usePriceSync`.

import { useEffect } from 'react';
import { db, SETTINGS_ID } from '../db/db';
import { todayISO } from '../lib/dates';
import { fetchFxRates, fetchLivePrices } from '../lib/price-fetcher';
import type { PriceUpdateFrequency } from '../types';
import { useSettings } from './data';
import { usePriceSync } from './prices';

const FREQ_MS: Record<PriceUpdateFrequency, number> = {
  manual: 0,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
};

function hhmm(d = new Date()): string {
  return d.toTimeString().slice(0, 5);
}

/**
 * Ejecuta una sincronización completa: precios de activos (CoinGecko/Yahoo) y
 * tipos de cambio (Frankfurter). Actualiza Dexie y el estado del indicador.
 * Es seguro llamarla manualmente ("Actualizar ahora") o desde un intervalo.
 */
export async function runPriceSync(): Promise<void> {
  const sync = usePriceSync.getState();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    sync.set({ status: 'offline' });
    return;
  }

  sync.set({ status: 'syncing', lastError: null });
  try {
    const [settings, assets, fxRates] = await Promise.all([
      db.settings.get(SETTINGS_ID),
      db.assets.toArray(),
      db.fx_rates.toArray(),
    ]);
    const base = settings?.base_currency ?? 'MXN';
    const liveAssets = assets.filter(
      (a) => a.price_source === 'coingecko' || a.price_source === 'yahoo',
    );
    const fxTargets = fxRates
      .map((f) => f.currency)
      .filter((c) => c.toUpperCase() !== base.toUpperCase());

    if (liveAssets.length === 0 && fxTargets.length === 0) {
      // Nada configurado para actualizar en vivo: no es un error.
      sync.set({ status: 'idle' });
      return;
    }

    const [prices, rates] = await Promise.all([
      fetchLivePrices(liveAssets),
      fetchFxRates(fxTargets, base),
    ]);

    if (prices.size === 0 && rates.size === 0) {
      sync.set({
        status: 'error',
        lastError: 'No se obtuvo ningún precio (posible bloqueo CORS o sin conexión).',
      });
      return;
    }

    await db.transaction('rw', [db.assets, db.fx_rates], async () => {
      for (const [assetId, price] of prices) {
        await db.assets.update(assetId, { current_price: price });
      }
      for (const [currency, rate] of rates) {
        await db.fx_rates.update(currency, { rate_to_base: rate, updated_at: todayISO() });
      }
    });

    sync.set({ status: 'ok', lastUpdated: hhmm() });
  } catch (e) {
    console.warn('[price-syncer] Error al sincronizar precios:', e);
    sync.set({ status: 'error', lastError: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Hook que se monta una vez (en App). Si los precios en vivo están activos:
 *  - hace una consulta inicial,
 *  - programa un intervalo según la frecuencia elegida (salvo 'manual').
 * Si están desactivados, NO ejecuta ningún código de red.
 */
export function usePriceSyncer(): void {
  const settings = useSettings();
  const enabled = settings?.live_prices_enabled === true;
  const frequency: PriceUpdateFrequency = settings?.price_update_frequency ?? 'manual';

  useEffect(() => {
    if (!enabled) return;

    void runPriceSync(); // consulta inicial al activar/montar

    const ms = FREQ_MS[frequency];
    if (ms <= 0) return; // 'manual' → sin intervalo automático

    const timer = window.setInterval(() => void runPriceSync(), ms);
    return () => window.clearInterval(timer);
  }, [enabled, frequency]);
}
