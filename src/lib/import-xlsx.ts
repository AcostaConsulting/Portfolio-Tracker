// B.1/B.2 — Adaptador de SheetJS para importación (impuro: lee archivos y descarga).
// La lógica de validación/transformación vive en import.ts (puro). Aquí solo se
// lee el .xlsx a una matriz de celdas y se genera la plantilla descargable.

import * as XLSX from 'xlsx';

/** Genera y descarga una plantilla .xlsx con encabezados + una fila de ejemplo. */
export function downloadTemplate(
  headers: string[],
  example: Array<string | number>,
  filename: string,
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, filename);
}

/** Lee la primera hoja de un archivo (.xlsx/.csv) a una matriz de celdas (strings). */
export async function readSheetRows(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const name = wb.SheetNames[0];
  const ws = name ? wb.Sheets[name] : undefined;
  if (!ws) return [];
  // raw:false → formatea fechas/números como texto visible; defval:'' rellena huecos.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  return rows.map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : String(c))) : []));
}
