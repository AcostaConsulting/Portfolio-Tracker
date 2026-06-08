// F2 — Exportar a PDF mediante el diálogo de impresión nativo del sistema.
//
// Estrategia (ver prompt F2): NADA de jsPDF/html2canvas/puppeteer. Se usa
// `window.print()` junto con una hoja `@media print` (en src/index.css) que
// oculta la interfaz y deja solo el contenido. Aquí únicamente:
//   1. cambiamos el título del documento (el navegador lo sugiere como nombre
//      del archivo en el diálogo "Guardar como PDF");
//   2. marcamos el <body> con la clase `printing` por si algún estilo la necesita;
//   3. imprimimos y restauramos todo al cerrar el diálogo.

/**
 * Abre el diálogo de impresión del sistema con `title` como nombre sugerido.
 * @param title p. ej. "Portafolio — Dashboard — 2026-05-29"
 */
export function printToPdf(title: string): void {
  const previousTitle = document.title;
  document.title = title;
  document.body.classList.add('printing');

  // F5 — Imprime SIEMPRE en claro: quita la clase `dark` (y el color-scheme
  // oscuro) mientras dura el diálogo, para que las utilidades `dark:` de los
  // elementos internos no se cuelen en el PDF. Se restaura al terminar.
  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  const previousColorScheme = root.style.colorScheme;
  if (wasDark) {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.body.classList.remove('printing');
    if (wasDark) {
      root.classList.add('dark');
      root.style.colorScheme = previousColorScheme || 'dark';
    }
    document.title = previousTitle;
    window.removeEventListener('afterprint', restore);
  };

  window.addEventListener('afterprint', restore);
  window.print();
  // Respaldo por si 'afterprint' no se dispara en algún entorno.
  window.setTimeout(restore, 1000);
}
