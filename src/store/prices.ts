// F3 — Estado (en memoria) de la sincronización de precios en vivo.
// Es estado de UI efímero, no datos de portafolio: vive en Zustand, no en Dexie.

import { create } from 'zustand';

export type PriceSyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline';

interface PriceSyncState {
  status: PriceSyncStatus;
  lastUpdated: string | null; // 'HH:MM' de la última actualización exitosa
  lastError: string | null;
  set: (partial: Partial<Pick<PriceSyncState, 'status' | 'lastUpdated' | 'lastError'>>) => void;
}

export const usePriceSync = create<PriceSyncState>((set) => ({
  status: 'idle',
  lastUpdated: null,
  lastError: null,
  set: (partial) => set(partial),
}));
