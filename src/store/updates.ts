// S9 — Estado (en memoria) de las actualizaciones. Estado de UI efímero (Zustand),
// NO datos de portafolio. Las preferencias persistentes viven en Dexie (Settings).

import { create } from 'zustand';

export type UpdateStatus =
  | 'idle' //         aún sin consultar
  | 'unsupported' //  no hay puente (navegador / Vite dev sin Electron)
  | 'checking' //     consultando GitHub
  | 'upToDate' //     no hay versión más nueva
  | 'available' //    hay versión nueva (aún no descargada)
  | 'downloading' //  descargando
  | 'downloaded' //   lista para instalar
  | 'error'; //       fallo (red, token, etc.)

export interface UpdateState {
  status: UpdateStatus;
  availableVersion: string | null;
  releaseNotes: string | null;
  progressPct: number;
  lastError: string | null;
  set: (partial: Partial<Omit<UpdateState, 'set'>>) => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  status: 'idle',
  availableVersion: null,
  releaseNotes: null,
  progressPct: 0,
  lastError: null,
  set: (partial) => set(partial),
}));

// --- Puente expuesto por el preload (electron/preload.cjs) ------------------

export type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version?: string; releaseNotes?: string }
  | { type: 'not-available'; version?: string }
  | { type: 'progress'; percent?: number }
  | { type: 'downloaded'; version?: string }
  | { type: 'error'; message?: string };

export interface UpdaterBridge {
  check: (autoDownload: boolean) => Promise<{ status: string; message?: string }>;
  download: () => Promise<{ status: string; message?: string }>;
  install: () => Promise<{ status: string }> | void;
  onEvent: (cb: (ev: UpdaterEvent) => void) => () => void;
}

declare global {
  interface Window {
    updater?: UpdaterBridge;
  }
}

/**
 * El puente solo existe en el Electron empaquetado (con preload). En Vite dev o
 * en el navegador es `undefined` → la función queda deshabilitada con elegancia.
 */
export function getUpdaterBridge(): UpdaterBridge | undefined {
  return typeof window !== 'undefined' ? window.updater : undefined;
}
