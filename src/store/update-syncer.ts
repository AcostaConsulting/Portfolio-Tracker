// S9 — Orquestación de actualizaciones en el renderer (espejo de price-syncer).
// Lee preferencias de Dexie, decide si toca buscar (motor puro `lib/updater`),
// llama al puente del preload y refleja los eventos en `useUpdateStore`.

import { useEffect } from 'react';
import { db, SETTINGS_ID } from '../db/db';
import { normalizeUpdatePrefs, shouldAutoCheck } from '../lib/updater';
import { useSettings } from './data';
import { getUpdaterBridge, useUpdateStore, type UpdaterEvent } from './updates';

const RECHECK_TICK_MS = 6 * 60 * 60 * 1000; // re-evalúa cada 6 h; el gate real son 7 días

function applyEvent(ev: UpdaterEvent): void {
  const s = useUpdateStore.getState();
  switch (ev.type) {
    case 'checking':
      s.set({ status: 'checking', lastError: null });
      break;
    case 'available':
      s.set({
        status: 'available',
        availableVersion: ev.version ?? null,
        releaseNotes: ev.releaseNotes ?? null,
      });
      break;
    case 'not-available':
      s.set({ status: 'upToDate' });
      break;
    case 'progress':
      s.set({ status: 'downloading', progressPct: ev.percent ?? 0 });
      break;
    case 'downloaded':
      s.set({ status: 'downloaded', availableVersion: ev.version ?? s.availableVersion, progressPct: 100 });
      break;
    case 'error':
      s.set({ status: 'error', lastError: ev.message ?? 'error' });
      break;
  }
}

/**
 * Lanza una búsqueda (manual o automática). Marca la fecha de última búsqueda en
 * Dexie ANTES de consultar, para que el intervalo de 7 días avance aunque la red
 * falle. `autoDownload` decide si main descarga al encontrar una versión nueva.
 */
export async function runUpdateCheck(autoDownload: boolean): Promise<void> {
  const bridge = getUpdaterBridge();
  if (!bridge) {
    useUpdateStore.getState().set({ status: 'unsupported' });
    return;
  }
  try {
    await db.settings.update(SETTINGS_ID, { updates_last_checked: new Date().toISOString() });
  } catch {
    /* sin Dexie: no bloquea la búsqueda */
  }
  useUpdateStore.getState().set({ status: 'checking', lastError: null });
  await bridge.check(autoDownload);
}

/** Descarga manual (tras un evento 'available' con autoDownload apagado). */
export async function runUpdateDownload(): Promise<void> {
  const bridge = getUpdaterBridge();
  if (!bridge) return;
  useUpdateStore.getState().set({ status: 'downloading', progressPct: 0 });
  await bridge.download();
}

/** Instala y reinicia AHORA (decisión explícita del usuario). */
export function runUpdateInstall(): void {
  void getUpdaterBridge()?.install();
}

/**
 * Hook montado una vez (en App). Suscribe los eventos del updater y, si el usuario
 * activó alguna casilla, busca al iniciar (respetando el intervalo de 7 días) y
 * cada cierto tiempo. Sin puente (dev/navegador) marca 'unsupported' y no hace red.
 */
export function useUpdateSyncer(): void {
  const settings = useSettings();
  const autoCheck = settings?.auto_check_updates === true;
  const autoDownload = settings?.auto_download_updates === true;

  // Suscripción a eventos (una sola vez).
  useEffect(() => {
    const bridge = getUpdaterBridge();
    if (!bridge) {
      useUpdateStore.getState().set({ status: 'unsupported' });
      return;
    }
    return bridge.onEvent(applyEvent);
  }, []);

  // Búsqueda automática programada según preferencias.
  useEffect(() => {
    const bridge = getUpdaterBridge();
    if (!bridge) return;
    if (!autoCheck && !autoDownload) return;

    let cancelled = false;
    const maybeCheck = async () => {
      const s = await db.settings.get(SETTINGS_ID);
      const prefs = normalizeUpdatePrefs(s);
      if (cancelled) return;
      if (shouldAutoCheck(prefs, s?.updates_last_checked, Date.now())) {
        void runUpdateCheck(prefs.auto_download_updates);
      }
    };

    void maybeCheck(); // al montar / al cambiar preferencias
    const timer = window.setInterval(() => void maybeCheck(), RECHECK_TICK_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoCheck, autoDownload]);
}
