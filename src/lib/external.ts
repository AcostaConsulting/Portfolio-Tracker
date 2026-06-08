// Apertura de enlaces EXTERNOS con allowlist de dominios de confianza.
//
// En Electron, el proceso principal intercepta `window.open` (setWindowOpenHandler)
// y abre la URL en el navegador del sistema con `shell.openExternal`, denegando la
// ventana emergente. El hardening S2 bloquea además `will-navigate` fuera de app://,
// así que la app nunca navega a un sitio externo dentro de su propia ventana.
// En el navegador (preview de Vite), abre una pestaña nueva.
//
// Solo se permiten dominios de confianza: el Odoo del asesor, Gumroad (compra) y
// plataformas de video para los tutoriales. Cualquier otro host se ignora.

const ALLOWED_HOSTS = [
  'franscisco-acosta.odoo.com', // asesor: citas + contacto (Bloques E/F)
  'acostafconsulting.gumroad.com', // compra de licencias (Bloque A)
  'gumroad.com',
  'www.loom.com', // tutoriales (Bloque F)
  'loom.com',
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
];

/** ¿La URL es https y a un host permitido? */
export function isAllowedExternal(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Abre una URL externa permitida en el navegador del sistema.
 * Devuelve true si se intentó abrir; false si el dominio no está en la allowlist.
 */
export function openExternal(url: string): boolean {
  if (!isAllowedExternal(url)) return false;
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
