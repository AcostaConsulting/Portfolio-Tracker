// A.5 — Identificador de equipo ANÓNIMO y NO personal.
//
// Es un UUID aleatorio que se persiste en localStorage la primera vez. NO deriva
// de ningún dato personal (ni hostname, ni IP, ni nada identificable): solo sirve
// para notar que un mismo código de licencia se activó en equipos distintos
// (A.5). No se envía a ningún servidor.

const MACHINE_KEY = 'pt-machine';

function randomUuid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* sin Web Crypto: usa el fallback */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Devuelve el id local del equipo, creándolo y persistiéndolo la primera vez. */
export function getLocalMachineId(): string {
  try {
    let id = localStorage.getItem(MACHINE_KEY);
    if (!id) {
      id = randomUuid();
      localStorage.setItem(MACHINE_KEY, id);
    }
    return id;
  } catch {
    // localStorage no disponible (p. ej. SSR/tests): id efímero, no persiste.
    return randomUuid();
  }
}
