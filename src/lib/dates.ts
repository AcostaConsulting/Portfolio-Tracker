// Helpers de fechas, sin dependencias externas.
// Se trabaja a mediodía UTC para evitar saltos por zona horaria / horario de verano.

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function toISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Días calendario entre dos fechas ISO (b − a). Negativo si b es anterior a a. */
export function diffDays(aISO: string, bISO: string): number {
  const a = parseISO(aISO).getTime();
  const b = parseISO(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

/** Suma meses respetando fin de mes (ej. 31-ene + 1 mes => 28/29-feb). */
export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDayOfMonth));
  return toISO(d);
}

/** Fecha de hoy en ISO 'YYYY-MM-DD' (hora local del navegador). */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
