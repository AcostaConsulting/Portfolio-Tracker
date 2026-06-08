// S9 — Motor PURO de actualizaciones (sin React, sin Dexie, sin Electron).
// Solo lógica: comparar versiones, decidir si toca buscar (intervalo de 7 días),
// normalizar preferencias y parsear el tag de GitHub. La persistencia (Dexie) y
// la red (electron-updater vía IPC) viven fuera: `store/updates.ts` +
// `store/update-syncer.ts` (renderer) y `electron/main.cjs` (proceso principal).
//
// PRIVACIDAD: este módulo no hace red. La consulta a GitHub la hace el proceso
// main de Electron SOLO si el usuario activó alguna casilla (opt-in, default OFF).

/** Preferencias de actualización (subconjunto de Settings, snake_case). */
export interface UpdatePrefs {
  auto_check_updates: boolean;
  auto_download_updates: boolean;
}

export const DEFAULT_UPDATE_PREFS: UpdatePrefs = {
  auto_check_updates: false,
  auto_download_updates: false,
};

/** Intervalo de búsqueda automática: 7 días. */
export const UPDATE_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Normaliza las preferencias desde un objeto parcial (p. ej. la fila `Settings`
 * de Dexie). Cualquier valor ausente o no booleano cae a `false` (opt-in).
 */
export function normalizeUpdatePrefs(
  s?: { auto_check_updates?: boolean; auto_download_updates?: boolean } | null,
): UpdatePrefs {
  return {
    auto_check_updates: s?.auto_check_updates === true,
    auto_download_updates: s?.auto_download_updates === true,
  };
}

/** Quita la 'v' inicial y los espacios de un tag de GitHub ('v0.8.0' → '0.8.0'). */
export function parseVersionFromTag(tag: string): string {
  return String(tag ?? '')
    .trim()
    .replace(/^v/i, '');
}

/**
 * Compara dos versiones x.y.z. Devuelve 1 si a>b, -1 si a<b, 0 si iguales.
 * Tolera la 'v' inicial y partes faltantes (se tratan como 0).
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersionFromTag(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = parseVersionFromTag(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

/** ¿`remote` es estrictamente más nueva que `current`? */
export function isNewerVersion(remote: string, current: string): boolean {
  return compareVersions(remote, current) > 0;
}

/**
 * ¿Toca buscar actualizaciones automáticamente? Solo si el usuario activó alguna
 * casilla (auto_check o auto_download — descargar también obliga a consultar) Y
 * ya pasó el intervalo desde la última búsqueda. `lastCheckedISO` ausente o
 * inválida = nunca → sí. `now` (ms) se inyecta para mantener la función pura.
 */
export function shouldAutoCheck(
  prefs: UpdatePrefs,
  lastCheckedISO: string | null | undefined,
  now: number,
): boolean {
  if (!prefs.auto_check_updates && !prefs.auto_download_updates) return false;
  if (!lastCheckedISO) return true;
  const last = Date.parse(lastCheckedISO);
  if (Number.isNaN(last)) return true;
  return now - last >= UPDATE_CHECK_INTERVAL_MS;
}
