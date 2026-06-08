// A.5 — Detección de anomalías (mismo código activado en otra máquina) +
// advertencia amistosa. Módulo PURO: no importa React ni Dexie, no toca disco.
// NUNCA bloquea ni borra nada: solo decide si mostrar un banner durante 7 días.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface AnomalyInput {
  storedMachineId: string | null | undefined; // machine_id guardado al activar
  currentMachineId: string; //                  machine_id calculado en ESTE equipo
  activatedAt: string | null | undefined; //     ISO date de activación
  now?: number; //                               para pruebas; default Date.now()
}

/**
 * Decide si mostrar el banner de anomalía. Se muestra SOLO si:
 *  - hay licencia (machine_id guardado presente),
 *  - el machine_id actual ≠ el guardado al activar, y
 *  - la activación fue hace menos de 7 días.
 * Pasados 7 días el banner desaparece solo. Nunca bloquea ni borra datos.
 */
export function shouldWarnAnomaly(input: AnomalyInput): boolean {
  const { storedMachineId, currentMachineId, activatedAt } = input;
  if (!storedMachineId || !activatedAt) return false;
  if (storedMachineId === currentMachineId) return false;
  const activated = Date.parse(activatedAt);
  if (Number.isNaN(activated)) return false;
  const now = input.now ?? Date.now();
  return now - activated >= 0 && now - activated < SEVEN_DAYS_MS;
}
